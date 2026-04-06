// src/utils/koreanHolidays.js
// korean-lunar-calendar 패키지를 이용해 음력 → 양력 변환
import KoreanLunarCalendar from 'korean-lunar-calendar';

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

const dateToStr = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const shiftDate = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
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
    // 고정 공휴일
    for (const h of FIXED_HOLIDAYS) {
      add(`${year}-${pad(h.month)}-${pad(h.day)}`, h.name, 'holiday');
    }

    // 설날 (음력 1/1): 전날·당일·다음날
    try {
      const seollal = lunarToDate(year, 1, 1);
      add(dateToStr(shiftDate(seollal, -1)), '설날 연휴', 'holiday');
      add(dateToStr(seollal), '설날', 'holiday');
      add(dateToStr(shiftDate(seollal, 1)), '설날 연휴', 'holiday');
    } catch (_) {}

    // 추석 (음력 8/15): 전날·당일·다음날
    try {
      const chuseok = lunarToDate(year, 8, 15);
      add(dateToStr(shiftDate(chuseok, -1)), '추석 연휴', 'holiday');
      add(dateToStr(chuseok), '추석', 'holiday');
      add(dateToStr(shiftDate(chuseok, 1)), '추석 연휴', 'holiday');
    } catch (_) {}

    // 부처님 오신 날 (음력 4/8)
    try {
      const buddha = lunarToDate(year, 4, 8);
      add(dateToStr(buddha), '부처님 오신 날', 'holiday');
    } catch (_) {}

    // 커플 기념일
    for (const c of COUPLE_DAYS) {
      add(`${year}-${pad(c.month)}-${pad(c.day)}`, c.name, 'couple');
    }
  }

  return map;
};
