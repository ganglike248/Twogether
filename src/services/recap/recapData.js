// src/services/recap/recapData.js
// 월간 요약·연말 랩업용 데이터 읽기 — 커플 일정(여행 제외)·여행·버킷·봉인 편지를 한 번에 읽어 계산하기 쉬운 모양으로 정리.
// 개인 일정은 상대에게 보이는 화면이라 일부러 안 읽음. 저장하지 않고 볼 때마다 계산(데이터를 고치면 요약도 바로 반영).
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { getEventDayRange, convertToDate, getLocalDateStr } from '../../utils/dataUtils';

const MOOD_SCORE = { great: 5, good: 4, ok: 3, meh: 2, bad: 1 };

const toDateStr = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.split('T')[0];
  const d = convertToDate(value);
  return d ? getLocalDateStr(d) : '';
};

// 규칙상 list 쿼리는 coupleId 동등 조건이 반드시 필요
const byCouple = (name, coupleId) => getDocs(query(collection(db, name), where('coupleId', '==', coupleId)));

export const fetchRecapData = async (coupleId) => {
  const [evSnap, tripSnap, bucketSnap, letterSnap] = await Promise.all([
    byCouple('events', coupleId),
    byCouple('trips', coupleId),
    byCouple('bucketlists', coupleId),
    byCouple('sealedMessages', coupleId),
  ]);

  const events = evSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(e => e.eventType !== 'travel') // 여행은 trips에서(캘린더와 같은 규칙)
    .map(e => {
      const { startStr, endStr } = getEventDayRange(e);
      return {
        id: e.id,
        title: e.title || '',
        description: e.description || '',
        eventType: e.eventType,
        isDday: !!e.isDday,
        startStr,
        endStr,
        createdAt: convertToDate(e.createdAt),
        createdBy: e.createdBy || null,
      };
    })
    .filter(e => e.startStr);

  const trips = tripSnap.docs.map(d => {
    const t = d.data();
    // 여행 끝 기록(기분 점수 평균 · 기록 첫 줄) — 연말 랩업 '올해 가장 좋았던 여행'
    const reviews = Object.values(t.review || {}).filter(r => r && !r.skipped);
    const scores = reviews.map(r => MOOD_SCORE[r.mood]).filter(Boolean);
    const quote = reviews.map(r => (r.text || '').trim().split('\n')[0]).find(Boolean) || '';
    return {
      id: d.id, title: t.title || '', destination: t.destination || t.title || '',
      startStr: toDateStr(t.startDate), endStr: toDateStr(t.endDate) || toDateStr(t.startDate),
      moodScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0, quote,
    };
  }).filter(t => t.startStr);

  const buckets = bucketSnap.docs.map(d => {
    const b = d.data();
    return { id: d.id, title: b.title || '', category: b.category || '', completed: !!b.completed, completedStr: toDateStr(b.completedAt), createdAt: convertToDate(b.createdAt) };
  });

  const letters = letterSnap.docs.map(d => {
    const m = d.data();
    return { id: d.id, title: m.title || '', authorUid: m.authorUid, isUnlocked: !!m.isUnlocked, createdAt: convertToDate(m.createdAt), unlockedAt: convertToDate(m.unlockedAt) };
  });

  return { events, trips, buckets, letters };
};
