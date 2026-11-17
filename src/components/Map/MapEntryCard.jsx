// src/components/Map/MapEntryCard.jsx
// 우리 지도 진입 카드 — 여행 탭 맨 위, 홈 '우리 이야기' 탭. trips는 useTrips 결과(원본 trips 문서)
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiMap, HiChevronRight } from 'react-icons/hi2';
import { computeMapStats } from './mapStats';
import { SIDO_LIST } from '../../services/regions/regionData';
import './MapEntryCard.css';

const MapEntryCard = ({ trips = [], className = '' }) => {
  const navigate = useNavigate();
  const stats = useMemo(() => computeMapStats(trips), [trips]);
  const visited = Object.keys(stats.sidoCounts).length;
  const sub = stats.unregioned.length
    ? `지난 여행 ${stats.unregioned.length}개의 지역을 고르면 칠해져요`
    : visited ? '누르면 시·군·구까지 볼 수 있어요' : '여행 지역을 고르면 지도에 칠해져요';
  return (
    <button type="button" className={`map-entry ${className}`} onClick={() => navigate('/map')}>
      <span className="map-entry-icon" aria-hidden="true"><HiMap /></span>
      <span className="map-entry-tx">
        <b>우리 지도 · 함께 가 본 곳 <em>{visited}</em>/{SIDO_LIST.length}</b>
        <span>{sub}</span>
      </span>
      <HiChevronRight aria-hidden="true" />
    </button>
  );
};

export default MapEntryCard;
