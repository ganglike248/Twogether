// src/utils/dateUtils.js
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { ko } from 'date-fns/locale';

// 로컬(KST) 기준 YYYY-MM-DD 문자열 — toISOString() 금지 (UTC 변환 시 KST에서 하루 밀리는 버그 방지)
export const getLocalDateStr = (date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// 캘린더 이벤트가 걸쳐 있는 날짜 범위('YYYY-MM-DD', 양끝 포함). 여러 날짜 이벤트의 end는
// FullCalendar allDay 규칙대로 "마지막 날 다음날 00:00"(배타적)으로 저장되므로 하루를 빼서 포함 범위로
// 바꿈 — 하루짜리(end가 당일 23:59:59)는 날짜가 같아 그대로. end를 그대로 포함 비교하면 일정이 끝난
// 다음날 칸에도 잡히는 버그가 있었음(2026-10-12 발견/수정). 날짜 계산은 로컬 자정 기준(toISOString 금지).
export const getEventDayRange = (event) => {
  const toDateStr = (value) => {
    if (typeof value === 'string') return value.split('T')[0];
    if (value instanceof Date) return getLocalDateStr(value);
    return '';
  };
  const startStr = toDateStr(event?.start);
  let endStr = event?.end ? toDateStr(event.end) : startStr;
  if (endStr && endStr > startStr) {
    const d = new Date(`${endStr}T00:00:00`);
    d.setDate(d.getDate() - 1);
    endStr = getLocalDateStr(d);
  }
  return { startStr, endStr: endStr || startStr };
};

// Firestore Timestamp 또는 문자열을 Date 객체로 변환
export const convertToDate = (dateField) => {
  if (!dateField) return null;
  try {
    return dateField?.toDate ? dateField.toDate() : new Date(dateField);
  } catch (error) {
    console.error("Error converting date field:", error);
    return null;
  }
};

// 날짜 형식화 (ISO 문자열 또는 Firestore Timestamp 모두 처리)
export const formatDate = (dateString, formatPattern = 'yyyy년 MM월 dd일') => {
  try {
    let date;
    // Firestore Timestamp 처리
    if (dateString?.toDate) {
      date = dateString.toDate();
    } else {
      date = parseISO(dateString);
    }
    return format(date, formatPattern, { locale: ko });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

// 연애 D+day 계산 (anniversaryDate 문자열 'YYYY-MM-DD' → 오늘까지 경과 일수 + 1)
export const calcDday = (anniversaryDate) => {
  if (!anniversaryDate) return null;
  try {
    const start = parseISO(anniversaryDate);
    return differenceInCalendarDays(new Date(), start) + 1;
  } catch {
    return null;
  }
};