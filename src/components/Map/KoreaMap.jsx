// src/components/Map/KoreaMap.jsx
// 미리 계산한 SVG 경로(data/*.json, scripts/map/build_map_paths.py)로 지도 그리기 — 간 횟수만큼 진하게 + 간 곳 이름표,
// 안 간 곳은 점선 윤곽(시안 '지도 A+B'). 지역을 누르면 onSelect(code).
import React, { useMemo } from 'react';
import { level } from './mapStats';

// 이름표 위치: 가장 큰 고리(본토)의 꼭짓점 평균 — 섬 때문에 중심이 바다로 가지 않게
const labelPoint = (d) => {
  let best = null;
  for (const ring of d.split('Z')) {
    if (!ring.startsWith('M')) continue;
    const pts = ring.slice(1).split('L').map(p => p.split(',').map(Number));
    const xs = pts.map(p => p[0]);
    const ys = pts.map(p => p[1]);
    const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    if (!best || area > best.area) best = { area, x: xs.reduce((a, b) => a + b, 0) / xs.length, y: ys.reduce((a, b) => a + b, 0) / ys.length };
  }
  return best || { x: 0, y: 0 };
};

const KoreaMap = ({ data, counts = {}, nameOf, onSelect, ariaLabel, labelSize = 9 }) => {
  const entries = useMemo(() => Object.entries(data.d), [data]);
  const points = useMemo(() => Object.fromEntries(entries.map(([code, d]) => [code, labelPoint(d)])), [entries]);

  return (
    <svg className="km" viewBox={`0 0 ${data.w} ${data.h}`} role="img" aria-label={ariaLabel}>
      {entries.map(([code, d]) => {
        const n = counts[code] || 0;
        return (
          <path
            key={code}
            d={d}
            className={`km-r l${level(n)}${n ? '' : ' un'}`}
            onClick={onSelect ? () => onSelect(code) : undefined}
          >
            <title>{`${nameOf(code)}${n ? ` · ${n}번` : ' · 아직'}`}</title>
          </path>
        );
      })}
      {entries.filter(([code]) => counts[code]).map(([code]) => (
        <text key={code} className="km-lb" x={points[code].x} y={points[code].y + labelSize / 3} style={{ fontSize: labelSize }}>
          {nameOf(code, true)}
        </text>
      ))}
    </svg>
  );
};

export default KoreaMap;
