import { describe, it, expect } from 'vitest';
import { generateOccurrenceDates, RecurrenceLimitError } from './recurrenceRules';

describe('generateOccurrenceDates — 반복 일정 날짜', () => {
  it('매일 3번', () => {
    expect(generateOccurrenceDates({ freq: 'daily', endType: 'count', count: 3 }, '2026-11-29'))
      .toEqual(['2026-11-29', '2026-11-30', '2026-12-01']);
  });

  it('매주 월·수, 종료일 포함', () => {
    expect(generateOccurrenceDates({ freq: 'weekly', byWeekday: [1, 3], endType: 'date', until: '2026-11-18' }, '2026-11-09'))
      .toEqual(['2026-11-09', '2026-11-11', '2026-11-16', '2026-11-18']);
  });

  it('매월 31일 → 짧은 달은 말일로', () => {
    expect(generateOccurrenceDates({ freq: 'monthly', endType: 'count', count: 4 }, '2026-01-31'))
      .toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('매년 2/29 → 평년은 2/28', () => {
    expect(generateOccurrenceDates({ freq: 'yearly', endType: 'count', count: 3 }, '2024-02-29'))
      .toEqual(['2024-02-29', '2025-02-28', '2026-02-28']);
  });

  it('50개를 넘으면 RecurrenceLimitError', () => {
    expect(() => generateOccurrenceDates({ freq: 'daily', endType: 'count', count: 60 }, '2026-01-01'))
      .toThrow(RecurrenceLimitError);
  });

  it('시작일 없으면 빈 배열', () => {
    expect(generateOccurrenceDates({ freq: 'daily', endType: 'count', count: 3 }, '')).toEqual([]);
  });
});
