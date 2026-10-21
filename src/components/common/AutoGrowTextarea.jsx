// src/components/common/AutoGrowTextarea.jsx
// 내용 양에 맞춰 세로로 늘어나는 textarea — 칸 안에 스크롤이 생기지 않고 박스 자체가 길어짐(모달 설명/내용 칸 공용).
// 최소 높이는 기존처럼 CSS min-height나 rows 속성으로 정함(height:auto일 때의 높이가 곧 최소 높이).
// 폭이 바뀌면(화면 회전 등) 줄바꿈이 달라지므로 ResizeObserver로 다시 맞춤.
import React, { forwardRef, useCallback, useLayoutEffect, useRef } from 'react';

const AutoGrowTextarea = forwardRef(({ value, style, ...rest }, forwardedRef) => {
  const innerRef = useRef(null);

  const setRefs = useCallback((el) => {
    innerRef.current = el;
    if (typeof forwardedRef === 'function') forwardedRef(el);
    else if (forwardedRef) forwardedRef.current = el;
  }, [forwardedRef]);

  const fit = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // scrollHeight엔 테두리가 빠져 있어서(box-sizing: border-box면 잘림) 테두리 두께를 더함
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
  }, []);

  useLayoutEffect(() => { fit(); }, [value, fit]);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    let lastWidth = el.offsetWidth;
    const observer = new ResizeObserver(() => {
      if (el.offsetWidth === lastWidth) return; // 높이 변화(우리가 바꾼 것)엔 반응하지 않음
      lastWidth = el.offsetWidth;
      fit();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit]);

  return (
    <textarea
      ref={setRefs}
      value={value}
      style={{ ...style, overflowY: 'hidden', resize: 'none' }}
      {...rest}
    />
  );
});

AutoGrowTextarea.displayName = 'AutoGrowTextarea';

export default AutoGrowTextarea;
