// src/hooks/useLinkFillCollapsed.js
// "링크로 자동 채우기" 카드(LinkFillCard)의 접힘 상태.
import { useState } from 'react';

// 접힘 여부를 기기에 기억(v1.0.24~) — 링크를 안 쓰는 사람은 매번 접을 필요 없게. 후보 추가·일정 추가가 같은 설정을 공유.
// 저장소를 못 쓰는 환경(사생활 보호 모드 등)에선 그냥 펼친 상태로 시작.
const COLLAPSED_KEY = 'twogether_link_fill_collapsed';

const useLinkFillCollapsed = () => {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === '1'; } catch { return false; }
  });
  const toggle = () => setCollapsed((prev) => {
    const next = !prev;
    try { localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0'); } catch { /* 기억만 못 할 뿐 */ }
    return next;
  });
  return [collapsed, toggle];
};

export default useLinkFillCollapsed;
