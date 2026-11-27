import { describe, it, expect } from 'vitest';
import { buildLogLookup, getLogTitle, getLogDate, getChangeRows, getLogSummary } from './editLogFormat';

const typeName = (t) => ({ couple: '데이트', boyfriend: '민수', girlfriend: '지아' }[t] || '일정');

describe('수정기록 문구', () => {
  it('바뀐 항목에 이름을 붙이고 날짜·종류·디데이를 읽기 쉽게 바꾼다', () => {
    const rows = getChangeRows({
      id: { from: null, to: 'e1' },
      title: { from: '영화', to: '영화 보기' },
      start: { from: '2026-11-27T00:00:00', to: '2026-11-28T00:00:00' },
      end: { from: '2026-11-27T23:59:59', to: '2026-11-30T00:00:00' },
      eventType: { from: 'couple', to: 'girlfriend' },
      isDday: { from: true, to: false },
    }, typeName);
    expect(rows).toEqual([
      { label: '제목', from: '영화', to: '영화 보기' },
      { label: '날짜', from: '2026년 11월 27일', to: '2026년 11월 28일 ~ 2026년 11월 29일' },
      { label: '종류', from: '데이트', to: '지아' },
      { label: '디데이', from: '켬', to: '끔' },
    ]);
  });

  it('종료일만 바뀌면 마지막 날로 보여 준다', () => {
    const rows = getChangeRows({ end: { from: '2026-11-27T23:59:59', to: '2026-11-29T00:00:00' } }, typeName);
    expect(rows).toEqual([{ label: '종료일', from: '2026년 11월 27일', to: '2026년 11월 28일' }]);
  });

  it('제목이 바뀐 기록은 새 제목을, 지워진 일정은 다른 기록에서 제목·날짜를 찾는다', () => {
    const logs = [
      { id: 'l2', eventId: 'e1', action: 'updated', changes: { title: { from: 'A', to: 'B' } } },
      { id: 'l1', eventId: 'e1', action: 'created', changes: { title: 'A', start: '2026-11-27T00:00:00', end: '2026-11-27T23:59:59' } },
      { id: 'l0', eventId: 'x', action: 'updated', changes: { description: { from: '', to: '메모' } } },
    ];
    const lookup = buildLogLookup(logs, []);
    expect(getLogTitle(logs[0], lookup)).toBe('B');
    expect(getLogDate(logs[0], lookup)).toBe('2026년 11월 27일');
    expect(getLogTitle(logs[2], lookup)).toBe('지워진 일정');
    expect(getLogDate(logs[2], lookup)).toBe('');
  });

  it('요약에 누가 했는지 넣는다', () => {
    expect(getLogSummary({ action: 'created' }, [], '지아')).toBe('지아님이 새 일정을 만들었어요');
    expect(getLogSummary({ action: 'updated' }, [{ label: '제목' }, { label: '날짜' }], '')).toBe('제목·날짜 바꿨어요');
    expect(getLogSummary({ action: 'recurrence_deleted', changes: { deletedCount: 3 } }, [], '민수')).toBe('민수님이 반복 일정 3개를 지웠어요');
  });
});
