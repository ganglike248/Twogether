import { describe, it, expect } from 'vitest';
import { monthRange, addMonths, dayDiff, overlaps, eachDay, anniversariesInRange } from './recapDates';

describe('recapDates', () => {
  it('monthRange: 2월 윤년', () => {
    expect(monthRange(2024, 2)).toEqual({ fromStr: '2024-02-01', toStr: '2024-02-29', days: 29 });
  });
  it('addMonths: 해 넘김', () => {
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
  it('dayDiff·overlaps·eachDay', () => {
    expect(dayDiff('2026-02-27', '2026-03-01')).toBe(2);
    expect(overlaps('2026-01-30', '2026-02-02', '2026-02-01', '2026-02-28')).toBe(true);
    expect(eachDay('2026-12-30', '2027-01-01')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01']);
  });
  it('anniversariesInRange: 100일은 시작일=1일째, 주년', () => {
    expect(anniversariesInRange('2024-01-01', '2024-04-01', '2024-04-30')).toEqual([{ dateStr: '2024-04-09', label: '100일' }]);
    expect(anniversariesInRange('2024-01-01', '2025-01-01', '2025-01-01')).toEqual([{ dateStr: '2025-01-01', label: '1주년' }]);
    expect(anniversariesInRange(null, '2025-01-01', '2025-12-31')).toEqual([]);
  });
});
