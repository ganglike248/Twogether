// src/services/recap/monthlyRecap.js
// 월간 요약 계산(순수 함수) — 카드 4장(달력·숫자·하이라이트·다음 달)의 데이터. 내용이 없는 카드는 null로 돌려 화면에서 건너뜀.
import { getSpecialDaysMap } from '../../utils/koreanHolidays';
import { getLocalDateStr } from '../../utils/dataUtils';
import { monthRange, addMonths, overlaps, eachDay, dayDiff, anniversariesInRange } from './recapDates';

const inRange = (s, fromStr, toStr) => s && s >= fromStr && s <= toStr;

/** 그달 커플 일정이 1개 이상 있는 달만 요약을 만듦 */
export const hasMonthlyData = (data, year, month) => {
  const { fromStr, toStr } = monthRange(year, month);
  return data.events.some(e => overlaps(e.startStr, e.endStr, fromStr, toStr));
};

/** 일정이 1개 이상 있는 달 목록(최근 순) — 지난 요약 목록용 */
export const listRecapMonths = (data, today = new Date()) => {
  const set = new Set(data.events.map(e => e.startStr.slice(0, 7)));
  const current = getLocalDateStr(today).slice(0, 7);
  return [...set].filter(k => k <= current).sort().reverse();
};

export const buildMonthlyRecap = (data, { year, month, coupleDoc, nameOf, today = new Date() }) => {
  const { fromStr, toStr, days } = monthRange(year, month);
  const events = data.events.filter(e => overlaps(e.startStr, e.endStr, fromStr, toStr));
  if (events.length === 0) return null;

  const trips = data.trips.filter(t => overlaps(t.startStr, t.endStr, fromStr, toStr));
  const anniversaries = anniversariesInRange(coupleDoc?.anniversaryDate, fromStr, toStr);

  // 1. 달력 — 일정 있는 날, 여행 날, 기념일
  const eventDays = new Set();
  events.forEach(e => eachDay(e.startStr < fromStr ? fromStr : e.startStr, e.endStr > toStr ? toStr : e.endStr).forEach(d => eventDays.add(d)));
  const tripDays = new Set();
  trips.forEach(t => eachDay(t.startStr < fromStr ? fromStr : t.startStr, t.endStr > toStr ? toStr : t.endStr).forEach(d => tripDays.add(d)));
  const annDays = new Set(anniversaries.map(a => a.dateStr));
  const firstWeekday = new Date(`${fromStr}T00:00:00`).getDay();
  const calendar = {
    year, month, firstWeekday, days,
    cells: Array.from({ length: days }, (_, i) => {
      const s = `${fromStr.slice(0, 8)}${String(i + 1).padStart(2, '0')}`;
      return { day: i + 1, event: eventDays.has(s), trip: tripDays.has(s), anniversary: annDays.has(s) };
    }),
    activeDays: new Set([...eventDays, ...tripDays]).size,
  };

  // 2. 숫자
  const prev = addMonths(year, month, -1);
  const prevRange = monthRange(prev.year, prev.month);
  const prevCount = data.events.filter(e => overlaps(e.startStr, e.endStr, prevRange.fromStr, prevRange.toStr)).length;
  const bucketsDone = data.buckets.filter(b => b.completed && inRange(b.completedStr, fromStr, toStr));
  const lettersInMonth = data.letters.filter(l => l.createdAt && inRange(getLocalDateStr(l.createdAt), fromStr, toStr));
  const members = coupleDoc?.members || [];
  const byWho = members.map((uid, i) => ({
    uid, role: i === 0 ? 'boyfriend' : 'girlfriend', name: nameOf(uid),
    count: events.filter(e => e.createdBy === uid).length,
  })).filter(w => w.name);
  const numbers = {
    events: events.length,
    eventsDiff: prevCount > 0 ? events.length - prevCount : null,
    trips: trips.length,
    tripLabel: trips.map(t => t.destination).filter(Boolean).slice(0, 2).join(', '),
    tripNights: trips[0] ? Math.max(0, dayDiff(trips[0].startStr, trips[0].endStr)) : 0,
    bucketsDone: bucketsDone.length,
    bucketsLeft: data.buckets.filter(b => !b.completed).length,
    letters: lettersInMonth.length,
    lettersSealed: lettersInMonth.filter(l => !l.isUnlocked).length,
    byWho: byWho.some(w => w.count > 0) ? byWho : [],
  };

  // 3. 하이라이트 — 있는 것만
  const spans = [
    ...events.map(e => ({ title: e.title, startStr: e.startStr, endStr: e.endStr, kind: '일정' })),
    ...trips.map(t => ({ title: t.title || t.destination, startStr: t.startStr, endStr: t.endStr, kind: '여행' })),
  ].sort((a, b) => dayDiff(b.startStr, b.endStr) - dayDiff(a.startStr, a.endStr) || a.startStr.localeCompare(b.startStr));
  const longest = spans[0] && dayDiff(spans[0].startStr, spans[0].endStr) >= 1 ? spans[0] : null;
  const lastYear = monthRange(year - 1, month);
  const yearAgo = data.events
    .filter(e => inRange(e.startStr, lastYear.fromStr, lastYear.toStr))
    .sort((a, b) => a.startStr.localeCompare(b.startStr))[0] || null;
  const highlights = (longest || anniversaries.length || bucketsDone.length || yearAgo)
    ? { longest, anniversaries, bucketsDone: bucketsDone.map(b => b.title), yearAgo }
    : null;

  // 4. 다음 달 미리보기
  const nx = addMonths(year, month, 1);
  const nRange = monthRange(nx.year, nx.month);
  const todayStr = getLocalDateStr(today);
  const special = getSpecialDaysMap([nx.year]);
  const coupleDays = [];
  special.forEach((list, dateStr) => {
    if (inRange(dateStr, nRange.fromStr, nRange.toStr)) list.filter(x => x.type === 'couple').forEach(x => coupleDays.push({ dateStr, label: x.name, kind: '이벤트데이' }));
  });
  const nextAnns = anniversariesInRange(coupleDoc?.anniversaryDate, nRange.fromStr, nRange.toStr).map(a => ({ ...a, kind: '기념일' }));
  const nextTrips = data.trips.filter(t => inRange(t.startStr, nRange.fromStr, nRange.toStr))
    .map(t => ({ dateStr: t.startStr, label: t.title || t.destination, kind: '여행', endStr: t.endStr }));
  const nextEvents = data.events.filter(e => inRange(e.startStr, nRange.fromStr, nRange.toStr)).sort((a, b) => a.startStr.localeCompare(b.startStr));
  const busy = new Set();
  nextEvents.forEach(e => eachDay(e.startStr, e.endStr).forEach(d => busy.add(d)));
  data.trips.forEach(t => eachDay(t.startStr, t.endStr).forEach(d => busy.add(d)));
  let emptyWeekends = 0;
  eachDay(nRange.fromStr, nRange.toStr).forEach(d => {
    const wd = new Date(`${d}T00:00:00`).getDay();
    if (wd === 6) {
      const sun = new Date(`${d}T00:00:00`); sun.setDate(sun.getDate() + 1);
      if (!busy.has(d) && !busy.has(getLocalDateStr(sun))) emptyWeekends += 1;
    }
  });
  const upcoming = [...nextAnns, ...coupleDays, ...nextTrips]
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
    .map(u => ({ ...u, dday: dayDiff(todayStr, u.dateStr) }));
  const next = {
    year: nx.year, month: nx.month,
    upcoming: upcoming.slice(0, 3),
    eventCount: nextEvents.length,
    nearestEvent: nextEvents[0] || null,
    emptyWeekends,
  };

  return { year, month, calendar, numbers, highlights, next };
};
