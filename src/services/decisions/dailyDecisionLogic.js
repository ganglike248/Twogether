// src/services/decisions/dailyDecisionLogic.js
// 일상 결정(같이 정해요) 계산 — Firebase 의존 없는 순수 함수(테스트: dailyDecisionLogic.test.js).
// 주제(decisions/{id})는 계속 다시 쓰고, 정할 때마다 한 판(rounds/{id})이 쌓임.
// 후보 모양은 여행 후보와 같음 { id, title, url, address, description, price, images, scores[{userId,score,comment}], totalScore, isFavorite }

const titleKey = (t) => String(t || '').trim().toLowerCase();

/** 주제 목록 정렬 — 정하는 중(최근 바뀐 순) → 지난 주제(최근 정한 순, 오래 안 쓴 건 아래) */
export const sortTopics = (topics = []) => {
  const live = topics.filter((t) => t.currentRoundId);
  const rest = topics.filter((t) => !t.currentRoundId);
  const by = (key) => (a, b) => (b[key] || 0) - (a[key] || 0);
  return {
    live: [...live].sort(by('updatedAtMs')),
    past: [...rest].sort((a, b) => (b.lastResult?.atMs || b.updatedAtMs || 0) - (a.lastResult?.atMs || a.updatedAtMs || 0)),
  };
};

/** 판 목록 → 지금 판(정하는 중)과 지난 판(정한 순, 최근 먼저) */
export const splitRounds = (rounds = [], currentRoundId = null) => {
  const current = rounds.find((r) => r.id === currentRoundId && r.status !== 'decided') || null;
  const history = rounds
    .filter((r) => r.status === 'decided')
    .sort((a, b) => (b.decidedAtMs || 0) - (a.decidedAtMs || 0));
  return { current, history };
};

/** 판 요약(홈 카드·목록용) — 후보 수, 내가 아직 평가 안 한 후보 수, 상대가 평가한 후보가 있는지 */
export const summarizeRound = (round, myUid) => {
  const options = round?.options || [];
  const scoredBy = (opt, pred) => (opt.scores || []).some((s) => pred(s.userId));
  return {
    count: options.length,
    unscoredByMe: options.filter((o) => !scoredBy(o, (u) => u === myUid)).length,
    partnerScored: options.some((o) => scoredBy(o, (u) => u !== myUid)),
    titles: options.map((o) => o.title),
  };
};

/** 새 판으로 가져갈 때 후보를 깨끗하게 — 사진·링크·가격은 두고 평가·확정·즐겨찾기는 비움 */
export const freshOption = (option, newId) => ({
  id: newId,
  title: option.title,
  url: option.url || '',
  address: option.address || '',
  description: option.description || '',
  price: option.price || '',
  images: option.images || [],
  scores: [],
  totalScore: 0,
});

/**
 * '새로 정하기'에 보여 줄 지난 후보 — 같은 이름은 한 번만(가장 최근 판의 것).
 * 바로 전 판의 후보는 체크된 채로, 그 전 판에만 있던 후보는 체크 안 된 채로. 최대 max개.
 * 반환: [{ key, option, checked, note }] (note: '지난번 고름' | 'N번 전 후보' | '')
 */
export const carryOverCandidates = (history = [], max = 12) => {
  const seen = new Set();
  const list = [];
  history.forEach((round, idx) => {
    (round.options || []).forEach((opt) => {
      const key = titleKey(opt.title);
      if (!key || seen.has(key)) return;
      seen.add(key);
      const picked = idx === 0 && round.decidedOptionId === opt.id;
      list.push({
        key,
        option: opt,
        checked: idx === 0,
        note: picked ? '지난번 고름' : idx > 0 ? `${idx + 1}번 전 후보` : '',
      });
    });
  });
  return list.slice(0, max);
};

/** 홈 카드에 보여 줄 주제 — 정하는 중인 것 중 가장 최근에 바뀐 것(없으면 null) */
export const pickHomeTopic = (topics = []) => sortTopics(topics).live[0] || null;

/** 지난 판 하나를 지운 뒤 주제의 '마지막 결과' — 남은 지난 판 중 가장 최근 것 */
export const lastResultAfterRemoving = (history = [], removedId) => {
  const next = history.filter((r) => r.id !== removedId)[0];
  return next ? { title: next.decidedTitle || '', roundId: next.id, atMs: next.decidedAtMs || 0, viaWheel: !!next.viaWheel } : null;
};
