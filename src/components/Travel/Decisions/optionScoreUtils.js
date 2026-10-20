// src/components/Travel/Decisions/optionScoreUtils.js
// 점수 막대/슬라이더가 쓰는 멤버·점수 조회 헬퍼 (컴포넌트 파일과 분리 — Fast Refresh 규칙)

// 커플 멤버 [boyfriend(members[0]), girlfriend(members[1])] + 커플 색상 CSS 변수
export const getMembers = (coupleDoc, getMemberName) => [
  coupleDoc?.members?.[0] && { uid: coupleDoc.members[0], name: getMemberName('boyfriend'), color: 'var(--color-boyfriend)' },
  coupleDoc?.members?.[1] && { uid: coupleDoc.members[1], name: getMemberName('girlfriend'), color: 'var(--color-girlfriend)' },
].filter(Boolean);

export const findScore = (option, uid) => (option.scores || []).find(s => s.userId === uid) || null;

// 카드용 의견 한 줄 — 상대 의견을 먼저, 없으면 내 의견
export const pickCommentLine = (option, members, currentUserId) => {
  const ordered = [...members].sort((a, b) => (a.uid === currentUserId) - (b.uid === currentUserId));
  for (const m of ordered) {
    const entry = findScore(option, m.uid);
    if (entry?.comment) return { name: m.name, comment: entry.comment };
  }
  return null;
};
