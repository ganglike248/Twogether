// src/utils/dateFormat.js — 'YYYY-MM-DD' → '11월 14일' (요약·지도·여행 기록 카드 공통, AUDIT Q-3)
export const formatMonthDay = (s) => {
  const [, m, d] = String(s).split('-').map(Number);
  return `${m}월 ${d}일`;
};
