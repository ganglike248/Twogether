// src/services/recap/yearRecap.js
// 연말 랩업 계산(순수 함수) — 카드 11장의 데이터. 커플 일정만, 내용 없는 카드는 null → 화면에서 건너뜀.
// 그해 커플 일정 5개 미만이면 랩업 자체를 만들지 않음(null).
import { getSpecialDaysMap } from '../../utils/koreanHolidays';
import { getLocalDateStr } from '../../utils/dataUtils';
import { getCategoryDisplayName } from '../categoryColorService';
import { dayDiff, eachDay, overlaps, anniversariesInRange } from './recapDates';

export const YEAR_MIN_EVENTS = 5;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const SEASONS = [['봄', [3, 4, 5]], ['여름', [6, 7, 8]], ['가을', [9, 10, 11]], ['겨울', [12, 1, 2]]];

const yearRange = (y) => ({ fromStr: `${y}-01-01`, toStr: `${y}-12-31` });
const inRange = (s, a, b) => !!s && s >= a && s <= b;
const clip = (s, e, a, b) => [s < a ? a : s, e > b ? b : e];
const weekday = (s) => new Date(`${s}T00:00:00`).getDay();
const monthOf = (s) => Number(s.slice(5, 7));
const partOfMonth = (s) => { const d = Number(s.slice(8, 10)); return d <= 10 ? '초' : d <= 20 ? '중순' : '말'; };
const weekIndex = (s, y) => Math.floor((dayDiff(`${y}-01-01`, s) + weekday(`${y}-01-01`)) / 7); // 일요일 시작 주
const top = (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || null;

/** 연도 하나의 기본 통계 — 올해·작년 비교에 같이 씀 */
const yearStats = (data, y, todayStr) => {
  const { fromStr } = yearRange(y);
  const toStr = `${y}-12-31` < todayStr ? `${y}-12-31` : todayStr;
  const events = data.events.filter(e => inRange(e.startStr, fromStr, `${y}-12-31`)).sort((a, b) => a.startStr.localeCompare(b.startStr));
  const trips = data.trips.filter(t => overlaps(t.startStr, t.endStr, fromStr, `${y}-12-31`));

  const perDay = {};
  events.forEach(e => { const [s, en] = clip(e.startStr, e.endStr, fromStr, `${y}-12-31`); eachDay(s, en).forEach(d => { perDay[d] = (perDay[d] || 0) + 1; }); });
  const tripDays = new Set();
  trips.forEach(t => { const [s, en] = clip(t.startStr, t.endStr, fromStr, `${y}-12-31`); eachDay(s, en).forEach(d => tripDays.add(d)); });
  const activeList = [...new Set([...Object.keys(perDay), ...tripDays])].sort();

  // 주 단위
  const perWeek = {};
  events.forEach(e => { const w = weekIndex(e.startStr, y); perWeek[w] = (perWeek[w] || 0) + 1; });
  let streak = { len: 0, from: null, to: null };
  let cur = { len: 0, from: null };
  const lastWeek = weekIndex(`${y}-12-31`, y);
  for (let w = 0; w <= lastWeek; w++) {
    if (perWeek[w]) { cur = cur.len ? { len: cur.len + 1, from: cur.from } : { len: 1, from: w }; if (cur.len > streak.len) streak = { len: cur.len, from: cur.from, to: w }; }
    else cur = { len: 0, from: null };
  }
  const weekStart = (w) => { const d = new Date(`${y}-01-01T00:00:00`); d.setDate(d.getDate() + w * 7 - weekday(`${y}-01-01`)); const s = getLocalDateStr(d); return s < fromStr ? fromStr : s; };
  const busyW = top(perWeek);

  // 가장 길게 빈 기간(활동한 날 사이)
  let gap = null;
  for (let i = 1; i < activeList.length; i++) {
    const g = dayDiff(activeList[i - 1], activeList[i]) - 1;
    if (!gap || g > gap.days) gap = { days: g, startStr: activeList[i - 1] };
  }

  const perMonth = {};
  events.forEach(e => { const m = monthOf(e.startStr); perMonth[m] = (perMonth[m] || 0) + 1; });
  const perWeekday = [0, 0, 0, 0, 0, 0, 0];
  events.forEach(e => { perWeekday[weekday(e.startStr)] += 1; });
  const planned = events.filter(e => e.createdAt).map(e => dayDiff(getLocalDateStr(e.createdAt), e.startStr)).filter(n => n >= 0);
  const busyMonth = top(perMonth);
  const topWd = perWeekday.indexOf(Math.max(...perWeekday));

  const elapsed = Math.max(1, dayDiff(fromStr, toStr) + 1);
  return {
    events, trips, perDay, tripDays, activeDays: activeList.length, elapsed,
    perWeekday, perMonth,
    busyMonth: busyMonth ? { month: Number(busyMonth[0]), count: busyMonth[1] } : null,
    topWeekday: events.length ? topWd : null,
    weeklyAvg: Math.round((events.length / (elapsed / 7)) * 10) / 10,
    streak: streak.len >= 2 ? { weeks: streak.len, fromMonth: monthOf(weekStart(streak.from)), toMonth: monthOf(weekStart(streak.to)) } : null,
    weekendPct: events.length ? Math.round((events.filter(e => [0, 6].includes(weekday(e.startStr))).length / events.length) * 100) : 0,
    gap: gap && gap.days >= 7 ? { days: gap.days, label: `${monthOf(gap.startStr)}월 ${partOfMonth(gap.startStr)}` } : null,
    busiestWeek: busyW && busyW[1] >= 2 ? { label: `${monthOf(weekStart(Number(busyW[0])))}월 ${Math.ceil(Number(weekStart(Number(busyW[0])).slice(8, 10)) / 7)}주`, count: busyW[1] } : null,
    planAhead: planned.length >= 5 ? Math.round(planned.reduce((s, n) => s + n, 0) / planned.length) : null,
    bucketsDone: data.buckets.filter(b => b.completed && inRange(b.completedStr, fromStr, `${y}-12-31`)),
    letters: data.letters.filter(l => l.createdAt && inRange(getLocalDateStr(l.createdAt), fromStr, `${y}-12-31`)),
  };
};

const tokenize = (title) => title.split(/[\s,./·!?~()[\]'"“”‘’\-+&@#:;]+/).map(w => w.trim()).filter(w => w.length >= 2 && !/^\d+$/.test(w));

export const buildYearRecap = (data, { year, coupleDoc, nameOf, today = new Date() }) => {
  const todayStr = getLocalDateStr(today);
  const st = yearStats(data, year, todayStr);
  if (st.events.length < YEAR_MIN_EVENTS) return null;
  const { fromStr, toStr } = yearRange(year);
  const ann = coupleDoc?.anniversaryDate || '';
  const refStr = toStr < todayStr ? toStr : todayStr;

  // 1. 표지
  const startYear = ann ? Number(ann.slice(0, 4)) : null;
  const members = coupleDoc?.members || [];
  const cover = {
    year,
    names: members.map(nameOf).filter(Boolean),
    dday: ann && ann <= refStr ? dayDiff(ann, refStr) + 1 : null,
    nth: startYear && startYear <= year ? year - startYear + 1 : null,
  };

  // 2. 한 해 캘린더
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const days = new Date(year, m, 0).getDate();
    return Array.from({ length: days }, (_, d) => {
      const s = `${year}-${String(m).padStart(2, '0')}-${String(d + 1).padStart(2, '0')}`;
      return st.tripDays.has(s) ? 'trip' : Math.min(3, st.perDay[s] || 0);
    });
  });
  const yearDays = dayDiff(fromStr, toStr) + 1;
  const first = st.events[0];
  const last = st.events[st.events.length - 1];
  const calendar = {
    months, activeDays: st.activeDays, pct: Math.round((st.activeDays / yearDays) * 100),
    weeklyAvg: st.weeklyAvg, streak: st.streak, weekendPct: st.weekendPct, gap: st.gap,
    busiestWeek: st.busiestWeek, planAhead: st.planAhead,
    first: { title: first.title, startStr: first.startStr },
    last: first.id === last.id ? null : { title: last.title, startStr: last.startStr },
  };

  // 6. 함께 맞은 날(달마다 한 장면에도 씀)
  const anns = anniversariesInRange(ann, fromStr, toStr).map(a => {
    const e = st.events.find(x => x.startStr === a.dateStr);
    return { dateStr: a.dateStr, badge: a.label.endsWith('일') ? `D+${a.label.slice(0, -1)}` : a.label, title: a.label.endsWith('일') ? `함께한 지 ${a.label}` : `${a.label} 기념일`, note: e?.title || '', kind: 'ann' };
  });
  const ddays = st.events.filter(e => e.isDday && !anns.some(a => a.dateStr === e.startStr))
    .map(e => ({ dateStr: e.startStr, badge: '디데이', title: e.title, note: '', kind: 'dday' }));
  const special = getSpecialDaysMap([year]);
  const coupleDays = [];
  special.forEach((list, dateStr) => {
    if (!inRange(dateStr, fromStr, toStr)) return;
    const e = st.events.find(x => x.startStr <= dateStr && x.endStr >= dateStr);
    if (!e) return; // 그날 커플 일정이 있던 이벤트데이만
    list.filter(x => x.type === 'couple').forEach(x => coupleDays.push({ dateStr, badge: x.name, title: x.name, note: e.title, kind: 'couple' }));
  });
  const momentItems = [...anns, ...ddays, ...coupleDays].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  const moments = momentItems.length ? { items: momentItems, annCount: anns.length + ddays.length, coupleCount: coupleDays.length } : null;

  // 3. 달마다 한 장면 — 여행 → 기념일 → 버킷 완료 → 가장 긴 일정
  const scenes = [];
  for (let m = 1; m <= 12; m++) {
    const mk = `${year}-${String(m).padStart(2, '0')}`;
    const trip = st.trips.find(t => t.startStr.startsWith(mk));
    const annM = momentItems.find(a => a.kind === 'ann' && a.dateStr.startsWith(mk));
    const bucket = st.bucketsDone.find(b => b.completedStr.startsWith(mk));
    const evs = st.events.filter(e => e.startStr.startsWith(mk))
      .sort((a, b) => dayDiff(b.startStr, b.endStr) - dayDiff(a.startStr, a.endStr) || a.startStr.localeCompare(b.startStr));
    let scene = null;
    if (trip) { const n = dayDiff(trip.startStr, trip.endStr); scene = { text: `${trip.title || trip.destination}${n > 0 ? ` ${n}박 ${n + 1}일` : ''}`, tag: '여행' }; }
    else if (annM) scene = { text: annM.note ? `${annM.title} · ${annM.note}` : annM.title, tag: '기념일' };
    else if (bucket) scene = { text: bucket.title, tag: '버킷 완료' };
    else if (evs[0]) scene = { text: evs[0].title, tag: st.busyMonth?.month === m ? '최다' : '일정' };
    if (scene) scenes.push({ month: m, ...scene });
  }
  const monthScenes = scenes.length >= 3 ? scenes : null;

  // 4. 여행
  const before = new Set(data.trips.filter(t => t.startStr < fromStr).map(t => t.destination).filter(Boolean));
  const tripsCard = st.trips.length ? {
    count: st.trips.length,
    days: st.tripDays.size,
    list: st.trips.slice().sort((a, b) => a.startStr.localeCompare(b.startStr)).map(t => ({ title: t.title || t.destination, startStr: t.startStr, nights: Math.max(0, dayDiff(t.startStr, t.endStr)) })),
    newPlaces: [...new Set(st.trips.map(t => t.destination).filter(d => d && !before.has(d)))],
    // 기분 점수(최고 5 ~ 별로 1) 평균이 가장 높은 여행 — '좋았어' 이상일 때만
    best: (() => {
      const b = st.trips.filter(t => t.moodScore >= 4).sort((x, y) => y.moodScore - x.moodScore || y.startStr.localeCompare(x.startStr))[0];
      return b ? { title: b.title || b.destination, quote: b.quote.length > 40 ? `${b.quote.slice(0, 40)}…` : b.quote } : null;
    })(),
  } : null;

  // 5. 이룬 버킷
  const cats = {};
  st.bucketsDone.forEach(b => { const n = b.category ? getCategoryDisplayName(b.category, coupleDoc?.customCategories) : '기타'; cats[n || '기타'] = (cats[n || '기타'] || 0) + 1; });
  const waits = st.bucketsDone.filter(b => b.createdAt).map(b => ({ title: b.title, days: dayDiff(getLocalDateStr(b.createdAt), b.completedStr) })).filter(w => w.days > 0).sort((a, b) => b.days - a.days);
  const buckets = st.bucketsDone.length ? {
    count: st.bucketsDone.length,
    titles: st.bucketsDone.slice(0, 4).map(b => b.title),
    categories: Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n })),
    longestWait: waits[0] || null,
  } : null;

  // 7. 편지 (제목·날짜만)
  const authors = members.map(uid => ({ uid, name: nameOf(uid), count: st.letters.filter(l => l.authorUid === uid).length })).filter(a => a.name && a.count);
  const sealedLong = st.letters.filter(l => l.isUnlocked && l.unlockedAt)
    .map(l => ({ title: l.title, days: dayDiff(getLocalDateStr(l.createdAt), getLocalDateStr(l.unlockedAt)) }))
    .filter(l => l.days > 0).sort((a, b) => b.days - a.days)[0] || null;
  const letters = st.letters.length ? { count: st.letters.length, titles: st.letters.map(l => l.title).filter(Boolean).slice(0, 2), authors, longest: sealedLong } : null;

  // 8. 키워드 + 계절
  const words = {};
  st.events.forEach(e => new Set(tokenize(e.title)).forEach(w => { words[w] = (words[w] || 0) + 1; }));
  const keywords = Object.entries(words).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 7).map(([word, n]) => ({ word, n }));
  const seasons = SEASONS.map(([name, ms]) => ({ name, n: st.events.filter(e => ms.includes(monthOf(e.startStr))).length }));
  const wordsCard = { keywords, seasons };

  // 9. 요일 + 가장 긴 메모
  const memo = st.events.filter(e => e.description.trim().length >= 40).sort((a, b) => b.description.length - a.description.length)[0];
  const habits = {
    perWeekday: st.perWeekday.map((n, i) => ({ day: WEEKDAYS[i], n })),
    topWeekday: WEEKDAYS[st.topWeekday],
    memo: memo ? { title: memo.title, startStr: memo.startStr, lines: memo.description.trim().split('\n').filter(Boolean).slice(0, 3), full: memo.description.trim(), length: memo.description.trim().length } : null,
  };

  // 10. 작년과 비교 (작년 5개 미만이면 건너뜀)
  const pv = yearStats(data, year - 1, todayStr);
  let compare = null;
  if (pv.events.length >= YEAR_MIN_EVENTS) {
    const changes = [];
    if (pv.busyMonth && st.busyMonth && pv.busyMonth.month !== st.busyMonth.month) changes.push({ label: '가장 바빴던 달', from: `${pv.busyMonth.month}월`, to: `${st.busyMonth.month}월` });
    if (pv.topWeekday != null && pv.topWeekday !== st.topWeekday) changes.push({ label: '자주 만난 요일', from: WEEKDAYS[pv.topWeekday], to: `${WEEKDAYS[st.topWeekday]}요일` });
    if (pv.planAhead != null && st.planAhead != null && pv.planAhead !== st.planAhead) changes.push({ label: '약속은 평균', from: `${pv.planAhead}일`, to: `${st.planAhead}일 전` });
    if (pv.gap && st.gap && pv.gap.days !== st.gap.days) changes.push({ label: '가장 길게 비었던 때', from: `${pv.gap.days}일`, to: `${st.gap.days}일` });
    const firsts = [
      ...(tripsCard?.newPlaces || []).slice(0, 2).map(p => `처음 간 ${p}`),
      ...st.bucketsDone.slice(0, 2).map(b => b.title),
    ].slice(0, 4);
    compare = {
      prevYear: year - 1,
      more: st.events.length >= pv.events.length,
      rows: [
        { label: '일정', a: pv.events.length, b: st.events.length },
        { label: '일정 있던 날', a: pv.activeDays, b: st.activeDays },
        { label: '여행한 날', a: pv.tripDays.size, b: st.tripDays.size },
        { label: '이룬 버킷', a: pv.bucketsDone.length, b: st.bucketsDone.length },
        { label: '편지', a: pv.letters.length, b: st.letters.length },
      ].filter(r => r.a || r.b),
      changes,
      firsts,
    };
  }

  // 11. 한 장 요약
  const summary = {
    year, dday: cover.dday, refStr,
    rows: [
      { label: '함께한 일정', value: `${st.events.length}개` },
      { label: '일정 있던 날', value: `${st.activeDays}일` },
      st.trips.length ? { label: '여행', value: `${st.trips.length}번 · ${st.tripDays.size}일` } : null,
      st.bucketsDone.length ? { label: '이룬 버킷', value: `${st.bucketsDone.length}개` } : null,
      st.letters.length ? { label: '봉인 편지', value: `${st.letters.length}통` } : null,
      keywords[0] ? { label: '올해의 말', value: keywords[0].word } : null,
      { label: '자주 만난 요일', value: `${WEEKDAYS[st.topWeekday]}요일` },
    ].filter(Boolean),
  };

  return { year, cover, calendar, monthScenes, trips: tripsCard, buckets, moments, letters, words: wordsCard, habits, compare, summary };
};

/** 랩업을 볼 수 있는 연도(일정 5개 이상, 올해는 12월부터) — 지난 요약 목록용 */
export const listRecapYears = (data, today = new Date()) => {
  const y = today.getFullYear();
  const counts = {};
  data.events.forEach(e => { const k = Number(e.startStr.slice(0, 4)); counts[k] = (counts[k] || 0) + 1; });
  return Object.keys(counts).map(Number)
    .filter(k => counts[k] >= YEAR_MIN_EVENTS && (k < y || (k === y && today.getMonth() === 11)))
    .sort((a, b) => b - a);
};
