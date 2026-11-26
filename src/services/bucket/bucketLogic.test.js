import { describe, it, expect } from 'vitest';
import {
  bucketKind, isAchieved, isActive, doneCountOf, rankSuggestions, getPendingBucketChecks, bucketMetaText,
  doneFields, removeHistoryFields, uncompleteFields, changeCompletedDateFields, kindChangeFields, expandRepeatForRecap,
  createdDateStr, isFutureDate, weekendChoices,
} from './bucketLogic';

const TODAY = '2026-11-26';

describe('bucketLogic — 종류·상태', () => {
  it('kind 없는 예전 문서는 한 번 해볼 것', () => {
    expect(bucketKind({ title: '캠핑' })).toBe('once');
    expect(bucketKind({ kind: 'repeat' })).toBe('repeat');
  });
  it('또 할 것은 completed여도 이룬 것으로 안 감', () => {
    expect(isAchieved({ completed: true })).toBe(true);
    expect(isAchieved({ kind: 'repeat', completed: true })).toBe(false);
    expect(isActive({ kind: 'repeat' })).toBe(true);
  });
  it('횟수는 doneCount와 기록 수 중 큰 값', () => {
    expect(doneCountOf({ doneCount: 1, history: [{}, {}] })).toBe(2);
    expect(doneCountOf({})).toBe(0);
  });
  it('createdAt ISO는 로컬 날짜로(KST 자정 밀림 없음)', () => {
    expect(createdDateStr({ createdAt: '2026-11-25T15:30:00.000Z' })).toBe('2026-11-26');
  });
  it('주말 빠른 선택', () => {
    expect(weekendChoices('2026-11-26')).toEqual({ thisWeekend: '2026-11-28', nextWeekend: '2026-12-05' }); // 목
    expect(weekendChoices('2026-11-28')).toEqual({ thisWeekend: '2026-11-28', nextWeekend: '2026-12-05' }); // 토
    expect(weekendChoices('2026-11-29')).toEqual({ thisWeekend: '2026-11-29', nextWeekend: '2026-12-05' }); // 일
  });
  it('미래 날짜 판정(오늘은 허용)', () => {
    expect(isFutureDate('2026-11-27', TODAY)).toBe(true);
    expect(isFutureDate(TODAY, TODAY)).toBe(false);
  });
});

describe('bucketLogic — 추천·했어요? 카드', () => {
  const list = [
    { id: 'a', createdAt: '2026-01-01T00:00:00', title: '오래된 것' },
    { id: 'b', createdAt: '2026-10-01T00:00:00', likes: { u1: true, u2: true } },
    { id: 'c', kind: 'repeat', createdAt: '2025-01-01T00:00:00', lastDoneAt: '2026-11-20' },
    { id: 'd', createdAt: '2025-01-01T00:00:00', plannedDate: '2026-11-20' },
    { id: 'e', createdAt: '2025-01-01T00:00:00', completed: true },
  ];
  it('둘 다 ♥ > 오래 기다린 것, 계획·이룬 것 제외', () => {
    expect(rankSuggestions(list).map(b => b.id)).toEqual(['b', 'a', 'c']);
  });
  it('지난 계획만 했어요? 카드', () => {
    expect(getPendingBucketChecks(list, TODAY).map(b => b.id)).toEqual(['d']);
    expect(getPendingBucketChecks(list, '2026-11-20')).toEqual([]);
  });
  it('카드 한 줄', () => {
    expect(bucketMetaText({ createdAt: '2026-11-16T09:00:00' }, TODAY)).toBe('담은 지 10일');
    expect(bucketMetaText({ kind: 'repeat', doneCount: 3, lastDoneAt: '2026-11-02' }, TODAY)).toBe('3번 · 2026-11-02');
    expect(bucketMetaText({ kind: 'repeat' }, TODAY)).toBe('아직 안 해봤어요');
    expect(bucketMetaText({ plannedDate: TODAY }, TODAY)).toBe('오늘 하기로 했어요');
  });
});

describe('bucketLogic — 저장 내용', () => {
  it('했어요: once는 이룸, repeat는 마지막 날짜만(늦은 날짜 유지), 계획 해제', () => {
    expect(doneFields({}, TODAY)).toEqual({ plannedEventId: null, plannedDate: null, completed: true, completedAt: TODAY });
    expect(doneFields({ kind: 'repeat', lastDoneAt: '2026-11-30' }, TODAY).lastDoneAt).toBe('2026-11-30');
    expect(doneFields({ kind: 'repeat', lastDoneAt: '2026-01-01' }, TODAY).lastDoneAt).toBe(TODAY);
  });
  it('기록 지우기 → 횟수·마지막 날짜 재계산', () => {
    const b = { history: [{ date: '2026-01-01', at: 1 }, { date: '2026-03-01', at: 2 }] };
    expect(removeHistoryFields(b, 2)).toEqual({ history: [{ date: '2026-01-01', at: 1 }], doneCount: 1, lastDoneAt: '2026-01-01' });
    expect(removeHistoryFields({ history: [{ date: 'x', at: 1 }] }, 1).lastDoneAt).toBeNull();
  });
  it('되돌리기·날짜 고치기는 같은 날짜 기록도 같이', () => {
    const b = { completed: true, completedAt: '2026-05-05', history: [{ date: '2026-05-05', at: 1 }] };
    expect(uncompleteFields(b)).toEqual({ completed: false, completedAt: null, history: [] });
    expect(changeCompletedDateFields(b, '2026-05-06').history[0].date).toBe('2026-05-06');
  });
  it('종류 바꾸기', () => {
    const once = { completed: true, completedAt: '2026-05-05', createdBy: 'u1' };
    const r = kindChangeFields(once, 'repeat');
    expect(r).toMatchObject({ kind: 'repeat', completed: false, completedAt: null, doneCount: 1, lastDoneAt: '2026-05-05' });
    expect(kindChangeFields({ kind: 'repeat', doneCount: 2, lastDoneAt: '2026-06-01' }, 'once'))
      .toEqual({ kind: 'once', completed: true, completedAt: '2026-06-01' });
    expect(kindChangeFields({ kind: 'repeat' }, 'once')).toEqual({ kind: 'once', completed: false, completedAt: null });
    expect(kindChangeFields(once, 'once')).toEqual({});
  });
  it('요약용: 또 할 것 기록을 이룬 것으로 펼침', () => {
    const out = expandRepeatForRecap([
      { id: 'a', completed: true, completedStr: '2026-01-01' },
      { id: 'r', kind: 'repeat', history: [{ date: '2026-02-01' }, { date: '2026-03-01' }] },
    ]);
    expect(out.map(b => [b.id, b.completed, b.completedStr])).toEqual([
      ['a', true, '2026-01-01'], ['r', false, ''], ['r_0', true, '2026-02-01'], ['r_1', true, '2026-03-01'],
    ]);
  });
});
