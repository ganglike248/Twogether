// 카테고리 색상 팔레트 — v1.2부터 "부드러운 배경 + 같은 계열의 진한 글자"(사용자 요청: 중간 톤 + 흰 글씨가 칙칙해 보임).
// 흰색을 섞어 만든 색(2026-08 거절)이 아니라 팔레트 자체를 옅은 파스텔로 고르고, 글자색을 색마다 짝지음(text).
export const CATEGORY_COLORS = [
  { hex: '#FFDCD8', text: '#B0463F', name: '빨강' },
  { hex: '#FFE3C7', text: '#A65A14', name: '주황' },
  { hex: '#FBEDB8', text: '#856600', name: '노랑' },
  { hex: '#D5EFDA', text: '#2E7844', name: '초록' },
  { hex: '#D8E7FB', text: '#2F5E9C', name: '파랑' },
  { hex: '#E7DEF7', text: '#6447A6', name: '보라' },
  { hex: '#FCDDE9', text: '#AE4579', name: '분홍' },
  { hex: '#FFE6D9', text: '#A35835', name: '살구' },
  { hex: '#CFEFEA', text: '#1E776D', name: '청록' },
  { hex: '#D8EFF9', text: '#256B8C', name: '하늘색' },
];

// 예전에 저장된 색(원색 팔레트 ~v1.0.37, 중간 톤 파스텔 v1.0.38~) → 같은 자리의 새 색. Firestore 값은 그대로 두고 화면에서만 바꿔 보여 줌.
const OLD_PALETTES = [
  ['#ff6b6b', '#ff8c42', '#ffd93d', '#6bcb77', '#4d96ff', '#9d84b7', '#ff69b4', '#ffa07a', '#20b2aa', '#87ceeb'],
  ['#ff8a8a', '#ffa94d', '#f5c044', '#6cc57c', '#6ba8f5', '#a88be0', '#f78fb3', '#ffb088', '#4cc3b8', '#7cc6e8'],
];
const TO_SOFT = Object.fromEntries(OLD_PALETTES.flatMap(list => list.map((h, i) => [h, CATEGORY_COLORS[i].hex])));
export const toPastelCategoryColor = (hex) => (hex && TO_SOFT[hex.toLowerCase()]) || hex;

// 팔레트에 없는 색(직접 저장된 임의 색)은 같은 색상(hue)의 진한 글자로
const hexToHsl = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => v / 255);
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const l = (max + min) / 2;
  return { h: Math.round(h * 60 + 360) % 360, s: d ? d / (1 - Math.abs(2 * l - 1)) : 0 };
};
export const getCategoryTextColorFor = (hex) => {
  const soft = toPastelCategoryColor(hex);
  const hit = CATEGORY_COLORS.find(c => c.hex.toLowerCase() === String(soft).toLowerCase());
  if (hit) return hit.text;
  const hsl = hexToHsl(soft);
  return hsl ? `hsl(${hsl.h} ${Math.round(Math.min(60, hsl.s * 100))}% 32%)` : '#4F4347';
};

// 기본 카테고리 설정 (영문 키로 기존 데이터 호환성 유지)
export const DEFAULT_CATEGORIES = {
  'food': { color: '#FFDCD8', label: '음식' },
  'place': { color: '#D8E7FB', label: '여행' },
  'date': { color: '#FCDDE9', label: '데이트' },
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

/** 카테고리 칩 글자색 — 배경색과 같은 계열의 진한 색 */
export const getCategoryTextColor = (categoryName, customCategories) => getCategoryTextColorFor(getCategoryColor(categoryName, customCategories));

/** 지금 있는 카테고리 키인지(삭제된 커스텀 카테고리·빈 값이면 false) */
export const isKnownCategory = (key, customCategories) => !!key && !!({ ...DEFAULT_CATEGORIES, ...customCategories })[key];

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
