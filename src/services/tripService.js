// src/services/tripService.js
import {
  collection,
  addDoc,
  setDoc,
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
  runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase';
import { updateTravelEvent, deleteTravelEvent } from './eventService';

export const createTrip = async (tripData, userId = 'anonymous', coupleId = null) => {
  const tripRef = doc(collection(db, 'trips'));
  const eventRef = doc(collection(db, 'events'));
  const editLogRef = doc(collection(db, 'edit_logs'));

  const eventData = {
    title: tripData.title,
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
    // Firestore query의 orderBy('startDate', 'desc')가 이미 정렬 처리
    const trips = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(trips);
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
      title: tripData.title,
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

// 한 배치 안전 상한(Firestore 배치 한도 500 — 여행 문서 + 캘린더 이벤트 자리 여유)
const DELETE_BATCH_LIMIT = 450;

export const deleteTrip = async (tripId, userId = 'anonymous', coupleId = null) => {
  const tripRef = doc(db, 'trips', tripId);
  const tripSnap = await getDoc(tripRef);
  const calendarEventId = tripSnap.exists() ? tripSnap.data().calendarEventId : null;

  // ⚠ 여행 하위 데이터는 반드시 여행 문서와 같이(또는 먼저) 지울 것 — 예전엔 일정표/이동시간만 지우고
  // trips/{id}/travelDecisions·checklists 서브컬렉션은 남겼는데, 이 둘의 규칙은 exists(trips/{id})로
  // 권한을 확인해서 여행이 지워진 뒤엔 앱에서 영영 읽지도 지우지도 못하는 데이터가 됐음(사용자는 지웠다고
  // 생각한 후보 가격·주소·메모가 남음). 규칙의 exists()는 배치 실행 전 상태를 보므로 같은 배치에 넣어도 통과함.
  const [schedulesSnap, travelTimesSnap, decisionsSnap, checklistsSnap] = await Promise.all([
    getDocs(query(collection(db, 'tripSchedules'), where('tripId', '==', tripId))),
    getDocs(query(collection(db, 'travelTimes'), where('tripId', '==', tripId))),
    getDocs(collection(db, 'trips', tripId, 'travelDecisions')),
    getDocs(collection(db, 'trips', tripId, 'checklists')),
  ]);
  const childRefs = [schedulesSnap, travelTimesSnap, decisionsSnap, checklistsSnap]
    .flatMap((snap) => snap.docs.map((d) => d.ref));

  // 보통은 한 배치(원자적)로 끝남. 하위 데이터가 아주 많을 때만 하위부터 나눠 지운 뒤(여행이 아직 있어야
  // 규칙을 통과하므로 순서 중요) 마지막에 여행 문서를 지움
  let remaining = childRefs;
  while (remaining.length > DELETE_BATCH_LIMIT) {
    const chunkBatch = writeBatch(db);
    remaining.slice(0, DELETE_BATCH_LIMIT).forEach((ref) => chunkBatch.delete(ref));
    await chunkBatch.commit();
    remaining = remaining.slice(DELETE_BATCH_LIMIT);
  }

  const batch = writeBatch(db);
  remaining.forEach((ref) => batch.delete(ref));
  batch.delete(tripRef);

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

const normalizeSchedules = (schedules) => schedules.map((schedule, index) => ({
  ...schedule,
  id: schedule.id || `schedule_${Date.now()}_${index}`,
  completed: schedule.completed || false,
}));

// 특정 날짜(day)의 일정 배열을 mutate(현재 배열) → 새 배열로 갱신.
// ⚠ 화면이 들고 있던 목록 전체로 덮어쓰면 두 사람이 같은 날 일정을 거의 동시에 고칠 때 나중에 저장한
// 쪽이 먼저 저장한 쪽 변경을 통째로 지워버림(2026-10-12 발견/수정) — 문서가 있으면 트랜잭션 안에서
// 서버 최신 배열에 변경을 적용함. (클라이언트 트랜잭션은 쿼리를 못 해서 문서 위치는 먼저 쿼리로 찾음)
export const mutateTripSchedule = async (tripId, day, mutate) => {
  const q = query(
    collection(db, 'tripSchedules'),
    where('tripId', '==', tripId),
    where('day', '==', day)
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    // 결정론적 ID로 생성 — 동시에 두 번 호출돼도(둘 다 empty로 보고 생성 시도) 같은 문서로 수렴해
    // 같은 tripId+day에 중복 문서가 생기는 경쟁 조건을 막음. 기존 자동생성 ID 문서는 위 쿼리로 계속 찾아
    // 트랜잭션으로 갱신되므로 마이그레이션 없이 호환됨. (없는 문서는 규칙상 read가 거부돼 트랜잭션으로
    // 읽을 수 없어서, 그날의 첫 일정 생성만은 트랜잭션 없이 씀 — 첫 생성이 동시에 겹치는 건 드묾)
    await setDoc(doc(db, 'tripSchedules', `${tripId}_${day}`), {
      tripId,
      day,
      schedules: normalizeSchedules(mutate([])),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const scheduleDocRef = snap.docs[0].ref;
  await runTransaction(db, async (transaction) => {
    const scheduleSnap = await transaction.get(scheduleDocRef);
    const current = scheduleSnap.exists() ? (scheduleSnap.data().schedules || []) : [];
    transaction.update(scheduleDocRef, {
      schedules: normalizeSchedules(mutate([...current])),
      updatedAt: serverTimestamp(),
    });
  });
};

// 일정 하나를 다른 날(Day)로 옮김(v1.0.24~) — 예전엔 날짜를 바꿀 방법이 없어 옮기려면 지우고 다시 입력해야 했음.
// 날마다 문서가 따로라(tripSchedules: tripId+day) 두 문서를 한 트랜잭션으로 묶을 수 없음(옮길 날 문서가 아직 없으면
// 규칙상 트랜잭션으로 읽을 수도 없음) → **옮길 날에 먼저 추가하고 그다음 원래 날에서 뺌**: 중간에 실패해도 일정이 사라지지
// 않고 양쪽에 남는 쪽이 나음. 완료 여부·sourceOptionId 등 폼에 없는 값은 원래 날의 서버 최신 항목에서 그대로 가져감.
// 이동시간(travelTimes)은 "같은 날의 일정A→일정B" 짝이라 원래 날에서 이 일정이 끼어 있던 것은 지움(안 지우면 고아 데이터).
export const moveTripSchedule = async (tripId, fromDay, toDay, scheduleData) => {
  if (fromDay === toDay) throw new Error('같은 날로는 옮길 수 없습니다.');
  const { id } = scheduleData;

  // 원래 날의 서버 최신 항목(완료 여부 등) — 없으면(그 사이 상대가 지움) 옮길 게 없음
  const fromSnap = await getDocs(query(
    collection(db, 'tripSchedules'), where('tripId', '==', tripId), where('day', '==', fromDay),
  ));
  const original = fromSnap.empty ? null : (fromSnap.docs[0].data().schedules || []).find(s => s.id === id);
  if (!original) throw new Error('옮길 일정을 찾을 수 없어요. 이미 삭제됐을 수 있어요.');

  const moved = { ...original, ...scheduleData, completed: original.completed };
  await mutateTripSchedule(tripId, toDay, (current) => (
    current.some(s => s.id === id) ? current.map(s => (s.id === id ? moved : s)) : [...current, moved]
  ));
  await mutateTripSchedule(tripId, fromDay, (current) => current.filter(s => s.id !== id));

  const timesSnap = await getDocs(query(
    collection(db, 'travelTimes'), where('tripId', '==', tripId), where('day', '==', fromDay),
  ));
  const stale = timesSnap.docs.filter(d => d.data().fromScheduleId === id || d.data().toScheduleId === id);
  if (stale.length) {
    const batch = writeBatch(db);
    stale.forEach(d => batch.delete(d.ref));
    await batch.commit();
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
  if (snap.empty) return;

  const scheduleDocRef = snap.docs[0].ref;
  await runTransaction(db, async (transaction) => {
    const scheduleSnap = await transaction.get(scheduleDocRef);
    if (!scheduleSnap.exists()) return;
    const updated = scheduleSnap.data().schedules.map(s =>
      s.id === scheduleId ? { ...s, completed: !s.completed } : s
    );
    transaction.update(scheduleDocRef, { schedules: updated, updatedAt: serverTimestamp() });
  });
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

export const subscribeTravelTimes = (tripId, day, callback) => {
  if (!tripId || !day) return () => {};
  const q = query(
    collection(db, 'travelTimes'),
    where('tripId', '==', tripId),
    where('day', '==', day)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};
