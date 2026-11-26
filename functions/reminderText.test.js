import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const { getMilestoneEvents, COUPLE_DAYS } = createRequire(import.meta.url)('./reminderText.js');

describe('getMilestoneEvents — 기념일 알림 문구(B안)', () => {
  it('100일·200일·1000일은 날마다 다른 문구', () => {
    expect(getMilestoneEvents('2024-01-01', '2024-04-09')[0]).toMatchObject({ name: '100일', body: '함께한 지 100일, 시작이 좋아요' });
    expect(getMilestoneEvents('2024-01-01', '2024-07-18')[0].name).toBe('200일');
    expect(getMilestoneEvents('2024-01-01', '2026-09-26')[0]).toMatchObject({ name: '1000일', body: '1000일, 숫자만 봐도 뿌듯한 날' });
  });
  it('n주년 + 하루 전 공통 문구', () => {
    expect(getMilestoneEvents('2024-01-01', '2025-01-01')[0]).toMatchObject({ name: '1주년', tomorrowBody: '미리 준비해 볼까요?' });
    expect(getMilestoneEvents('2020-01-01', '2026-01-01')[0]).toMatchObject({ name: '6주년', body: '6주년을 축하해요' });
  });
  it('기념일 없으면 이벤트데이만', () => {
    expect(getMilestoneEvents(null, '2026-11-11')).toEqual([{ name: '빼빼로데이', body: expect.any(String) }]);
    expect(getMilestoneEvents('2024-01-02', '2026-03-05')).toEqual([]);
  });
  it('COUPLE_DAYS는 화면용 목록(utils/koreanHolidays.js)과 날짜가 같음', async () => {
    const src = await import('../src/utils/koreanHolidays.js');
    const map = src.getSpecialDaysMap([2026]);
    COUPLE_DAYS.forEach(({ month, day, name }) => {
      const key = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      expect((map.get(key) || []).some(x => x.name === name)).toBe(true);
    });
  });
});
