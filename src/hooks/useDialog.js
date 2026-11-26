// src/hooks/useDialog.js
// 모달 공통 접근성(AUDIT A-2) — 컨테이너에 ref를 달면
//  · 열릴 때 포커스를 모달로 옮김(안에 자동 포커스된 입력창이 있으면 그대로) → 화면 읽기 프로그램이 모달을 읽음
//  · Esc로 닫기 — 모달이 겹쳐 있으면(목록 모달 위 확인창 등) 맨 위 모달만 반응
//  · 닫히면 원래 누르던 곳으로 포커스를 되돌림
// 컨테이너에는 role="dialog" aria-modal="true" tabIndex={-1}도 같이 달 것.
import { useEffect, useRef } from 'react';

const stack = []; // 열린 모달 순서(맨 뒤가 맨 위)

export const useDialog = (open, onClose) => {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    if (!open) return undefined;
    const token = {};
    stack.push(token);
    const previous = document.activeElement;
    const node = ref.current;
    if (node && !node.contains(document.activeElement)) node.focus({ preventScroll: true });

    const onKey = (e) => {
      if (e.key !== 'Escape' || stack[stack.length - 1] !== token || !closeRef.current) return;
      e.preventDefault();
      closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const i = stack.indexOf(token);
      if (i >= 0) stack.splice(i, 1);
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [open]);

  return ref;
};
