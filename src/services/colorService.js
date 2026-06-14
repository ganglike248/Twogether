// src/services/colorService.js

// 기본 색상 팔레트
export const DEFAULT_COLOR_PALETTE = [
  '#c7ceea',  // 라벤더 (기존 boyfriend)
  '#b5ead7',  // 민트 (기존 girlfriend)
  '#4ECDC4',  // 청록색 (기존 personal)
  '#FFB6B9',  // 분홍색
  '#FEC8D8',  // 밝은 분홍
  '#FFDAC1',  // 복숭아색
  '#E0BBE4',  // 자주색
  '#957DAD',  // 진 자주색
  '#FFD6E8',  // 밝은 분홍 2
  '#A8D8EA',  // 하늘색
];

export const DEFAULT_EVENT_TYPE_COLORS = {
  boyfriend: '#c7ceea',
  girlfriend: '#b5ead7',
  personal: '#4ECDC4',
};

// 색상이 밝은지 어두운지 판단
export const isLightColor = (hexColor) => {
  if (!hexColor) return true;
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
};

// 색상에 대한 적절한 텍스트 색 반환
export const getContrastColor = (hexColor) => {
  return isLightColor(hexColor) ? '#333333' : '#ffffff';
};
