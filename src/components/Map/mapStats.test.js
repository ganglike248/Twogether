import { describe, it, expect } from 'vitest';
import { computeMapStats, level } from './mapStats';

const today = new Date('2026-11-20T12:00:00');

describe('computeMapStats — 우리 지도 집계', () => {
  const trips = [
    { id: 'a', startDate: '2026-08-01', regions: [{ sido: '51', sgg: '51210' }, { sido: '51', sgg: '51830' }] },
    { id: 'b', startDate: '2026-10-01', regions: [{ sido: '51', sgg: '51210' }] },
    { id: 'c', startDate: '2026-12-24', regions: [{ sido: '50', sgg: '50110' }] }, // 앞으로 갈 여행 — 칠하지 않음
    { id: 'd', startDate: '2026-05-01', regions: [] }, // 지역 없는 지난 여행
  ];
  const s = computeMapStats(trips, today);
  it('같은 시·도는 여행 단위로 셈', () => expect(s.sidoCounts).toEqual({ 51: 2 }));
  it('시·군·구 횟수', () => expect(s.sggCounts).toEqual({ 51210: 2, 51830: 1 }));
  it('예정·지역 없음 분류', () => {
    expect(s.upcoming.map(t => t.id)).toEqual(['c']);
    expect(s.unregioned.map(t => t.id)).toEqual(['d']);
  });
  it('색 단계는 3번 이상에서 멈춤', () => expect([0, 1, 2, 3, 7].map(level)).toEqual([0, 1, 2, 3, 3]));
});
