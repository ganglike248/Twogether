// src/utils/koreanHolidays.js
// korean-lunar-calendar 패키지를 이용해 음력 → 양력 변환
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { getLocalDateStr } from './dataUtils';

const pad = (n) => String(n).padStart(2, '0');

const FIXED_HOLIDAYS = [
  { month: 1,  day: 1,  name: '신정' },
  { month: 3,  day: 1,  name: '삼일절' },
  { month: 5,  day: 5,  name: '어린이날' },
  { month: 6,  day: 6,  name: '현충일' },
  { month: 8,  day: 15, name: '광복절' },
  { month: 10, day: 3,  name: '개천절' },
  { month: 10, day: 9,  name: '한글날' },
  { month: 12, day: 25, name: '크리스마스' },
];

const COUPLE_DAYS = [
  { month: 1,  day: 14, name: '다이어리데이' },
  { month: 2,  day: 14, name: '발렌타인데이' },
  { month: 3,  day: 14, name: '화이트데이' },
  { month: 4,  day: 14, name: '블랙데이' },
  { month: 5,  day: 14, name: '로즈데이' },
  { month: 6,  day: 14, name: '키스데이' },
  { month: 7,  day: 14, name: '실버데이' },
  { month: 8,  day: 14, name: '그린데이' },
  { month: 9,  day: 14, name: '포토데이' },
  { month: 10, day: 14, name: '와인데이' },
  { month: 11, day: 11, name: '빼빼로데이' },
  { month: 11, day: 14, name: '무비데이' },
  { month: 12, day: 14, name: '허그데이' },
  { month: 12, day: 24, name: '크리스마스 이브' },
];

const cal = new KoreanLunarCalendar();

const lunarToDate = (lunarYear, lunarMonth, lunarDay) => {
  cal.setLunarDate(lunarYear, lunarMonth, lunarDay, false);
  const s = cal.getSolarCalendar();
  return new Date(s.year, s.month - 1, s.day);
};

const dateToStr = getLocalDateStr;

const shiftDate = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

// 대체공휴일 적용 시작 연도(하루짜리 공휴일). 신정·현충일은 대체공휴일 없음
const SUBSTITUTE_FROM = {
  '삼일절': 2021, '어린이날': 2014, '광복절': 2021, '개천절': 2021, '한글날': 2021,
  '부처님 오신 날': 2023, '크리스마스': 2023,
};
const LONG_HOLIDAY_FROM = 2014; // 설날·추석 연휴(일요일과 겹치거나 다른 공휴일과 겹칠 때)

const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

/**
 * 그해 공휴일 목록(entries: {date, str, name, group})으로 대체공휴일 날짜를 계산.
 * - 설날·추석: 연휴 중 일요일이 있거나 다른 공휴일과 겹치면 연휴 다음 첫 평일 하루
 * - 하루짜리: 토·일이거나 다른 공휴일과 겹치면 다음 첫 평일(겹친 개수만큼)
 * 반환: [{ str, name }]
 */
export const computeSubstituteHolidays = (year, entries) => {
  const taken = new Set(entries.map((e) => e.str));
  const result = [];
  const pickAfter = (from, name) => {
    const d = new Date(from);
    do { d.setDate(d.getDate() + 1); } while (isWeekend(d) || taken.has(dateToStr(d)));
    const str = dateToStr(d);
    taken.add(str);
    result.push({ str, name });
  };
  const groupsOn = (str) => new Set(entries.filter((e) => e.str === str).map((e) => e.group));
  const isLong = (e) => e.group === 'seollal' || e.group === 'chuseok';

  if (year >= LONG_HOLIDAY_FROM) {
    [['seollal', '설날'], ['chuseok', '추석']].forEach(([group, label]) => {
      const days = entries.filter((e) => e.group === group).sort((a, b) => a.date - b.date);
      if (!days.length) return;
      const hit = days.some((e) => e.date.getDay() === 0 || groupsOn(e.str).size > 1);
      if (hit) pickAfter(days[days.length - 1].date, `대체공휴일(${label})`);
    });
  }

  const eligibleOf = (list) => list.filter((e) => !isLong(e) && SUBSTITUTE_FROM[e.name] && year >= SUBSTITUTE_FROM[e.name]);
  const dates = [...new Set(eligibleOf(entries).map((e) => e.str))].sort();
  dates.forEach((str) => {
    const onDay = entries.filter((e) => e.str === str);
    if (onDay.some(isLong)) return; // 연휴와 겹친 건 위에서 한 번만 셈
    const eligible = eligibleOf(onDay);
    const n = isWeekend(eligible[0].date) ? eligible.length : onDay.length - 1;
    for (let i = 0; i < n; i++) pickAfter(eligible[0].date, `대체공휴일(${eligible[i % eligible.length].name})`);
  });
  return result;
};

// Map<'YYYY-MM-DD', Array<{name, type: 'holiday' | 'couple'}>>
export const getSpecialDaysMap = (years) => {
  const map = new Map();

  const add = (dateStr, name, type) => {
    if (!map.has(dateStr)) map.set(dateStr, []);
    const arr = map.get(dateStr);
    if (!arr.some((e) => e.name === name)) arr.push({ name, type });
  };

  for (const year of years) {
    const entries = []; // 대체공휴일 계산용
    const addHoliday = (date, name, group = name) => {
      const str = dateToStr(date);
      add(str, name, 'holiday');
      entries.push({ date, str, name, group });
    };

    // 고정 공휴일
    for (const h of FIXED_HOLIDAYS) {
      addHoliday(new Date(year, h.month - 1, h.day), h.name);
    }

    // 설날 (음력 1/1): 전날·당일·다음날
    try {
      const seollal = lunarToDate(year, 1, 1);
      addHoliday(shiftDate(seollal, -1), '설날 연휴', 'seollal');
      addHoliday(seollal, '설날', 'seollal');
      addHoliday(shiftDate(seollal, 1), '설날 연휴', 'seollal');
    } catch { /* 음력 변환 범위 밖인 해는 건너뜀 */ }

    // 추석 (음력 8/15): 전날·당일·다음날
    try {
      const chuseok = lunarToDate(year, 8, 15);
      addHoliday(shiftDate(chuseok, -1), '추석 연휴', 'chuseok');
      addHoliday(chuseok, '추석', 'chuseok');
      addHoliday(shiftDate(chuseok, 1), '추석 연휴', 'chuseok');
    } catch { /* 음력 변환 범위 밖인 해는 건너뜀 */ }

    // 부처님 오신 날 (음력 4/8)
    try {
      const buddha = lunarToDate(year, 4, 8);
      addHoliday(buddha, '부처님 오신 날');
    } catch { /* 음력 변환 범위 밖인 해는 건너뜀 */ }

    computeSubstituteHolidays(year, entries).forEach(({ str, name }) => add(str, name, 'holiday'));

    // 커플 기념일
    for (const c of COUPLE_DAYS) {
      add(`${year}-${pad(c.month)}-${pad(c.day)}`, c.name, 'couple');
    }
  }

  return map;
};
