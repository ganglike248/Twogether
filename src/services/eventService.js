// src/services/eventService.js
import {
  collection,
  doc,
  getDocs,
  getDoc,
  getDocFromCache,
  query,
  where,
  serverTimestamp,
  orderBy,
  startAfter,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { tripPlaceName } from './regions/regionData';
import { commitBatch, safeAddDoc, safeDeleteDoc, safeSetDoc, safeUpdateDoc } from './offlineWrite';
import { syncBucketPlanFromEvent } from './bucket/bucketPlanSync';

// recurrenceService.js에서도 재사용 (반복 일정 생성/수정/삭제 시 시리즈 단위 요약 로그 기록용)
export const saveEditLog = async (eventId, changes, action, userId = 'anonymous', coupleId = null) => {
  try {
    await safeAddDoc(collection(db, 'edit_logs'), {
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

// 쓰기 직전에 읽는 기존 문서는 캐시를 먼저 봄 — 캘린더가 이 문서들을 실시간 구독 중이라 캐시가
// 항상 최신에 가깝고, getDoc(서버 우선)은 연결이 멈추면 캐시로 폴백하기까지 ~10초를 기다려서
// 그동안 정작 쓰기가 로컬 큐에 들어가지도 못함(Calendar.jsx의 저장 3초 타임아웃이 무의미해짐).
// 캐시에 없을 때만 서버 조회.
const getDocPreferCache = async (ref) => {
  try {
    return await getDocFromCache(ref);
  } catch {
    return getDoc(ref);
  }
};

// 아래 create/update는 이벤트 쓰기와 수정기록 쓰기를 동시에 큐에 넣고 서버 ack를 함께 기다림 —
// 이벤트 쓰기 ack를 기다린 뒤에야 수정기록을 쓰면, 연결이 멈춘 상태에서 앱을 닫았을 때 수정기록만
// 로컬 큐에 못 들어가고 유실됨. 문서 ID는 클라이언트에서 미리 발급(doc(collection))해서 씀.
export const createEvent = async (eventData, userId = 'anonymous', coupleId = null) => {
  const { id: _id, ...dataWithoutId } = eventData; // id는 새 문서에서 다시 정해지므로 뺌
  const newEvent = {
    ...dataWithoutId,
    coupleId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
    updatedBy: userId,
  };
  const docRef = doc(collection(db, 'events'));
  await Promise.all([
    safeSetDoc(docRef, newEvent),
    saveEditLog(docRef.id, newEvent, 'created', userId, coupleId),
  ]);
  return { id: docRef.id, ...newEvent };
};

export const updateEvent = async (eventId, eventData, userId = 'anonymous', coupleId = null) => {
  const eventRef = doc(db, 'events', eventId);
  const oldEventSnap = await getDocPreferCache(eventRef);
  const oldData = oldEventSnap.exists() ? oldEventSnap.data() : {};

  // id·isPersonal은 화면용 값이라 문서에 넣지 않음. 값이 없는 칸(undefined)도 뺌
  const { id: _id, isPersonal: _isPersonal, ...rest } = eventData;
  const fields = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
  const updatedData = {
    ...fields,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  };

  // 예전 값이 없으면 null로 — undefined가 섞이면 수정기록 저장이 통째로 실패함
  const changes = {};
  Object.keys(fields).forEach(key => {
    if ((oldData[key] ?? null) !== (fields[key] ?? null)) {
      changes[key] = { from: oldData[key] ?? null, to: fields[key] };
    }
  });
  await Promise.all([
    safeUpdateDoc(eventRef, updatedData),
    saveEditLog(eventId, changes, 'updated', userId, coupleId),
  ]);
  // '하고 싶은 것'에서 계획한 일정이면 날짜가 바뀔 때 버킷의 계획 날짜도 맞춤
  if (oldData.bucketId && eventData.start && eventData.start !== oldData.start) {
    syncBucketPlanFromEvent(eventId, oldData.bucketId, eventData.start);
  }
  return { id: eventId, ...updatedData };
};

export const deleteEvent = async (eventId, userId = 'anonymous', coupleId = null) => {
  let eventData = {};
  try {
    const eventSnap = await getDocPreferCache(doc(db, 'events', eventId));
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
    await safeDeleteDoc(doc(db, 'events', eventId));
  } catch (error) {
    // getDoc과 deleteDoc 사이에 다른 기기/중복 클릭으로 이미 삭제된 경우도 동일하게 처리
    if (error?.code === 'permission-denied') return eventId;
    throw error;
  }

  // '하고 싶은 것'에서 계획한 일정이면 버킷의 계획도 풀어 줌(목록엔 그대로)
  if (eventData.bucketId) syncBucketPlanFromEvent(eventId, eventData.bucketId, null);
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

// 규칙이 coupleId를 보므로 목록 조회엔 coupleId 조건이 꼭 있어야 함(없으면 권한 오류로 통째로 거부)
const travelEventQuery = (tripId, coupleId) =>
  query(collection(db, 'events'), where('tripId', '==', tripId), where('coupleId', '==', coupleId));

export const updateTravelEvent = async (tripId, tripData, userId = 'anonymous', coupleId = null) => {
  if (!coupleId) return;
  const q = travelEventQuery(tripId, coupleId);
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const eventDoc = querySnapshot.docs[0];
    const updatedEventData = {
      title: tripData.title,
      description: `여행지: ${tripPlaceName(tripData)}\n${tripData.description || ''}`,
      start: tripData.startDate,
      end: tripData.endDate,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    };
    await safeUpdateDoc(eventDoc.ref, updatedEventData);
    await saveEditLog(eventDoc.id, updatedEventData, 'updated', userId, coupleId);
  }
};

export const deleteTravelEvent = async (tripId, userId = 'anonymous', coupleId = null) => {
  if (!coupleId) return;
  const q = travelEventQuery(tripId, coupleId);
  const querySnapshot = await getDocs(q);
  await Promise.all(querySnapshot.docs.map(async (eventDoc) => {
    await saveEditLog(eventDoc.id, {}, 'deleted', userId, coupleId);
    await safeDeleteDoc(eventDoc.ref);
  }));
};

// ═════════════════════════════════════════════════════════════════
// 개인 일정 (personal_events 컬렉션)
// ═════════════════════════════════════════════════════════════════

export const createPersonalEvent = async (eventData, userId, coupleId = null) => {
  const { id: _id, isPersonal: _isPersonal, ...dataWithoutId } = eventData;
  const newEvent = {
    ...dataWithoutId,
    userId,
    coupleId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await safeAddDoc(collection(db, 'personal_events'), newEvent);
  return { id: docRef.id, ...newEvent };
};

export const updatePersonalEvent = async (eventId, eventData, userId, _coupleId = null) => { // coupleId는 바뀌지 않아 안 씀(호출부 호환용)
  const eventRef = doc(db, 'personal_events', eventId);
  const { isPersonal: _isPersonal, ...dataWithoutIsPersonal } = eventData;
  const updatedData = {
    ...dataWithoutIsPersonal,
    updatedAt: serverTimestamp(),
  };
  await safeUpdateDoc(eventRef, updatedData);
  return { id: eventId, ...updatedData };
};

export const deletePersonalEvent = async (eventId) => {
  try {
    await safeDeleteDoc(doc(db, 'personal_events', eventId));
  } catch (error) {
    // 이미 삭제된 문서를 다시 지우는 경우 permission-denied로 내려옴 (deleteEvent 주석 참고) — 이미 삭제된 것으로 간주
    if (error?.code === 'permission-denied') return eventId;
    throw error;
  }
  return eventId;
};

// overrides: 폼에서 편집된 title/description/start/end/isDday를 Firestore 저장 값보다 우선 적용
export const convertEventType = async (eventId, isPersonal, newType, userId = 'anonymous', coupleId = null, overrides = {}) => {
  const batch = writeBatch(db);

  if (isPersonal) {
    // personal_events → events (원자적 변환)
    const personalRef = doc(db, 'personal_events', eventId);
    const personalSnap = await getDocPreferCache(personalRef);
    if (!personalSnap.exists()) throw new Error('Personal event not found');

    const personalData = personalSnap.data();
    const newEventRef = doc(collection(db, 'events'));
    const editLogRef = doc(collection(db, 'edit_logs'));
    const newEventData = {
      title: overrides.title ?? personalData.title,
      description: overrides.description ?? personalData.description ?? '',
      start: overrides.start ?? personalData.start,
      end: overrides.end ?? personalData.end,
      isDday: overrides.isDday ?? personalData.isDday ?? false,
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
    await commitBatch(batch);
    return { id: newEventRef.id, ...newEventData };
  } else {
    // events → personal_events (원자적 변환)
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDocPreferCache(eventRef);
    if (!eventSnap.exists()) throw new Error('Event not found');

    const eventData = eventSnap.data();
    const newPersonalRef = doc(collection(db, 'personal_events'));
    const editLogRef = doc(collection(db, 'edit_logs'));
    const newPersonalData = {
      title: overrides.title ?? eventData.title,
      description: overrides.description ?? eventData.description ?? '',
      start: overrides.start ?? eventData.start,
      end: overrides.end ?? eventData.end,
      isDday: overrides.isDday ?? eventData.isDday ?? false,
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
    await commitBatch(batch);
    // 개인 일정으로 바꾸면 커플 일정이 없어지므로 '하고 싶은 것'의 계획도 풀어 줌
    if (eventData.bucketId) syncBucketPlanFromEvent(eventId, eventData.bucketId, null);
    return { id: newPersonalRef.id, ...newPersonalData };
  }
};
