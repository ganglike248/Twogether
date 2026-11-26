// src/components/Map/MiniKorea.jsx — 여행 탭 지도 카드 안 작은 전국 지도(누르기·확대 없음, 간 곳만 이름표)
import React, { useMemo } from 'react';
import sidoData from './data/sido.json';
import { labelPoint } from './mapGeometry';

const MiniKorea = ({ counts, nameOf, level }) => {
  const entries = useMemo(() => Object.entries(sidoData.d), []);
  const points = useMemo(() => Object.fromEntries(entries.map(([c, d]) => [c, labelPoint(d)])), [entries]);
  return (
    <svg className="map-entry-map" viewBox={`0 0 ${sidoData.w} ${sidoData.h}`} role="img" aria-label="지금까지 칠한 우리 지도">
      {entries.map(([code, d]) => (
        <path key={code} d={d} className={`l${level(counts[code] || 0)}`} />
      ))}
      {entries.filter(([c]) => counts[c]).map(([code]) => (
        <text key={code} x={points[code].x} y={points[code].y + 3}>{nameOf(code)}</text>
      ))}
    </svg>
  );
};

export default MiniKorea;
