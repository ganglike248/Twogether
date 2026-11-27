import { describe, it, expect } from 'vitest';
import { getSpecialDaysMap } from './koreanHolidays';

const names = (map, d) => (map.get(d) || []).map((s) => s.name);

describe('대체공휴일', () => {
  it('2026년: 삼일절·부처님 오신 날(일), 광복절·개천절(토)', () => {
    const m = getSpecialDaysMap([2026]);
    expect(names(m, '2026-03-02')).toContain('대체공휴일(삼일절)');
    expect(names(m, '2026-05-25')).toContain('대체공휴일(부처님 오신 날)');
    expect(names(m, '2026-08-17')).toContain('대체공휴일(광복절)');
    expect(names(m, '2026-10-05')).toContain('대체공휴일(개천절)');
    // 추석 연휴가 토요일에 걸쳐도 대체공휴일 없음
    expect([...m.values()].flat().filter((s) => s.name === '대체공휴일(추석)')).toHaveLength(0);
  });

  it('2025년: 어린이날·부처님 오신 날 겹침 → 하루, 추석 연휴 일요일 → 하루', () => {
    const m = getSpecialDaysMap([2025]);
    expect(names(m, '2025-05-06')).toContain('대체공휴일(어린이날)');
    expect(names(m, '2025-05-07')).toEqual([]);
    expect(names(m, '2025-10-08')).toContain('대체공휴일(추석)');
  });

  it('적용 전 연도에는 없음(2020년 광복절 토요일)', () => {
    const m = getSpecialDaysMap([2020]);
    expect(names(m, '2020-08-17')).toEqual([]);
  });
});
