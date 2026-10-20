// src/components/common/ClampText.jsx
// 텍스트를 최대 N줄까지만 보여주고, 실제로 넘칠 때만 "더보기/접기" 토글을 붙임.
// 넘침 여부는 렌더 후 scrollHeight로 측정 — 글자 수 기준으로 자르면 화면 폭에 따라 어긋나서.
import React, { useLayoutEffect, useRef, useState } from 'react';
import { MdExpandMore, MdExpandLess } from 'react-icons/md';
import './ClampText.css';

const ClampText = ({ as = 'p', lines = 3, className = '', children, ...rest }) => {
  const Tag = as;
  const ref = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) return undefined;
    const check = () => setOverflowing(el.scrollHeight - el.clientHeight > 1);
    check();
    // 화면 회전/폭 변경 시 다시 판단
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children, expanded, lines]);

  return (
    <div className="clamp-text">
      <Tag
        ref={ref}
        className={`${className} ${expanded ? '' : 'clamp-text-clamped'}`.trim()}
        style={expanded ? undefined : { WebkitLineClamp: lines }}
        {...rest}
      >
        {children}
      </Tag>
      {(overflowing || expanded) && (
        <button
          type="button"
          className="clamp-text-toggle"
          onClick={() => setExpanded(v => !v)}
          aria-label={expanded ? '접기' : '더보기'}
          title={expanded ? '접기' : '더보기'}
        >
          {expanded ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
        </button>
      )}
    </div>
  );
};

export default ClampText;
