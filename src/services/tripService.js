// src/services/tripService.js
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { updateTravelEvent, deleteTravelEvent } from './eventService';

export const createTrip = async (tripData, userId = 'anonymous', coupleId = null) => {
  const tripRef = doc(collection(db, 'trips'));
  const eventRef = doc(collection(db, 'events'));
  const editLogRef = doc(collection(db, 'edit_logs'));

  const eventData = {
    title: `🌏 ${tripData.title}`,
    description: `여행지: ${tripData.destination}\n${tripData.description || ''}`,
    start: tripData.startDate,
    end: tripData.endDate,
    eventType: 'travel',
    tripId: tripRef.id,
    coupleId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
    updatedBy: userId,
  };
  const newTrip = {
    ...tripData,
    coupleId,
    calendarEventId: eventRef.id,
    status: 'planning',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
  };

  const batch = writeBatch(db);
  batch.set(tripRef, newTrip);
  batch.set(eventRef, eventData);
  batch.set(editLogRef, {
    eventId: eventRef.id,
    action: 'created',
    changes: eventData,
    userId,
    coupleId,
    timestamp: serverTimestamp(),
    userAgent: navigator.userAgent,
  });
  await batch.commit();

  return { id: tripRef.id, ...newTrip };
};

export const subscribeToTrips = (coupleId, callback) => {
  const q = query(
    collection(db, 'trips'),
    where('coupleId', '==', coupleId),
    orderBy('startDate', 'desc')
  );
  return onSnapshot(q, (querySnapshot) => {
    const trips = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const sorted = trips.sort((a, b) => {
      const aDate = a.startDate?.toDate ? a.startDate.toDate() : new Date(a.startDate);
      const bDate = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate);
      return bDate - aDate;
    });
    callback(sorted);
  });
};

export const updateTrip = async (tripId, tripData, userId = 'anonymous', coupleId = null) => {
  const tripRef = doc(db, 'trips', tripId);
  const tripSnap = await getDoc(tripRef);

  const batch = writeBatch(db);
  batch.update(tripRef, { ...tripData, updatedAt: serverTimestamp() });

  if (tripSnap.exists() && tripSnap.data().calendarEventId) {
    // 신규 여행: calendarEventId로 직접 참조
    const eventRef = doc(db, 'events', tripSnap.data().calendarEventId);
    const editLogRef = doc(collection(db, 'edit_logs'));
    const updatedEventData = {
      title: `🌏 ${tripData.title}`,
      description: `여행지: ${tripData.destination}\n${tripData.description || ''}`,
      start: tripData.startDate,
      end: tripData.endDate,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    };
    batch.update(eventRef, updatedEventData);
    batch.set(editLogRef, {
      eventId: tripSnap.data().calendarEventId,
      action: 'updated',
      changes: updatedEventData,
      userId,
      coupleId,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
    });
    await batch.commit();
  } else {
    // 레거시 여행: tripId로 쿼리해서 이벤트 업데이트
    await batch.commit();
    try {
      await updateTravelEvent(tripId, tripData, userId, coupleId);
    } catch (error) {
      console.error('여행 이벤트 업데이트 실패:', error);
    }
  }
};

export const deleteTrip = async (tripId, userId = 'anonymous', coupleId = null) => {
  const tripRef = doc(db, 'trips', tripId);
  const tripSnap = await getDoc(tripRef);
  const calendarEventId = tripSnap.exists() ? tripSnap.data().calendarEventId : null;

  const [schedulesSnap, travelTimesSnap] = await Promise.all([
    getDocs(query(collection(db, 'tripSchedules'), where('tripId', '==', tripId))),
    getDocs(query(collection(db, 'travelTimes'), where('tripId', '==', tripId))),
  ]);

  const batch = writeBatch(db);
  batch.delete(tripRef);
  schedulesSnap.docs.forEach(d => batch.delete(d.ref));
  travelTimesSnap.docs.forEach(d => batch.delete(d.ref));

  if (calendarEventId) {
    // 신규 여행: calendarEventId로 직접 삭제
    batch.delete(doc(db, 'events', calendarEventId));
  }
  await batch.commit();

  if (!calendarEventId) {
    // 레거시 여행: tripId로 쿼리해서 이벤트 삭제
    try {
      await deleteTravelEvent(tripId, userId, coupleId);
    } catch (error) {
      console.error('여행 이벤트 삭제 실패:', error);
    }
  }
};

export const saveTripSchedule = async (tripId, day, schedules) => {
  const scheduleData = {
    tripId,
    day,
    schedules: schedules.map((schedule, index) => ({
      ...schedule,
      id: schedule.id || `schedule_${Date.now()}_${index}`,
      completed: schedule.completed || false,
    })),
    updatedAt: serverTimestamp(),
  };
  const q = query(
    collection(db, 'tripSchedules'),
    where('tripId', '==', tripId),
    where('day', '==', day)
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'tripSchedules'), scheduleData);
  } else {
    await updateDoc(snap.docs[0].ref, scheduleData);
  }
};

export const subscribeToTripSchedules = (tripId, callback) => {
  const q = query(collection(db, 'tripSchedules'), where('tripId', '==', tripId));
  return onSnapshot(q, (querySnapshot) => {
    const schedules = querySnapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => a.day - b.day);
    callback(schedules);
  });
};

export const toggleScheduleCompletion = async (tripId, day, scheduleId) => {
  const q = query(
    collection(db, 'tripSchedules'),
    where('tripId', '==', tripId),
    where('day', '==', day)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const scheduleDoc = snap.docs[0];
    const updated = scheduleDoc.data().schedules.map(s =>
      s.id === scheduleId ? { ...s, completed: !s.completed } : s
    );
    await updateDoc(scheduleDoc.ref, { schedules: updated, updatedAt: serverTimestamp() });
  }
};

export const saveTravelTime = async (tripId, day, fromScheduleId, toScheduleId, travelTime) => {
  const q = query(
    collection(db, 'travelTimes'),
    where('tripId', '==', tripId),
    where('day', '==', day),
    where('fromScheduleId', '==', fromScheduleId),
    where('toScheduleId', '==', toScheduleId)
  );
  const snap = await getDocs(q);
  const data = { tripId, day, fromScheduleId, toScheduleId, travelTime, updatedAt: serverTimestamp() };
  if (travelTime.trim() === '') {
    if (!snap.empty) await deleteDoc(snap.docs[0].ref);
  } else {
    if (snap.empty) await addDoc(collection(db, 'travelTimes'), data);
    else await updateDoc(snap.docs[0].ref, data);
  }
};

export const getTravelTimes = async (tripId, day) => {
  const q = query(
    collection(db, 'travelTimes'),
    where('tripId', '==', tripId),
    where('day', '==', day)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
