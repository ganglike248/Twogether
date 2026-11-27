import { describe, it, expect } from 'vitest';
import { sortTopics, splitRounds, summarizeRound, freshOption, carryOverCandidates, pickHomeTopic, lastResultAfterRemoving } from './dailyDecisionLogic';

describe('같이 정해요 — 주제·판 계산', () => {
  it('주제는 정하는 중 → 지난 주제(최근 정한 순)', () => {
    const { live, past } = sortTopics([
      { id: 'a', currentRoundId: null, lastResult: { atMs: 10 } },
      { id: 'b', currentRoundId: 'r', updatedAtMs: 5 },
      { id: 'c', currentRoundId: null, lastResult: { atMs: 30 } },
      { id: 'd', currentRoundId: 'r2', updatedAtMs: 9 },
    ]);
    expect(live.map((t) => t.id)).toEqual(['d', 'b']);
    expect(past.map((t) => t.id)).toEqual(['c', 'a']);
    expect(pickHomeTopic([{ id: 'x', currentRoundId: null }])).toBeNull();
  });

  it('판은 지금 판과 지난 판(최근 먼저)으로 나눈다', () => {
    const { current, history } = splitRounds([
      { id: 'r1', status: 'decided', decidedAtMs: 1 },
      { id: 'r3', status: 'deciding' },
      { id: 'r2', status: 'decided', decidedAtMs: 2 },
    ], 'r3');
    expect(current.id).toBe('r3');
    expect(history.map((r) => r.id)).toEqual(['r2', 'r1']);
  });

  it('판 요약 — 내 평가 남은 수·상대 평가 여부', () => {
    const s = summarizeRound({ options: [
      { title: 'A', scores: [{ userId: 'me', score: 3 }] },
      { title: 'B', scores: [{ userId: 'you', score: 4 }] },
      { title: 'C' },
    ] }, 'me');
    expect(s).toEqual({ count: 3, unscoredByMe: 2, partnerScored: true, titles: ['A', 'B', 'C'] });
  });

  it('새 판 후보는 평가·확정을 비우고 사진·가격은 남긴다', () => {
    const o = freshOption({ id: 'o1', title: '초밥', price: '18,000', images: ['x'], scores: [{ userId: 'a', score: 5 }], totalScore: 5, isDecided: true, isFavorite: true }, 'n1');
    expect(o).toEqual({ id: 'n1', title: '초밥', url: '', address: '', description: '', price: '18,000', images: ['x'], scores: [], totalScore: 0 });
  });

  it('지난 후보 불러오기 — 바로 전 판은 체크, 이름이 같으면 한 번만', () => {
    const list = carryOverCandidates([
      { id: 'r2', decidedOptionId: 'a2', options: [{ id: 'a2', title: '김치찌개' }, { id: 'b2', title: '초밥' }] },
      { id: 'r1', decidedOptionId: 'c1', options: [{ id: 'a1', title: '김치찌개 ' }, { id: 'c1', title: '수제버거' }] },
    ]);
    expect(list.map((x) => [x.option.title, x.checked, x.note])).toEqual([
      ['김치찌개', true, '지난번 고름'],
      ['초밥', true, ''],
      ['수제버거', false, '2번 전 후보'],
    ]);
  });

  it('지난 판을 지우면 마지막 결과는 남은 것 중 최근 것', () => {
    const history = [{ id: 'r2', decidedTitle: 'B', decidedAtMs: 2 }, { id: 'r1', decidedTitle: 'A', decidedAtMs: 1, viaWheel: true }];
    expect(lastResultAfterRemoving(history, 'r2')).toEqual({ title: 'A', roundId: 'r1', atMs: 1, viaWheel: true });
    expect(lastResultAfterRemoving(history.slice(1), 'r1')).toBeNull();
  });
});
