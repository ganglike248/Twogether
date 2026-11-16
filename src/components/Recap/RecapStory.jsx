// src/components/Recap/RecapStory.jsx
// 스토리형 카드 뷰어 — 위쪽 진행 막대, 화면 왼쪽(30%) 탭 = 이전 / 나머지 탭 = 다음, ←/→ 키도 지원. 월간 요약·연말 랩업 공용.
import React, { useState, useEffect, useCallback } from 'react';
import { MdClose } from 'react-icons/md';
import './Recap.css';

const RecapStory = ({ label, cards, onClose }) => {
  const [index, setIndex] = useState(0);
  const count = cards.length;
  const go = useCallback((delta) => setIndex(i => Math.min(count - 1, Math.max(0, i + delta))), [count]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const handleTap = (e) => {
    // 카드 안 버튼·링크 클릭은 넘기기로 처리하지 않음
    if (e.target.closest('button, a')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    go(e.clientX - rect.left < rect.width * 0.3 ? -1 : 1);
  };

  return (
    <div className="rc-screen" onClick={handleTap}>
      <div className="rc-bars" aria-hidden="true">
        {cards.map((_, i) => <span key={i} className={i <= index ? 'on' : ''} />)}
      </div>
      <div className="rc-top">
        <span>{label}</span>
        <button type="button" className="rc-close" onClick={onClose} aria-label="닫기"><MdClose /></button>
      </div>
      <div className="rc-card" key={index} aria-live="polite">
        {cards[index]}
      </div>
      {index < count - 1 && <p className="rc-hint">화면 오른쪽을 눌러 다음 · {index + 1}/{count}</p>}
    </div>
  );
};

export default RecapStory;
