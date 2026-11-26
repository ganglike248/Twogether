// src/services/tripPhase.js
// 여행 상태는 날짜로만 정함(v1.2.1~) — 예전엔 수정 모달에서 직접 골라서(trips.status), 끝난 여행이 계속 '계획중'으로 남았음.
// 저장된 status 값은 건드리지 않고 더는 읽지 않음. Firebase 의존 없음(테스트: tripPhase.test.js).
import { convertToDate, getLocalDateStr } from '../utils/dataUtils';

export const tripDateStr = (v) => {
  if (!v) return '';
  if (typeof v === 'string') return v.slice(0, 10);
  const d = convertToDate(v);
  return d ? getLocalDateStr(d) : '';
};

export const TRIP_PHASES = {
  upcoming: { key: 'upcoming', label: '다가오는', cls: 'planning' },
  ongoing: { key: 'ongoing', label: '여행 중', cls: 'ongoing' },
  past: { key: 'past', label: '다녀옴', cls: 'completed' },
};

/** 'upcoming'(시작 전) | 'ongoing'(시작일~종료일) | 'past'(종료일 지남). 날짜가 없으면 upcoming */
export const getTripPhase = (trip, todayStr = getLocalDateStr()) => {
  const start = tripDateStr(trip?.startDate);
  const end = tripDateStr(trip?.endDate) || start;
  if (!start) return 'upcoming';
  if (todayStr < start) return 'upcoming';
  return todayStr > end ? 'past' : 'ongoing';
};

export const getTripPhaseInfo = (trip, todayStr) => TRIP_PHASES[getTripPhase(trip, todayStr)];

/** 여행 일수(시작·종료 포함). 날짜가 이상하면 1 */
export const getTripDayCount = (startDate, endDate) => {
  const s = tripDateStr(startDate); const e = tripDateStr(endDate) || s;
  if (!s) return 1;
  const diff = Math.round((new Date(`${e}T00:00:00`) - new Date(`${s}T00:00:00`)) / 86400000);
  return diff >= 0 ? diff + 1 : 1;
};

/** 기간을 newDays일로 줄이면 잘리는 일정 — { days: [잘리는 Day...], count: 일정 수 } (일정표 문서 목록 기준) */
export const getOverflowSchedules = (scheduleDocs = [], newDays) => {
  const over = scheduleDocs.filter(d => d.day > newDays && (d.schedules || []).length > 0);
  return {
    days: over.map(d => d.day).sort((a, b) => a - b),
    count: over.reduce((n, d) => n + d.schedules.length, 0),
  };
};

const dayGap = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);

/** 시작일까지 남은 날(D-N의 N). 오늘 시작이면 0 */
export const getTripDday = (trip, todayStr = getLocalDateStr()) => {
  const start = tripDateStr(trip?.startDate);
  return start ? dayGap(todayStr, start) : null;
};

/** 여행 중인 여행의 오늘 Day(1부터) */
export const getTripTodayDay = (trip, todayStr = getLocalDateStr()) => {
  const start = tripDateStr(trip?.startDate);
  return start ? dayGap(start, todayStr) + 1 : 1;
};

/** 목록 구역 — 여행 중(시작 빠른 순) / 다가오는(가까운 순) / 다녀옴(최근 끝난 순) */
export const groupTripsByPhase = (trips = [], todayStr = getLocalDateStr()) => {
  const by = (key) => (a, b) => tripDateStr(a[key]).localeCompare(tripDateStr(b[key]));
  const of = (phase) => trips.filter(t => getTripPhase(t, todayStr) === phase);
  return {
    ongoing: of('ongoing').sort(by('startDate')),
    upcoming: of('upcoming').sort(by('startDate')),
    past: of('past').sort((a, b) => by('endDate')(b, a)),
  };
};
