// src/services/colorService.js

// 기본 색상 팔레트 (30색 - 파스텔 전 스펙트럼)
export const DEFAULT_COLOR_PALETTE = [
  // 레드/코랄/핑크
  '#FFB3B3', '#FFC8C0', '#FFB3C8', '#F5B3D0', '#FFB3E8',
  // 퍼플/라벤더/바이올렛
  '#E8B3FF', '#D4B3FF', '#C7CEEA', '#B8B8FF', '#B3C4FF',
  // 블루/스카이/티얼
  '#B3D8FF', '#B3EEFF', '#B3F4F5', '#B3F0E8', '#B3EFDD',
  // 그린/민트/라임
  '#B5EAD7', '#B8F0C8', '#C8F5B3', '#DDFAB3', '#F0FFB3',
  // 옐로우/오렌지/피치
  '#FFF8B3', '#FFF0B3', '#FFE4B3', '#FFD4B3', '#FFCAB3',
  // 뉴트럴/그레이/어스
  '#F5F5F5', '#EDE8F0', '#E8EEEE', '#EEE8E0', '#F5EBE0',
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
