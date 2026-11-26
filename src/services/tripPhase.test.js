import { describe, it, expect } from 'vitest';
import { getTripPhase, getTripDayCount, getOverflowSchedules } from './tripPhase';

describe('tripPhase', () => {
  const trip = { startDate: '2026-11-26', endDate: '2026-11-28' };
  it('날짜로 상태 계산(시작·종료일 포함)', () => {
    expect(getTripPhase(trip, '2026-11-25')).toBe('upcoming');
    expect(getTripPhase(trip, '2026-11-26')).toBe('ongoing');
    expect(getTripPhase(trip, '2026-11-28')).toBe('ongoing');
    expect(getTripPhase(trip, '2026-11-29')).toBe('past');
    expect(getTripPhase({ startDate: '2026-11-26' }, '2026-11-27')).toBe('past');
    expect(getTripPhase({}, '2026-11-27')).toBe('upcoming');
  });
  it('저장된 status는 무시', () => {
    expect(getTripPhase({ ...trip, status: 'planning' }, '2026-12-10')).toBe('past');
  });
  it('일수', () => {
    expect(getTripDayCount('2026-11-26', '2026-11-28')).toBe(3);
    expect(getTripDayCount('2026-11-26', '2026-11-26')).toBe(1);
    expect(getTripDayCount('2026-11-28', '2026-11-26')).toBe(1);
  });
  it('기간을 줄일 때 잘리는 일정', () => {
    const docs = [{ day: 1, schedules: [{}] }, { day: 3, schedules: [{}, {}] }, { day: 4, schedules: [] }, { day: 5, schedules: [{}] }];
    expect(getOverflowSchedules(docs, 2)).toEqual({ days: [3, 5], count: 3 });
    expect(getOverflowSchedules(docs, 5)).toEqual({ days: [], count: 0 });
  });
});
