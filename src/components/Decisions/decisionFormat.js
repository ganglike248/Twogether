// src/components/Decisions/decisionFormat.js — 같이 정해요 화면 문구 도우미
export const formatDay = (ms) => {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};

// '김치찌개'로 / '초밥'으로 — 받침 있으면 '으로'(ㄹ 받침은 '로')
export const withRo = (word) => {
  const w = String(word || '');
  const code = w.charCodeAt(w.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `'${w}'(으)로`;
  const jong = code % 28;
  return `'${w}'${jong === 0 || jong === 8 ? '로' : '으로'}`;
};

export const SUGGESTED_TOPICS = ['저녁 메뉴', '주말 뭐 하지', '카페 어디 갈까', '볼 영화'];
