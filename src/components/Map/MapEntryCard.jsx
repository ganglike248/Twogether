// src/components/Map/MapEntryCard.jsx
// 우리 지도 진입 카드 — 여행 탭 맨 위(showMap: 지금까지 칠한 전국 지도까지), 홈 '우리 이야기'(한 줄).
// trips는 useTrips 결과(원본 trips 문서)
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiMap, HiChevronRight } from 'react-icons/hi2';
import { computeMapStats, level } from './mapStats';
import { SIDO_LIST, SIDO_BY_CODE } from '../../services/regions/regionData';
import './MapEntryCard.css';

// 지도 그림은 showMap일 때만 필요 — 홈 카드엔 경계 데이터를 싣지 않게 지연 로딩
const MiniKorea = React.lazy(() => import('./MiniKorea'));

// variant 'home': 홈 '우리 이야기'의 다른 카드(.home-card · card-label · trip-section-row, Home.css)와 같은 모양
const MapEntryCard = ({ trips = [], className = '', showMap = false, variant }) => {
  const navigate = useNavigate();
  const stats = useMemo(() => computeMapStats(trips), [trips]);
  const visited = Object.keys(stats.sidoCounts).length;
  const sub = stats.unregioned.length
    ? `지난 여행 ${stats.unregioned.length}개의 지역을 고르면 칠해져요`
    : visited ? '누르면 시·군·구까지 볼 수 있어요' : '여행 지역을 고르면 지도에 칠해져요';
  if (variant === 'home') {
    return (
      <div className={`home-card ${className}`} onClick={() => navigate('/map')} role="link" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') navigate('/map'); }}>
        <div className="card-label">
          <HiMap className="card-label-icon" />
          우리 지도
        </div>
        <div className="trip-section-row">
          <div className="trip-section-info">
            <div className="trip-section-title">함께 가 본 곳 <span className="sealed-accent-text">{visited}</span>/{SIDO_LIST.length}</div>
            <div className="trip-section-sub">{sub}</div>
          </div>
          <span className="card-arrow">›</span>
        </div>
      </div>
    );
  }

  return (
    <button type="button" className={`map-entry${showMap ? ' with-map' : ''} ${className}`} onClick={() => navigate('/map')}>
      <span className="map-entry-row">
        <span className="map-entry-icon" aria-hidden="true"><HiMap /></span>
        <span className="map-entry-tx">
          <b>우리 지도 · 함께 가 본 곳 <em>{visited}</em>/{SIDO_LIST.length}</b>
          <span>{sub}</span>
        </span>
        <HiChevronRight aria-hidden="true" />
      </span>
      {showMap && (
        <React.Suspense fallback={<span className="map-entry-map placeholder" aria-hidden="true" />}>
          <MiniKorea counts={stats.sidoCounts} nameOf={(c) => SIDO_BY_CODE[c]?.short || ''} level={level} />
        </React.Suspense>
      )}
    </button>
  );
};

export default MapEntryCard;
