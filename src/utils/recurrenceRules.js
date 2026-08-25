// src/utils/recurrenceRules.js
// 반복 일정 규칙 → 실제 발생 날짜 목록 계산 (순수 함수, Firebase 의존 없음 — 단독 테스트 가능)
import { addDays, addMonths, addYears, getDay, getDaysInMonth, isLeapYear } from 'date-fns';
import { getLocalDateStr } from './dataUtils';

export const RECURRENCE_MAX_OCCURRENCES = 50;
export const RECURRENCE_LIMIT_MESSAGE = '일정의 수가 너무 많습니다. 반복되는 기간 등을 조절해주세요.';

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export class RecurrenceLimitError extends Error {
  constructor(count) {
    super(RECURRENCE_LIMIT_MESSAGE);
    this.name = 'RecurrenceLimitError';
    this.count = count;
  }
}

// 날짜 전용 문자열('YYYY-MM-DD')은 EventModal.js와 동일하게 로컬 자정으로 파싱하고
// (`${dateStr}T00:00:00`), date-fns 가감(로컬 getter/setter 기반) 후 getLocalDateStr로
// 다시 로컬 문자열화함 — toISOString()은 쓰지 않음(UTC 변환 시 KST가 아닌 타임존에서
// 날짜가 하루 밀릴 수 있어 CLAUDE.md 규칙상 금지, date-fns의 addDays 등도 로컬
// getDate()/setDate() 기반이라 파싱·포맷 양쪽을 로컬로 통일해야 안전함).
const toDateOnly = (dateStr) => new Date(`${dateStr}T00:00:00`);
const fmt = (d) => getLocalDateStr(d);

// 매월 반복 말일 보정 (예: 31일 반복 → 30일까지인 달은 30일로)
function addMonthsClamped(base, months, anchorDay) {
  const target = addMonths(base, months);
  const daysInTarget = getDaysInMonth(target);
  target.setDate(Math.min(anchorDay, daysInTarget));
  return target;
}

// 매년 반복 2/29 보정 (평년이면 2/28로)
function addYearsClamped(base, years, anchorMonth, anchorDay) {
  const target = addYears(base, years);
  if (anchorMonth === 1 && anchorDay === 29) {
    const daysInFeb = isLeapYear(target) ? 29 : 28;
    target.setMonth(1, Math.min(anchorDay, daysInFeb));
  }
  return target;
}

/**
 * 반복 규칙 + 시작일로부터 실제 발생 날짜 목록('YYYY-MM-DD'[])을 계산.
 * 50개(RECURRENCE_MAX_OCCURRENCES)를 넘으면 RecurrenceLimitError를 던짐.
 *
 * rule: {
 *   freq: 'daily'|'weekly'|'monthly'|'yearly',
 *   interval: number (기본 1),
 *   byWeekday: number[] | null (freq==='weekly' 전용, 0=일~6=토, 비어있으면 startDate 요일 사용),
 *   endType: 'date' | 'count',
 *   until: 'YYYY-MM-DD' (endType==='date'일 때 필수, 포함),
 *   count: number (endType==='count'일 때 필수),
 * }
 */
export function generateOccurrenceDates(rule, startDateStr) {
  if (!startDateStr) return [];
  const { freq, interval = 1, byWeekday, endType, until, count } = rule || {};
  const safeInterval = Math.max(1, Number(interval) || 1);
  const start = toDateOnly(startDateStr);
  const untilDate = endType === 'date' && until ? toDateOnly(until) : null;
  const maxCount = endType === 'count' && count ? Number(count) : null;

  const dates = [];

  // true=계속, 'stop'=이번 것까지 포함하고 종료, false=이번 것 제외하고 종료
  const pushIfValid = (d) => {
    if (untilDate && d.getTime() > untilDate.getTime()) return false;
    dates.push(fmt(d));
    if (dates.length > RECURRENCE_MAX_OCCURRENCES) {
      throw new RecurrenceLimitError(dates.length);
    }
    if (maxCount && dates.length >= maxCount) return 'stop';
    return true;
  };

  const hardIterationCap = (RECURRENCE_MAX_OCCURRENCES + 2) * 10; // 방어적 안전장치(무한루프 방지)

  if (freq === 'daily') {
    let i = 0;
    while (i < hardIterationCap) {
      const res = pushIfValid(addDays(start, i * safeInterval));
      if (res === false || res === 'stop') break;
      i++;
    }
  } else if (freq === 'weekly') {
    const weekdays = byWeekday && byWeekday.length > 0
      ? [...byWeekday].sort((a, b) => a - b)
      : [getDay(start)];
    const weekStart = addDays(start, -getDay(start)); // 시작일이 속한 주의 일요일
    let stopped = false;
    let w = 0;
    while (!stopped && w < hardIterationCap) {
      for (const wd of weekdays) {
        const d = addDays(weekStart, w * 7 * safeInterval + wd);
        if (d.getTime() < start.getTime()) continue; // 시작일 이전은 건너뜀
        const res = pushIfValid(d);
        if (res === false || res === 'stop') { stopped = true; break; }
      }
      w++;
    }
  } else if (freq === 'monthly') {
    const anchorDay = start.getDate();
    let i = 0;
    while (i < hardIterationCap) {
      const d = i === 0 ? start : addMonthsClamped(start, i * safeInterval, anchorDay);
      const res = pushIfValid(d);
      if (res === false || res === 'stop') break;
      i++;
    }
  } else if (freq === 'yearly') {
    const anchorMonth = start.getMonth();
    const anchorDay = start.getDate();
    let i = 0;
    while (i < hardIterationCap) {
      const d = i === 0 ? start : addYearsClamped(start, i * safeInterval, anchorMonth, anchorDay);
      const res = pushIfValid(d);
      if (res === false || res === 'stop') break;
      i++;
    }
  } else {
    throw new Error(`알 수 없는 반복 유형입니다: ${freq}`);
  }

  return dates;
}

// EventModal 미리보기/요약 문구용
export function describeRecurrenceRule(rule) {
  if (!rule) return '';
  const { freq, interval = 1, byWeekday, endType, until, count } = rule;
  const n = Math.max(1, Number(interval) || 1);
  let base;
  if (freq === 'daily') {
    base = n === 1 ? '매일' : `${n}일마다`;
  } else if (freq === 'weekly') {
    const days = byWeekday && byWeekday.length > 0
      ? [...byWeekday].sort((a, b) => a - b).map((d) => WEEKDAY_LABELS[d]).join('·')
      : '';
    base = n === 1
      ? `매주${days ? ` ${days}요일` : ''}`
      : `${n}주마다${days ? ` ${days}요일` : ''}`;
  } else if (freq === 'monthly') {
    base = n === 1 ? '매월' : `${n}개월마다`;
  } else if (freq === 'yearly') {
    base = n === 1 ? '매년' : `${n}년마다`;
  } else {
    base = '';
  }
  const end = endType === 'count' ? ` (${count}회)` : endType === 'date' && until ? ` (${until}까지)` : '';
  return `${base}${end}`;
}
