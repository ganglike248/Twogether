// src/services/recap/recapWindow.js
// 홈 "월간 요약" 카드 노출 기간 — 그달 말일 ~ 다음 달 7일. 대상 달 'YYYY-MM' 또는 null.
import { getLocalDateStr } from '../../utils/dataUtils';
import { addMonths } from './recapDates';

const key = ({ year, month }) => `${year}-${String(month).padStart(2, '0')}`;

export const getRecapWindowMonth = (today = new Date()) => {
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  if (tomorrow.getDate() === 1) return key({ year: y, month: m }); // 말일
  if (today.getDate() <= 7) return key(addMonths(y, m, -1));
  return null;
};

/** 연말 랩업 카드 노출 기간 — 12월 31일 ~ 1월 7일. 대상 연도 또는 null */
export const getWrapUpWindowYear = (today = new Date()) => {
  const m = today.getMonth() + 1;
  const d = today.getDate();
  if (m === 12 && d === 31) return today.getFullYear();
  if (m === 1 && d <= 7) return today.getFullYear() - 1;
  return null;
};

const isCoupleEvent = (e) => { const p = e?.extendedProps || {}; return !p.isTrip && !p.isPersonal; };
const startStrOf = (e) => (typeof e.start === 'string' ? e.start : e.start ? getLocalDateStr(new Date(e.start)) : '');

/** 그해 커플 일정 개수 */
export const countCoupleEventsInYear = (events, year) =>
  events.filter(e => isCoupleEvent(e) && startStrOf(e).startsWith(`${year}-`)).length;

/** 홈에서 이미 구독 중인 캘린더 이벤트(useCalendarData)로 대상 달에 커플 일정이 있는지 */
export const hasCoupleEventInMonth = (events, monthKey) =>
  events.some(e => {
    const p = e?.extendedProps || {};
    if (p.isTrip || p.isPersonal) return false;
    const start = typeof e.start === 'string' ? e.start : e.start ? getLocalDateStr(new Date(e.start)) : '';
    return start.slice(0, 7) === monthKey;
  });
