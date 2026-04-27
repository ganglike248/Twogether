// 카테고리 색상 팔레트
export const CATEGORY_COLORS = [
  { hex: '#FF6B6B', name: '빨강' },
  { hex: '#FF8C42', name: '주황' },
  { hex: '#FFD93D', name: '노랑' },
  { hex: '#6BCB77', name: '초록' },
  { hex: '#4D96FF', name: '파랑' },
  { hex: '#9D84B7', name: '보라' },
  { hex: '#FF69B4', name: '분홍' },
  { hex: '#FFA07A', name: '옅은주황' },
  { hex: '#20B2AA', name: '청록' },
  { hex: '#87CEEB', name: '하늘색' },
];

// 기본 카테고리 설정 (영문 키로 기존 데이터 호환성 유지)
export const DEFAULT_CATEGORIES = {
  'food': { color: '#FF6B6B', label: '음식' },
  'place': { color: '#4D96FF', label: '여행' },
  'date': { color: '#FF69B4', label: '데이트' },
};

// 카테고리명 매핑 (내부 키 → 표시할 한글명)
export const CATEGORY_DISPLAY_MAP = {
  'food': '음식',
  'place': '여행',
  'date': '데이트',
};

export const getDefaultColor = () => CATEGORY_COLORS[0].hex;

export const getCategoryColor = (categoryName, customCategories) => {
  // customCategories에서 먼저 찾기 (사용자 정의 카테고리)
  if (customCategories && customCategories[categoryName]) {
    return customCategories[categoryName].color || getDefaultColor();
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
