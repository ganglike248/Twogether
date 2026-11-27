// src/services/decisions/dailyDecisionService.js
// 일상 결정(같이 정해요) 저장 — decisions/{topicId}(주제) + decisions/{topicId}/rounds/{roundId}(판마다 후보·결과).
// 여행 후보(trips/{id}/travelDecisions)는 그대로 두고 화면 부품만 같이 씀(2026-11-27 사용자 결정).
// 후보 배열 수정은 트랜잭션(두 사람이 동시에 평가해도 덮어쓰지 않게, travelDecisionService와 같은 이유).
// 목록 조회는 규칙이 보는 coupleId를 where에 꼭 넣음. 정렬은 기기에서(색인 없이) — *AtMs 값을 같이 저장.
import {
  collection, doc, getDocs, increment, onSnapshot, query, runTransaction, serverTimestamp, where, writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { commitBatch, safeUpdateDoc } from '../offlineWrite';
import { reportSubscribeError } from '../subscribeError';

const topicRef = (topicId) => doc(db, 'decisions', topicId);
const roundsCol = (topicId) => collection(db, 'decisions', topicId, 'rounds');
const roundRef = (topicId, roundId) => doc(db, 'decisions', topicId, 'rounds', roundId);

export const newOptionId = () => `opt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const toMs = (v) => (v?.toMillis ? v.toMillis() : null);

export const subscribeDecisionTopics = (coupleId, callback, onError) => {
  const q = query(collection(db, 'decisions'), where('coupleId', '==', coupleId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, updatedAtMs: data.updatedAtMs || toMs(data.updatedAt) || 0 };
    }));
  }, (error) => reportSubscribeError('decisions', error, onError));
};

export const subscribeDecisionRounds = (topicId, coupleId, callback, onError) => {
  const q = query(roundsCol(topicId), where('coupleId', '==', coupleId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, (error) => reportSubscribeError('decisionRounds', error, onError));
};

export const subscribeDecisionRound = (topicId, roundId, callback, onError) => onSnapshot(
  roundRef(topicId, roundId),
  (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
  (error) => reportSubscribeError('decisionRound', error, onError),
);

const newRoundData = ({ coupleId, topicId, userId, options = [] }) => ({
  coupleId,
  topicId,
  status: 'deciding',
  options,
  startedBy: userId,
  startedAt: serverTimestamp(),
  startedAtMs: Date.now(),
  updatedAt: serverTimestamp(),
});

/** 새 주제 + 첫 판(비어 있음)을 한 번에 — 만든 주제 ID를 돌려줌 */
export const createDecisionTopic = async ({ coupleId, userId, title }) => {
  const tRef = doc(collection(db, 'decisions'));
  const rRef = doc(roundsCol(tRef.id));
  const batch = writeBatch(db);
  batch.set(tRef, {
    coupleId,
    title: title.trim(),
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedAtMs: Date.now(),
    roundCount: 0,
    lastResult: null,
    currentRoundId: rRef.id,
  });
  batch.set(rRef, newRoundData({ coupleId, topicId: tRef.id, userId }));
  await commitBatch(batch);
  return tRef.id;
};

export const renameDecisionTopic = (topicId, title) => safeUpdateDoc(topicRef(topicId), {
  title: title.trim(), updatedAt: serverTimestamp(), updatedAtMs: Date.now(),
});

/** 주제 삭제 — 지난 판까지 전부 */
export const deleteDecisionTopic = async (topicId, coupleId) => {
  const snap = await getDocs(query(roundsCol(topicId), where('coupleId', '==', coupleId)));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(topicRef(topicId));
  await commitBatch(batch);
};

/** 새로 정하기 — 고른 후보로 새 판을 열고 주제의 '지금 판'으로 */
export const startDecisionRound = async ({ topicId, coupleId, userId, options }) => {
  const rRef = doc(roundsCol(topicId));
  const batch = writeBatch(db);
  batch.set(rRef, newRoundData({ coupleId, topicId, userId, options }));
  batch.update(topicRef(topicId), { currentRoundId: rRef.id, updatedAt: serverTimestamp(), updatedAtMs: Date.now() });
  await commitBatch(batch);
  return rRef.id;
};

// 지금 판의 후보 배열 읽고-고치고-쓰기(트랜잭션). mutate가 null이면 쓰지 않음
const mutateRoundOptions = (topicId, roundId, mutate) => runTransaction(db, async (tx) => {
  const ref = roundRef(topicId, roundId);
  const snap = await tx.get(ref);
  if (!snap.exists()) throw new Error('Round not found');
  const next = mutate([...(snap.data().options || [])]);
  if (!next) return;
  tx.update(ref, { options: next, updatedAt: serverTimestamp() });
  tx.update(topicRef(topicId), { updatedAt: serverTimestamp(), updatedAtMs: Date.now() });
});

export const addRoundOption = (topicId, roundId, option) => mutateRoundOptions(topicId, roundId, (options) => [
  ...options,
  {
    id: option.id || newOptionId(),
    title: option.title,
    url: option.url || '',
    address: option.address || '',
    description: option.description || '',
    price: option.price || '',
    images: option.images || [],
    scores: [],
    totalScore: 0,
  },
]);

export const updateRoundOption = (topicId, roundId, optionId, fields) => mutateRoundOptions(topicId, roundId, (options) => (
  options.map((o) => (o.id === optionId ? { ...o, ...fields, title: fields.title || o.title } : o))
));

export const deleteRoundOption = (topicId, roundId, optionId) => mutateRoundOptions(topicId, roundId, (options) => (
  options.filter((o) => o.id !== optionId)
));

export const toggleRoundFavorite = (topicId, roundId, optionId) => mutateRoundOptions(topicId, roundId, (options) => (
  options.map((o) => (o.id === optionId ? { ...o, isFavorite: !o.isFavorite } : o))
));

export const scoreRoundOption = (topicId, roundId, optionId, userId, score, comment = '') => mutateRoundOptions(topicId, roundId, (options) => (
  options.map((o) => {
    if (o.id !== optionId) return o;
    const scores = (o.scores || []).filter((s) => s.userId !== userId);
    if (score > 0) scores.push({ userId, score, comment: comment.trim() || '' });
    return { ...o, scores, totalScore: scores.reduce((sum, s) => sum + s.score, 0) };
  })
));

/** 확정 — 이 판을 끝내고 지난 결정으로(주제의 마지막 결과·횟수도 같이). viaWheel: 돌림판으로 정함 */
export const decideRoundOption = (topicId, roundId, optionId, userId, viaWheel = false) => runTransaction(db, async (tx) => {
  const rRef = roundRef(topicId, roundId);
  const snap = await tx.get(rRef);
  if (!snap.exists()) throw new Error('Round not found');
  const data = snap.data();
  if (data.status === 'decided') return; // 상대가 먼저 정함
  const option = (data.options || []).find((o) => o.id === optionId);
  if (!option) throw new Error('Option not found');
  const now = Date.now();
  tx.update(rRef, {
    status: 'decided',
    options: data.options.map((o) => (o.id === optionId ? { ...o, isDecided: true, decidedBy: userId, decidedAt: now } : o)),
    decidedOptionId: optionId,
    decidedTitle: option.title,
    decidedBy: userId,
    decidedAt: serverTimestamp(),
    decidedAtMs: now,
    viaWheel: !!viaWheel,
    updatedAt: serverTimestamp(),
  });
  tx.update(topicRef(topicId), {
    currentRoundId: null,
    lastResult: { title: option.title, roundId, atMs: now, viaWheel: !!viaWheel },
    roundCount: increment(1),
    updatedAt: serverTimestamp(),
    updatedAtMs: now,
  });
});

/** 지난 결정 하나 지우기 — 주제의 마지막 결과·횟수도 맞춤(nextLastResult는 화면이 계산해 넘김) */
export const deleteHistoryRound = async (topicId, roundId, nextLastResult) => {
  const batch = writeBatch(db);
  batch.delete(roundRef(topicId, roundId));
  batch.update(topicRef(topicId), {
    lastResult: nextLastResult,
    roundCount: increment(-1),
    updatedAt: serverTimestamp(),
  });
  await commitBatch(batch);
};
