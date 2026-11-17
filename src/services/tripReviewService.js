// src/services/tripReviewService.js
// 여행이 끝난 뒤 기록 — 사람마다 trips.review[uid] = { mood, text, top3:[scheduleId], doneAt | skipped, updatedAt }.
// 지도 지역은 여행 하나에 하나(trips.regions) — 먼저 기록한 사람이 확정(regionsConfirmedBy/At), 나중 사람은 확인·고치기.
// review는 필드 경로(review.<uid>.x)로만 씀 → 두 사람이 동시에 써도 서로의 기록을 덮지 않음.
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { convertToDate, getLocalDateStr } from '../utils/dataUtils';
import { mergeRegions } from './regions/regionData';

// 이 날짜 이후에 끝난 여행만 기록 카드를 띄움(기능 나오기 전 지난 여행이 한꺼번에 쌓이지 않게)
export const REVIEW_FEATURE_START = '2026-11-01';
export const REVIEW_TEXT_MAX = 2000;

export const MOODS = [
  { key: 'great', label: '최고' },
  { key: 'good', label: '좋았어' },
  { key: 'ok', label: '무난' },
  { key: 'meh', label: '아쉬움' },
  { key: 'bad', label: '별로' },
];
export const moodLabel = (key) => MOODS.find(m => m.key === key)?.label || '';

export const tripDateStr = (v) => {
  if (!v) return '';
  if (typeof v === 'string') return v.slice(0, 10);
  const d = convertToDate(v);
  return d ? getLocalDateStr(d) : '';
};

export const isReviewDone = (trip, uid) => !!(trip?.review?.[uid]?.doneAt || trip?.review?.[uid]?.skipped);

/** 홈 카드에 띄울 여행 — 끝났고(종료일 < 오늘), 내가 아직 기록·건너뛰기 안 한 것 중 가장 최근 */
export const getPendingReviewTrip = (trips = [], uid, today = new Date()) => {
  if (!uid) return null;
  const todayStr = getLocalDateStr(today);
  return trips
    .filter(t => {
      const end = tripDateStr(t.endDate);
      return end && end < todayStr && end >= REVIEW_FEATURE_START && !isReviewDone(t, uid);
    })
    .sort((a, b) => tripDateStr(b.endDate).localeCompare(tripDateStr(a.endDate)))[0] || null;
};

const tripRef = (tripId) => doc(db, 'trips', tripId);

/** 내 기록 일부 저장(단계마다 — 중간에 나가도 쓴 글이 남게) */
export const saveMyReview = (tripId, uid, fields) => {
  const updates = { [`review.${uid}.updatedAt`]: Date.now() };
  Object.entries(fields).forEach(([k, v]) => { updates[`review.${uid}.${k}`] = v; });
  return updateDoc(tripRef(tripId), updates);
};

export const skipReview = (tripId, uid) => saveMyReview(tripId, uid, { skipped: true });

/** 마지막 단계 — 지도 지역 확정(바꿨거나 처음 확정할 때만 regions를 씀) + 내 기록 완료 표시 */
export const finishReview = (tripId, uid, { regions, confirmRegions }) => {
  const updates = { [`review.${uid}.doneAt`]: Date.now(), [`review.${uid}.updatedAt`]: Date.now() };
  if (confirmRegions) {
    updates.regions = mergeRegions(regions || []);
    updates.regionsConfirmedBy = uid;
    updates.regionsConfirmedAt = serverTimestamp();
  }
  return updateDoc(tripRef(tripId), updates);
};

/** 이번 여행으로 커플 지도에 처음 칠해지는 시·군·구 — 다른 '이미 시작한' 여행에 없는 곳 */
export const firstTimeSggs = (trips = [], tripId, regions = [], today = new Date()) => {
  const todayStr = getLocalDateStr(today);
  const seen = new Set();
  trips.forEach(t => {
    if (t.id === tripId) return;
    const start = tripDateStr(t.startDate);
    if (!start || start > todayStr) return;
    (t.regions || []).forEach(r => r.sgg && seen.add(r.sgg));
  });
  return [...new Set(mergeRegions(regions).filter(r => r.sgg).map(r => r.sgg))].filter(c => !seen.has(c));
};
