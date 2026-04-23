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

export const getEditLogs = async (coupleId = null, eventId = null, limitCount = 10, lastDoc = null) => {
  // eventId가 있으면 eventId로만 필터링 (인덱스 있음)
  if (eventId) {
    let q = query(
      collection(db, 'edit_logs'),
      where('eventId', '==', eventId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    if (lastDoc) {
      q = query(
        collection(db, 'edit_logs'),
        where('eventId', '==', eventId),
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

  // eventId 없으면: coupleId로 필터링해서 가져오기
  let q;
  if (coupleId) {
    q = query(
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
  } else {
    q = query(
      collection(db, 'edit_logs'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    if (lastDoc) {
      q = query(
        collection(db, 'edit_logs'),
        orderBy('timestamp', 'desc'),
        startAfter(lastDoc),
        limit(limitCount)
      );
    }
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
    isCouple: true,
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
