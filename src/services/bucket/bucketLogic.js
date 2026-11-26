// src/services/bucket/bucketLogic.js
// '하고 싶은 것'(버킷리스트) 순수 계산 — Firebase 의존 없음(단위 테스트: bucketLogic.test.js).
// 종류: 'once'(한 번 해볼 것 — 하면 '이룬 것'으로) / 'repeat'(또 할 것 — 해도 남고 횟수·기록이 쌓임).
// 예전 문서엔 kind가 없음 → 'once'로 봄(옮기기 없음). completed/completedAt은 once에서만 true/날짜.
import { getLocalDateStr } from '../../utils/dataUtils';

// 종류 이름·설명(화면 공통) — 'once'=해보고 싶은 것, 'repeat'=자주 할 것
export const KIND_LABEL = { once: '해보고 싶은 것', repeat: '자주 할 것' };
export const KIND_SHORT = { once: '해보기', repeat: '자주' };
export const KIND_DESC = {
  all: "해보고 싶은 것은 하면 '이룬 것'으로 넘어가고, 자주 할 것은 해도 남아 횟수가 쌓여요",
  once: "한 번 해보면 '이룬 것'으로 넘어가요",
  repeat: '해도 목록에 남고, 할 때마다 횟수와 기록이 쌓여요',
  done: '해보고 싶은 것 중 이룬 것들이에요. 누르면 날짜·한 줄을 고치거나 되돌릴 수 있어요',
};

export const bucketKind = (b) => (b?.kind === 'repeat' ? 'repeat' : 'once');
export const isRepeat = (b) => bucketKind(b) === 'repeat';
/** '이룬 것' 구역으로 가는 항목(한 번 해볼 것 + 완료) */
export const isAchieved = (b) => !isRepeat(b) && !!b?.completed;
export const isActive = (b) => !isAchieved(b);

export const doneCountOf = (b) => Math.max(Number(b?.doneCount) || 0, (b?.history || []).length);
export const likeUids = (b) => Object.keys(b?.likes || {}).filter(k => b.likes[k]);
export const bothLiked = (b) => likeUids(b).length >= 2;

/** createdAt(ISO 문자열·Timestamp·Date) → 'YYYY-MM-DD'(로컬) */
export const createdDateStr = (b) => {
  const v = b?.createdAt;
  if (!v) return '';
  if (typeof v === 'string') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v.slice(0, 10) : getLocalDateStr(d);
  }
  if (typeof v.toDate === 'function') return getLocalDateStr(v.toDate());
  if (v instanceof Date) return getLocalDateStr(v);
  return '';
};

export const dayDiff = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);

/** 미래 날짜인지(오늘은 아님) */
export const isFutureDate = (dateStr, todayStr = getLocalDateStr()) => !!dateStr && dateStr > todayStr;

export const addDaysStr = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return getLocalDateStr(d);
};

/** [언제 할까?] 빠른 선택 — 이번 주말(토, 오늘이 토·일이면 오늘)·다음 주말 */
export const weekendChoices = (todayStr = getLocalDateStr()) => {
  const wd = new Date(`${todayStr}T00:00:00`).getDay(); // 0 일 ~ 6 토
  const thisWeekend = wd === 6 || wd === 0 ? todayStr : addDaysStr(todayStr, 6 - wd);
  const nextBase = wd === 0 ? addDaysStr(todayStr, 6) : addDaysStr(todayStr, (6 - wd) + 7);
  return { thisWeekend, nextWeekend: wd === 6 ? addDaysStr(todayStr, 7) : nextBase };
};

/** 기다린 기준일 — once는 담은 날, repeat는 마지막으로 한 날(없으면 담은 날) */
const waitingSince = (b) => (isRepeat(b) && b.lastDoneAt) || createdDateStr(b) || '9999-12-31';

/**
 * 추천 순서 — 계획 안 잡힌 진행 중 항목 중
 * 1) 둘 다 하고 싶어요(♥ 2) 2) 오래 기다린 것(담은 지 오래 / 또 할 것은 안 한 지 오래).
 */
export const rankSuggestions = (list) => list
  .filter(b => isActive(b) && !b.plannedDate)
  .map(b => ({ b, both: bothLiked(b) ? 0 : 1, since: waitingSince(b) }))
  .sort((x, y) => x.both - y.both || (x.since < y.since ? -1 : x.since > y.since ? 1 : 0) || String(x.b.id).localeCompare(String(y.b.id)))
  .map(x => x.b);

