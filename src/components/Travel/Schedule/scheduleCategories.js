// src/components/Travel/Schedule/scheduleCategories.js
// 여행 일정 종류(식사·관광 등) — 일정 항목의 `category` 키. 선택 사항이라 없으면 표시 안 함(기존 일정 호환).
// 색은 종류 구분용 파스텔(주 색 변수와 별개, 사용자 선택), 배경은 옅은 불투명 틴트. 앱 배경이 분홍 계열이라 주황·분홍 계열은 피함.
// 아이콘은 설정 화면과 같은 Material(react-icons/md), 배경은 설정 아이콘 칩처럼 같은 색을 옅게.
import {
  MdRestaurant, MdLocalCafe, MdPhotoCamera, MdConfirmationNumber, MdShoppingBag, MdHotel, MdPushPin,
} from 'react-icons/md';

// 배경은 같은 색을 흰색 위에 18%로 섞은 **불투명** 색 — 반투명이면 뒤의 타임라인 선이 비쳐 보였음
const tint = (hex, amount = 0.18) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const mix = (c) => Math.round(255 - (255 - c) * amount).toString(16).padStart(2, '0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
};
const pastel = (color) => ({ color, bg: tint(color) });

export const SCHEDULE_CATEGORIES = [
  { key: 'food', label: '식사', Icon: MdRestaurant, ...pastel('#f2b705') },
  { key: 'cafe', label: '카페', Icon: MdLocalCafe, ...pastel('#b08968') },
  { key: 'sight', label: '관광', Icon: MdPhotoCamera, ...pastel('#51cf66') },
  { key: 'activity', label: '놀거리', Icon: MdConfirmationNumber, ...pastel('#4dabf7') },
  { key: 'shopping', label: '쇼핑', Icon: MdShoppingBag, ...pastel('#3bc9db') },
  { key: 'stay', label: '숙소', Icon: MdHotel, ...pastel('#9775fa') },
  { key: 'etc', label: '기타', Icon: MdPushPin, ...pastel('#adb5bd') },
];

export const getScheduleCategory = (key) => SCHEDULE_CATEGORIES.find(c => c.key === key) || null;
