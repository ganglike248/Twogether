// src/services/eventService.js
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
  startAfter,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';

const saveEditLog = async (eventId, changes, action, userId = 'anonymous', coupleId = null) => {
  try {
    await addDoc(collection(db, 'edit_logs'), {
      eventId,
      action,
      changes,
      userId,
      coupleId,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
    });
  } catch (error) {
    console.error('Error saving edit log:', error);
  }
};

export const createEvent = async (eventData, userId = 'anonymous', coupleId = null) => {
  const { id, ...dataWithoutId } = eventData;
  const newEvent = {
    ...dataWithoutId,
    coupleId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
    updatedBy: userId,
  };
  const docRef = await addDoc(collection(db, 'events'), newEvent);
  await saveEditLog(docRef.id, newEvent, 'created', userId, coupleId);
  return { id: docRef.id, ...newEvent };
};

export const updateEvent = async (eventId, eventData, userId = 'anonymous', coupleId = null) => {
  const eventRef = doc(db, 'events', eventId);
  const oldEventSnap = await getDoc(eventRef);
  const oldData = oldEventSnap.exists() ? oldEventSnap.data() : {};

  const updatedData = {
    ...eventData,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  };
  await updateDoc(eventRef, updatedData);

  const changes = {};
  Object.keys(eventData).forEach(key => {
    if (oldData[key] !== eventData[key]) {
      changes[key] = { from: oldData[key], to: eventData[key] };
    }
  });
  await saveEditLog(eventId, changes, 'updated', userId, coupleId);
  return { id: eventId, ...updatedData };
};

export const deleteEvent = async (eventId, userId = 'anonymous', coupleId = null) => {
  const eventSnap = await getDoc(doc(db, 'events', eventId));
  const eventData = eventSnap.exists() ? eventSnap.data() : {};
  await deleteDoc(doc(db, 'events', eventId));
  await saveEditLog(eventId, eventData, 'deleted', userId, coupleId);
  return eventId;
};

