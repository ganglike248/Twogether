// src/components/EditLog/editLogFormat.js
// 수정기록 한 줄을 화면 문구로 바꾸는 순수 함수(서버 조회 없음 — 기록에 담긴 값과 캘린더가 이미 가진 일정만 씀)
import { getLocalDateStr } from '../../utils/dataUtils';

const isChange = (v) => !!v && typeof v === 'object' && 'to' in v;
const dayPart = (v) => (typeof v === 'string' ? v.split('T')[0] : '');

const fmtDay = (s) => {
  const [y, m, d] = String(s).split('-').map(Number);
  return y && m && d ? `${y}년 ${m}월 ${d}일` : '';
};

// 저장된 end는 여러 날이면 '다음 날 00:00'(배타적), 하루면 '그날 23:59' — 화면에는 마지막 날로
const inclusiveEnd = (end) => {
  const day = dayPart(end);
  if (!day || !String(end).endsWith('T00:00:00')) return day;
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return getLocalDateStr(d);
};

const rangeText = (start, end) => {
  const s = dayPart(start);
  if (!s) return '';
  const e = inclusiveEnd(end);
  return e && e > s ? `${fmtDay(s)} ~ ${fmtDay(e)}` : fmtDay(s);
};

const newer = (v) => (isChange(v) ? v.to : v);

/** 기록 자신에 담긴 제목·날짜(없으면 빈 값) */
const ownInfo = (log) => {
  const c = log.changes || {};
  const title = newer(c.title);
  const start = newer(c.start) || (typeof c.from === 'string' ? c.from : null); // 반복 수정·삭제는 기준일(from)
  const end = newer(c.end);
  return {
    title: typeof title === 'string' ? title : '',
    start: typeof start === 'string' ? start : '',
    end: typeof end === 'string' ? end : '',
  };
};

/** eventId → { title, start, end } — 지금 있는 일정이 먼저, 없으면 같은 일정의 다른 기록에서 */
export const buildLogLookup = (logs, events = []) => {
  const map = {};
  events.forEach((e) => {
    if (e?.id) map[e.id] = { title: e.title || '', start: typeof e.start === 'string' ? e.start : '', end: typeof e.end === 'string' ? e.end : '' };
  });
  logs.forEach((log) => {
    if (!log.eventId) return;
    const own = ownInfo(log);
    const cur = map[log.eventId] || { title: '', start: '', end: '' };
    map[log.eventId] = { title: cur.title || own.title, start: cur.start || own.start, end: cur.start ? cur.end : own.end };
  });
  return map;
};

export const getLogTitle = (log, lookup) => ownInfo(log).title || lookup[log.eventId]?.title || '지워진 일정';

export const getLogDate = (log, lookup) => {
  const own = ownInfo(log);
  if (own.start) return rangeText(own.start, own.end);
  const known = lookup[log.eventId];
  return known?.start ? rangeText(known.start, known.end) : '';
};

const FIELD_LABEL = { title: '제목', description: '메모' };

/** '수정됨' 기록의 바뀐 항목 → [{ label, from, to }] (typeName: 'couple'|'boyfriend'|'girlfriend' → 화면 이름) */
export const getChangeRows = (changes, typeName) => {
  if (!changes || typeof changes !== 'object') return [];
  const rows = [];
  const text = (v) => (v === null || v === undefined || v === '' ? '(없음)' : String(v));
  const push = (label, from, to) => { if (from !== to) rows.push({ label, from, to }); };

  ['title', 'description'].forEach((key) => {
    if (isChange(changes[key])) push(FIELD_LABEL[key], text(changes[key].from), text(changes[key].to));
  });

  const { start, end } = changes;
  if (isChange(start) && isChange(end)) {
    push('날짜', rangeText(start.from, end.from) || '(없음)', rangeText(start.to, end.to) || '(없음)');
  } else if (isChange(start)) {
    push('시작일', fmtDay(dayPart(start.from)) || '(없음)', fmtDay(dayPart(start.to)) || '(없음)');
  } else if (isChange(end)) {
    push('종료일', fmtDay(inclusiveEnd(end.from)) || '(없음)', fmtDay(inclusiveEnd(end.to)) || '(없음)');
  }

  if (isChange(changes.eventType)) {
    push('종류', changes.eventType.from ? typeName(changes.eventType.from) : '(없음)', typeName(changes.eventType.to));
  }
  if (isChange(changes.isDday)) {
    push('디데이', changes.isDday.from ? '켬' : '끔', changes.isDday.to ? '켬' : '끔');
  }
  return rows;
};

/** 한 줄 요약 — who는 닉네임(없으면 빈 문자열) */
export const getLogSummary = (log, rows, who) => {
  const by = who ? `${who}님이 ` : '';
  const c = log.changes || {};
  switch (log.action) {
    case 'created': return `${by}새 일정을 만들었어요`;
    case 'deleted': return `${by}일정을 지웠어요`;
    case 'converted_to_personal': return `${by}나만 보는 일정으로 바꿨어요`;
    case 'recurrence_created': return `${by}반복 일정${c.occurrenceCount ? ` ${c.occurrenceCount}개` : ''}를 만들었어요`;
    case 'recurrence_updated': return `${by}반복 일정을 고쳤어요`;
    case 'recurrence_deleted': return `${by}반복 일정${c.deletedCount ? ` ${c.deletedCount}개` : ''}를 지웠어요`;
    case 'updated':
      return rows.length > 0 ? `${by}${rows.map((r) => r.label).join('·')} 바꿨어요` : `${by}일정을 고쳤어요`;
    default: return '';
  }
};
