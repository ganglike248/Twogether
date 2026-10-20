// src/components/Travel/Decisions/OptionPhotos.jsx
// 후보 사진 영역(4:3) — 여러 장이면 좌우로 넘기고 오른쪽 아래에 "1 / 3", 사진이 없으면 자리표시.
// 왼쪽 위(순위·미평가 배지)·오른쪽 위(즐겨찾기 등) 덧씌움은 호출하는 쪽에서 넘김.
import React, { useState } from 'react';
import { MdImage } from 'react-icons/md';

const OptionPhotos = ({ images, alt, topLeft, topRight, className = '' }) => {
  const [index, setIndex] = useState(0);
  const list = images || [];

  const handleScroll = (e) => {
    const el = e.currentTarget;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index) setIndex(next);
  };

  return (
    <div className={`op-photos ${className}`}>
      {list.length > 0 ? (
        <div className="op-photos-track" onScroll={handleScroll}>
          {list.map((src, i) => (
            <img key={`${src}-${i}`} src={src} alt={`${alt} ${i + 1}`} className="op-photo" loading="lazy" />
          ))}
        </div>
      ) : (
        <div className="op-photo-empty"><MdImage /><span>사진 없음</span></div>
      )}
      {topLeft && <div className="op-photos-tl">{topLeft}</div>}
      {topRight && <div className="op-photos-tr">{topRight}</div>}
      {list.length > 1 && (
        <span className="op-photos-count">{Math.min(index + 1, list.length)} / {list.length}</span>
      )}
    </div>
  );
};

export const OptionBadges = ({ rank, unscored }) => (
  (rank || unscored) ? (
    <>
      {unscored && <span className="op-badge-unscored" title="내 평가 필요">!</span>}
      {rank && <span className={`op-badge-rank ${rank === 1 ? 'first' : ''}`}>{rank}위</span>}
    </>
  ) : null
);

export default OptionPhotos;
