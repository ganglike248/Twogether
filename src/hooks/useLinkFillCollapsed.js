// src/hooks/useLinkFillCollapsed.js
// "링크로 자동 채우기" 카드(LinkFillCard)의 접힘 상태 — 후보 추가·일정 추가 모달을 열 때마다 **접힌 채로 시작**(v1.0.36, 사용자 요청).
// 예전(v1.0.24~)엔 마지막 접힘 상태를 로컬스토리지 `twogether_link_fill_collapsed`에 기억했는데, 기본은 접힘으로 통일하면서 기억은 뺌.
import { useState } from 'react';

const useLinkFillCollapsed = () => {
  const [collapsed, setCollapsed] = useState(true);
  const toggle = () => setCollapsed((prev) => !prev);
  return [collapsed, toggle];
};

export default useLinkFillCollapsed;
