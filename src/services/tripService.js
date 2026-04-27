// src/services/tripService.js
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { createTravelEvent, updateTravelEvent, deleteTravelEvent } from './eventService';

export const createTrip = async (tripData, userId = 'anonymous', coupleId = null) => {
  const newTrip = {
    ...tripData,
    coupleId,
    status: 'planning',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
  };
  const docRef = await addDoc(collection(db, 'trips'), newTrip);
  const tripWithId = { id: docRef.id, ...newTrip };

  // 여행 이벤트 자동 생성
  try {
    await createTravelEvent(tripData, userId, coupleId);
  } catch (error) {
    console.error('여행 이벤트 생성 실패:', error);
  }

  return tripWithId;
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
  await updateDoc(doc(db, 'trips', tripId), {
    ...tripData,
    updatedAt: serverTimestamp(),
  });

  // 여행 이벤트 자동 업데이트
  try {
    await updateTravelEvent(tripId, tripData, userId, coupleId);
  } catch (error) {
    console.error('여행 이벤트 업데이트 실패:', error);
  }
};

export const deleteTrip = async (tripId, userId = 'anonymous', coupleId = null) => {
  const schedulesSnap = await getDocs(
    query(collection(db, 'tripSchedules'), where('tripId', '==', tripId))
  );
  const travelTimesSnap = await getDocs(
    query(collection(db, 'travelTimes'), where('tripId', '==', tripId))
  );
  await Promise.all([
    ...schedulesSnap.docs.map(d => deleteDoc(d.ref)),
    ...travelTimesSnap.docs.map(d => deleteDoc(d.ref)),
    deleteDoc(doc(db, 'trips', tripId)),
  ]);

  // 여행 이벤트 자동 삭제
  try {
    await deleteTravelEvent(tripId, userId, coupleId);
  } catch (error) {
    console.error('여행 이벤트 삭제 실패:', error);
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
