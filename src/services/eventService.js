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
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

// recurrenceService.js에서도 재사용 (반복 일정 생성/수정/삭제 시 시리즈 단위 요약 로그 기록용)
export const saveEditLog = async (eventId, changes, action, userId = 'anonymous', coupleId = null) => {
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
  let eventData = {};
  try {
    const eventSnap = await getDoc(doc(db, 'events', eventId));
    if (!eventSnap.exists()) {
      // 이미 삭제된 일정(중복 삭제 요청, 파트너의 동시 삭제 등) — 목적은 이미 달성됐으므로 조용히 종료
      return eventId;
    }
    eventData = eventSnap.data();
  } catch (error) {
    // Firestore 규칙 특성상 문서가 이미 없으면 read 자체가 permission-denied로 거부됨
    // (delete/read 규칙이 resource.data.coupleId를 참조하는데, 문서가 없으면 resource가 null이라
    // 규칙 평가 중 에러 처리되어 "Missing or insufficient permissions"로 내려옴) — 이미 삭제된 경우로 간주
    if (error?.code === 'permission-denied') return eventId;
    throw error;
  }

  try {
    await deleteDoc(doc(db, 'events', eventId));
  } catch (error) {
    // getDoc과 deleteDoc 사이에 다른 기기/중복 클릭으로 이미 삭제된 경우도 동일하게 처리
    if (error?.code === 'permission-denied') return eventId;
    throw error;
  }

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

export const updateTravelEvent = async (tripId, tripData, userId = 'anonymous', coupleId = null) => {
  const q = query(collection(db, 'events'), where('tripId', '==', tripId));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const eventDoc = querySnapshot.docs[0];
    const updatedEventData = {
      title: tripData.title,
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
  try {
    await deleteDoc(doc(db, 'personal_events', eventId));
  } catch (error) {
    // 이미 삭제된 문서를 다시 지우는 경우 permission-denied로 내려옴 (deleteEvent 주석 참고) — 이미 삭제된 것으로 간주
    if (error?.code === 'permission-denied') return eventId;
    throw error;
  }
  return eventId;
};

// overrides: 폼에서 편집된 title/description/start/end를 Firestore 저장 값보다 우선 적용
export const convertEventType = async (eventId, isPersonal, newType, userId = 'anonymous', coupleId = null, overrides = {}) => {
  const batch = writeBatch(db);

  if (isPersonal) {
    // personal_events → events (원자적 변환)
    const personalRef = doc(db, 'personal_events', eventId);
    const personalSnap = await getDoc(personalRef);
    if (!personalSnap.exists()) throw new Error('Personal event not found');

    const personalData = personalSnap.data();
    const newEventRef = doc(collection(db, 'events'));
    const editLogRef = doc(collection(db, 'edit_logs'));
    const newEventData = {
      title: overrides.title ?? personalData.title,
      description: overrides.description ?? personalData.description ?? '',
      start: overrides.start ?? personalData.start,
      end: overrides.end ?? personalData.end,
      eventType: newType,
      coupleId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      updatedBy: userId,
    };

    batch.set(newEventRef, newEventData);
    batch.delete(personalRef);
    batch.set(editLogRef, {
      eventId: newEventRef.id,
      action: 'created',
      changes: newEventData,
      userId,
      coupleId,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
    });
    await batch.commit();
    return { id: newEventRef.id, ...newEventData };
  } else {
    // events → personal_events (원자적 변환)
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) throw new Error('Event not found');

    const eventData = eventSnap.data();
    const newPersonalRef = doc(collection(db, 'personal_events'));
    const editLogRef = doc(collection(db, 'edit_logs'));
    const newPersonalData = {
      title: overrides.title ?? eventData.title,
      description: overrides.description ?? eventData.description ?? '',
      start: overrides.start ?? eventData.start,
      end: overrides.end ?? eventData.end,
      userId,
      coupleId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    batch.set(newPersonalRef, newPersonalData);
    batch.delete(eventRef);
    batch.set(editLogRef, {
      eventId,
      action: 'converted_to_personal',
      changes: { type: 'converted_to_personal' },
      userId,
      coupleId,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
    });
    await batch.commit();
    return { id: newPersonalRef.id, ...newPersonalData };
  }
};
