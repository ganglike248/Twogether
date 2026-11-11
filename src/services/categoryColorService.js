// 카테고리 색상 팔레트 — v1.0.38부터 파스텔(사용자 요청). 흰 글씨가 올라가는 칩이라 너무 옅지 않은 중간 톤.
// (2026-08에 "원색을 흰색과 섞는" 방식은 칩이 허옇게 떠서 거절됐음 — 이번엔 팔레트 자체를 파스텔 색으로 교체)
export const CATEGORY_COLORS = [
  { hex: '#FF8A8A', name: '빨강' },
  { hex: '#FFA94D', name: '주황' },
  { hex: '#F5C044', name: '노랑' },
  { hex: '#6CC57C', name: '초록' },
  { hex: '#6BA8F5', name: '파랑' },
  { hex: '#A88BE0', name: '보라' },
  { hex: '#F78FB3', name: '분홍' },
  { hex: '#FFB088', name: '옅은주황' },
  { hex: '#4CC3B8', name: '청록' },
  { hex: '#7CC6E8', name: '하늘색' },
];

// 예전 원색 팔레트 → 같은 자리의 파스텔. Firestore(couples.customCategories)에 저장된 예전 색도 화면에선 파스텔로 보이게.
const LEGACY_TO_PASTEL = {
  '#ff6b6b': '#FF8A8A', '#ff8c42': '#FFA94D', '#ffd93d': '#F5C044', '#6bcb77': '#6CC57C', '#4d96ff': '#6BA8F5',
  '#9d84b7': '#A88BE0', '#ff69b4': '#F78FB3', '#ffa07a': '#FFB088', '#20b2aa': '#4CC3B8', '#87ceeb': '#7CC6E8',
};
export const toPastelCategoryColor = (hex) => (hex && LEGACY_TO_PASTEL[hex.toLowerCase()]) || hex;

// 기본 카테고리 설정 (영문 키로 기존 데이터 호환성 유지)
export const DEFAULT_CATEGORIES = {
  'food': { color: '#FF8A8A', label: '음식' },
  'place': { color: '#6BA8F5', label: '여행' },
  'date': { color: '#F78FB3', label: '데이트' },
};

// 카테고리명 매핑 (내부 키 → 표시할 한글명)
const CATEGORY_DISPLAY_MAP = {
  'food': '음식',
  'place': '여행',
  'date': '데이트',
};

const getDefaultColor = () => CATEGORY_COLORS[0].hex;

export const getCategoryColor = (categoryName, customCategories) => {
  // customCategories에서 먼저 찾기 (사용자 정의 카테고리)
  if (customCategories && customCategories[categoryName]) {
    return toPastelCategoryColor(customCategories[categoryName].color) || getDefaultColor();
  }
  // DEFAULT_CATEGORIES에서 찾기
  return DEFAULT_CATEGORIES[categoryName]?.color || getDefaultColor();
};

export const getCategoryDisplayName = (categoryKey, customCategories) => {
  // 기본 카테고리 매핑에서 찾기
  if (CATEGORY_DISPLAY_MAP[categoryKey]) {
    return CATEGORY_DISPLAY_MAP[categoryKey];
  }
  // 커스텀 카테고리의 label 찾기
  if (customCategories && customCategories[categoryKey]?.label) {
    return customCategories[categoryKey].label;
  }
  // 기본값: 키 그대로 반환
  return categoryKey;
};