/** 계획한 날이 지났는데 아직 기록 안 한 항목(오래된 순) — 보드 맨 위·홈 '오늘' 탭 "했어요?" 카드 */
export const getPendingBucketChecks = (list, todayStr = getLocalDateStr()) => list
  .filter(b => isActive(b) && b.plannedDate && b.plannedDate < todayStr)
  .sort((a, b) => (a.plannedDate < b.plannedDate ? -1 : 1));

/** 카드 아래 한 줄 */
export const bucketMetaText = (b, todayStr = getLocalDateStr(), md = (s) => s) => {
  if (b.plannedDate) return b.plannedDate === todayStr ? '오늘 하기로 했어요' : `${md(b.plannedDate)}에 하기로 했어요`;
  if (isRepeat(b)) {
    const n = doneCountOf(b);
    return n > 0 && b.lastDoneAt ? `${n}번 · ${md(b.lastDoneAt)}` : '아직 안 해봤어요';
  }
  if (isAchieved(b)) return b.completedAt ? `${md(b.completedAt)}에 이뤘어요` : '이뤘어요';
  const c = createdDateStr(b);
  if (!c) return '';
  const days = dayDiff(c, todayStr);
  return days <= 0 ? '오늘 담았어요' : `담은 지 ${days}일`;
};

/** 기록 목록(최근 날짜 먼저) */
export const sortedHistory = (b) => [...(b?.history || [])]
  .sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : (y.at || 0) - (x.at || 0)));

/**
 * [했어요] 저장 내용(history는 서비스에서 arrayUnion으로 붙임 — 동시 기록 보호).
 * once → 이룬 것으로, repeat → 횟수 +1(서비스에서 increment)·마지막 날짜 갱신. 계획은 풀어 줌.
 */
export const doneFields = (b, date) => {
  const base = { plannedEventId: null, plannedDate: null };
  if (isRepeat(b)) {
    const last = b.lastDoneAt && b.lastDoneAt > date ? b.lastDoneAt : date;
    return { ...base, lastDoneAt: last };
  }
  return { ...base, completed: true, completedAt: date };
};

/** 기록 하나 지우기(또 할 것) — 횟수·마지막 날짜 다시 계산 */
export const removeHistoryFields = (b, entryAt) => {
  const history = (b.history || []).filter(h => h.at !== entryAt);
  const last = history.reduce((m, h) => (h.date > m ? h.date : m), '');
  return { history, doneCount: history.length, lastDoneAt: last || null };
};

/** 이룬 것 되돌리기(once) — 그 완료 날짜의 기록도 같이 뺌 */
export const uncompleteFields = (b) => ({
  completed: false,
  completedAt: null,
  history: (b.history || []).filter(h => h.date !== b.completedAt),
});

/** 이룬 날짜 고치기(once) — 같은 날짜의 기록도 옮김 */
export const changeCompletedDateFields = (b, date) => ({
  completedAt: date,
  history: (b.history || []).map(h => (h.date === b.completedAt ? { ...h, date } : h)),
});

/**
 * 종류 바꾸기. once(이룸) → repeat: 완료를 1번 한 기록으로 옮김. repeat(한 적 있음) → once: 마지막 날짜로 이룬 것.
 */
export const kindChangeFields = (b, nextKind) => {
  if (bucketKind(b) === nextKind) return {};
  if (nextKind === 'repeat') {
    const history = b.history || [];
    const hasEntry = b.completedAt && history.some(h => h.date === b.completedAt);
    const nextHistory = b.completed && b.completedAt && !hasEntry
      ? [...history, { date: b.completedAt, note: '', by: b.createdBy || null, at: 0 }]
      : history;
    const last = nextHistory.reduce((m, h) => (h.date > m ? h.date : m), '');
    return { kind: 'repeat', completed: false, completedAt: null, history: nextHistory, doneCount: nextHistory.length, lastDoneAt: last || null };
  }
  const n = doneCountOf(b);
  return n > 0 && b.lastDoneAt
    ? { kind: 'once', completed: true, completedAt: b.lastDoneAt }
    : { kind: 'once', completed: false, completedAt: null };
};

/**
 * 월간 요약·연말 랩업용 — 또 할 것의 기록 하나하나를 '이룬 것'으로 펼침(항목 자체는 남은 것으로 셈).
 * 입력: recapData가 만든 { id, title, category, completed, completedStr, createdAt, kind, history }
 */
export const expandRepeatForRecap = (buckets) => buckets.flatMap((b) => {
  if (b.kind !== 'repeat') return [b];
  const done = (b.history || []).filter(h => h.date).map((h, i) => ({
    ...b, id: `${b.id}_${i}`, completed: true, completedStr: h.date, isRepeatRecord: true,
  }));
  return [{ ...b, completed: false, completedStr: '' }, ...done];
});
