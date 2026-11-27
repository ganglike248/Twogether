// src/components/Travel/TravelTabSkeleton.jsx
// 여행 상세 탭(일정·선택 사항·체크리스트) 로딩 뼈대 — 예전 빙글빙글 표시 대신 목록 모양으로(목록·홈과 같은 방식)
import React from 'react';
import Skeleton from '../common/Skeleton';
import './TravelTabSkeleton.css';

const TravelTabSkeleton = ({ rows = 3, card = false }) => (
  <div className={`tts${card ? ' card' : ''}`} role="status" aria-label="불러오는 중">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="tts-row">
        <Skeleton width="20px" height="20px" borderRadius="50%" />
        <div className="tts-lines">
          <Skeleton width={`${70 - i * 8}%`} height="16px" />
          <Skeleton width="38%" height="12px" />
        </div>
      </div>
    ))}
  </div>
);

export default TravelTabSkeleton;