export const getEditLogs = async (coupleId, eventId = null, limitCount = 10, lastDoc = null) => {
  if (!coupleId) {
    return { logs: [], lastDoc: null, hasMore: false };
  }
  // eventId가 있으면 eventId + coupleId로 필터링 (보안: coupleId 검증)
  if (eventId) {
    let q = query(
      collection(db, 'edit_logs'),
      where('eventId', '==', eventId),
      where('coupleId', '==', coupleId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    if (lastDoc) {
      q = query(
        collection(db, 'edit_logs'),
        where('eventId', '==', eventId),
        where('coupleId', '==', coupleId),
        orderBy('timestamp', 'desc'),
        startAfter(lastDoc),
        limit(limitCount)
      );
    }

    const querySnapshot = await getDocs(q);
    const logs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return {
      logs,
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
      hasMore: logs.length === limitCount,
    };
  }

  // eventId 없으면: coupleId로 필터링해서 가져오기 (coupleId는 이미 필수 검증됨)
  let q = query(
    collection(db, 'edit_logs'),
    where('coupleId', '==', coupleId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  if (lastDoc) {
    q = query(
      collection(db, 'edit_logs'),
      where('coupleId', '==', coupleId),
      orderBy('timestamp', 'desc'),
      startAfter(lastDoc),
      limit(limitCount)
    );
  }

  const querySnapshot = await getDocs(q);
  const logs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  return {
    logs,
    lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
    hasMore: logs.length === limitCount,
  };
};

export const getEventById = async (eventId) => {
  const docSnap = await getDoc(doc(db, 'events', eventId));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const createTravelEvent = async (tripData, userId = 'anonymous', coupleId = null) => {
  const eventData = {
    title: `🌏 ${tripData.title}`,
    description: `여행지: ${tripData.destination}\n${tripData.description || ''}`,
    start: tripData.startDate,
    end: tripData.endDate,
    eventType: 'travel',
    tripId: tripData.id || tripData.tripId,
    coupleId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
    updatedBy: userId,
  };
  const docRef = await addDoc(collection(db, 'events'), eventData);
  await saveEditLog(docRef.id, eventData, 'created', userId, coupleId);
  return { id: docRef.id, ...eventData };
};

export const updateTravelEvent = async (tripId, tripData, userId = 'anonymous', coupleId = null) => {
  const q = query(collection(db, 'events'), where('tripId', '==', tripId));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const eventDoc = querySnapshot.docs[0];
    const updatedEventData = {
      title: `🌏 ${tripData.title}`,
      description: `여행지: ${tripData.destination}\n${tripData.description || ''}`,
      start: tripData.startDate,
      end: tripData.endDate,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    };
    await updateDoc(eventDoc.ref, updatedEventData);
    await saveEditLog(eventDoc.id, updatedEventData, 'updated', userId, coupleId);
  }
};

export const deleteTravelEvent = async (tripId, userId = 'anonymous', coupleId = null) => {
  const q = query(collection(db, 'events'), where('tripId', '==', tripId));
  const querySnapshot = await getDocs(q);
  await Promise.all(querySnapshot.docs.map(async (eventDoc) => {
    await saveEditLog(eventDoc.id, {}, 'deleted', userId, coupleId);
    await deleteDoc(eventDoc.ref);
  }));
};

// ═════════════════════════════════════════════════════════════════
// 개인 일정 (personal_events 컬렉션)
// ═════════════════════════════════════════════════════════════════

export const createPersonalEvent = async (eventData, userId, coupleId = null) => {
  const { id, isPersonal, ...dataWithoutId } = eventData;
  const newEvent = {
    ...dataWithoutId,
    userId,
    coupleId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'personal_events'), newEvent);
  return { id: docRef.id, ...newEvent };
};

export const updatePersonalEvent = async (eventId, eventData, userId, coupleId = null) => {
  const eventRef = doc(db, 'personal_events', eventId);
  const { isPersonal, ...dataWithoutIsPersonal } = eventData;
  const updatedData = {
    ...dataWithoutIsPersonal,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(eventRef, updatedData);
  return { id: eventId, ...updatedData };
};

export const deletePersonalEvent = async (eventId) => {
  await deleteDoc(doc(db, 'personal_events', eventId));
  return eventId;
};

export const sharePersonalToCoupleEvent = async (personalEventId, personalEventData, eventType = 'couple', userId = 'anonymous', coupleId = null) => {
  const coupleEventData = {
    title: personalEventData.title,
    description: personalEventData.description,
    start: personalEventData.start,
    end: personalEventData.end,
    eventType,
    coupleId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
    updatedBy: userId,
  };

  const docRef = await addDoc(collection(db, 'events'), coupleEventData);
  await saveEditLog(docRef.id, coupleEventData, 'created', userId, coupleId);

  // personal_events의 sharedToCoupleEventId 업데이트
  await updateDoc(doc(db, 'personal_events', personalEventId), {
    sharedToCoupleEventId: docRef.id,
    updatedAt: serverTimestamp(),
  });

  return { id: docRef.id, ...coupleEventData };
};

export const convertEventType = async (eventId, isPersonal, newType, userId = 'anonymous', coupleId = null) => {
  if (isPersonal) {
    // personal_events → events로 변환
    const personalRef = doc(db, 'personal_events', eventId);
    const personalSnap = await getDoc(personalRef);

    if (!personalSnap.exists()) throw new Error('Personal event not found');

    const personalData = personalSnap.data();
    const newEventData = {
      title: personalData.title,
      description: personalData.description,
      start: personalData.start,
      end: personalData.end,
      eventType: newType,
      coupleId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      updatedBy: userId,
    };

    const coupleDocRef = await addDoc(collection(db, 'events'), newEventData);
    await saveEditLog(coupleDocRef.id, newEventData, 'created', userId, coupleId);
    await deleteDoc(personalRef);

    return { id: coupleDocRef.id, ...newEventData };
  } else {
    // events → personal_events로 변환
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) throw new Error('Event not found');

    const eventData = eventSnap.data();
    const newPersonalData = {
      title: eventData.title,
      description: eventData.description,
      start: eventData.start,
      end: eventData.end,
      userId,
      coupleId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const personalDocRef = await addDoc(collection(db, 'personal_events'), newPersonalData);
    await saveEditLog(eventId, { type: 'converted_to_personal' }, 'converted_to_personal', userId, coupleId);
    await deleteDoc(eventRef);

    return { id: personalDocRef.id, ...newPersonalData };
  }
};
