// src/services/bucket/bucketService.js
// '하고 싶은 것' 쓰기 — 전부 offlineWrite(오프라인이면 기다리지 않고 대기열). 계산은 bucketLogic.js.
import { collection, doc, arrayUnion, increment, deleteField } from 'firebase/firestore';
import { db } from '../../firebase';
import { safeAddDoc, safeUpdateDoc, safeDeleteDoc } from '../offlineWrite';
import { createEvent, deleteEvent } from '../eventService';
import {
  isRepeat, doneFields, removeHistoryFields, uncompleteFields, changeCompletedDateFields, kindChangeFields,
} from './bucketLogic';

const ref = (id) => doc(db, 'bucketlists', id);

export const addBucket = ({ title, kind = 'once', category = null, content = '' }, uid, coupleId) => safeAddDoc(collection(db, 'bucketlists'), {
  title: title.trim(),
  content,
  category: category || null,
  kind: kind === 'repeat' ? 'repeat' : 'once',
  coupleId,
  createdBy: uid || null,
  completed: false,
  completedAt: null,
  createdAt: new Date().toISOString(),
});

export const editBucket = (id, { title, content, category }) => safeUpdateDoc(ref(id), {
  title: title.trim(), content: content || '', category: category || null,
});

export const changeBucketKind = (bucket, nextKind) => {
  const fields = kindChangeFields(bucket, nextKind);
  return Object.keys(fields).length ? safeUpdateDoc(ref(bucket.id), fields) : Promise.resolve();
};

export const deleteBucket = (id) => safeDeleteDoc(ref(id));

/** 공감 ♥ — 내 키만 씀(동시에 눌러도 서로 안 덮음) */
export const setBucketLike = (id, uid, on) => safeUpdateDoc(ref(id), { [`likes.${uid}`]: on ? true : deleteField() });

/** [했어요] — 기록은 arrayUnion, 또 할 것 횟수는 increment(두 사람이 동시에 눌러도 안전) */
export const markBucketDone = (bucket, { date, note = '', uid }) => {
  const entry = { date, note: note.trim().slice(0, 100), by: uid || null, at: Date.now() };
  const fields = { ...doneFields(bucket, date), history: arrayUnion(entry) };
  if (isRepeat(bucket)) fields.doneCount = increment(1);
  return safeUpdateDoc(ref(bucket.id), fields);
};

export const removeBucketHistory = (bucket, entryAt) => safeUpdateDoc(ref(bucket.id), removeHistoryFields(bucket, entryAt));
export const uncompleteBucket = (bucket) => safeUpdateDoc(ref(bucket.id), uncompleteFields(bucket));
export const changeBucketCompletedDate = (bucket, date) => safeUpdateDoc(ref(bucket.id), changeCompletedDateFields(bucket, date));

/** [언제 할까?] — 그날 커플 일정을 만들고 버킷에 연결. 이미 계획이 있으면 그 일정은 지움(날짜 바꾸기). */
export const planBucket = async (bucket, date, uid, coupleId) => {
  const ev = await createEvent({
    title: bucket.title,
    description: '하고 싶은 것에서 계획했어요',
    start: `${date}T00:00:00`,
    end: `${date}T23:59:59`,
    eventType: 'couple',
    isDday: false,
    bucketId: bucket.id,
  }, uid, coupleId);
  const oldEventId = bucket.plannedEventId;
  await safeUpdateDoc(ref(bucket.id), { plannedEventId: ev.id, plannedDate: date });
  if (oldEventId) removePlannedEvent(oldEventId, uid, coupleId);
  return ev;
};

/** 계획 풀기 — removeEvent면 캘린더 일정도 지움(지난 계획에 "아직이에요"·계획 취소) */
export const unplanBucket = async (bucket, uid, coupleId, { removeEvent = true } = {}) => {
  await safeUpdateDoc(ref(bucket.id), { plannedEventId: null, plannedDate: null });
  if (removeEvent && bucket.plannedEventId) removePlannedEvent(bucket.plannedEventId, uid, coupleId);
};

// 캘린더에서 이미 지웠을 수 있음 — 실패해도 화면은 막지 않음
const removePlannedEvent = (eventId, uid, coupleId) => {
  deleteEvent(eventId, uid, coupleId).catch(err => console.warn('[bucket] 계획 일정 삭제 실패:', err?.code || err));
};
