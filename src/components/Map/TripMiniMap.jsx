// src/components/Map/TripMiniMap.jsx
// 여행 상세 약도 — 이번 여행 지역(trips.regions)을 진하게, 주변은 연하게 깔고 여행 지역 둘레로 자동 확대.
// 한 시·도 안이면 그 시·도의 시·군·구 지도, 여러 시·도이거나 시·도만 알면 전국 시·도 지도. 누르면 우리 지도로.
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mergeRegions, SIDO_BY_CODE, SGG_BY_CODE } from '../../services/regions/regionData';
import sidoData from './data/sido.json';
import './TripMiniMap.css';

const loadSgg = (code) => import(`./data/sgg/${code}.json`).then(m => m.default || m);

// 경로 문자열들의 범위 + 가장 큰 고리 중심(이름표 자리)
const bounds = (ds) => {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  ds.forEach(d => {
    const nums = d.match(/-?\d+(\.\d+)?/g) || [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = +nums[i]; const y = +nums[i + 1];
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  });
  return { x0, y0, x1, y1 };
};
const labelPoint = (d) => {
  let best = null;
  d.split('Z').filter(r => r.startsWith('M')).forEach(ring => {
    const pts = ring.slice(1).split('L').map(p => p.split(',').map(Number));
    const xs = pts.map(p => p[0]); const ys = pts.map(p => p[1]);
    const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    if (!best || area > best.area) best = { area, x: xs.reduce((a, b) => a + b, 0) / xs.length, y: ys.reduce((a, b) => a + b, 0) / ys.length };
  });
  return best || { x: 0, y: 0 };
};

const ASPECT = 2.4; // 약도 가로:세로

const TripMiniMap = ({ trip, onPickRegion }) => {
  const navigate = useNavigate();
  const regions = useMemo(() => mergeRegions(trip.regions || []), [trip.regions]);
  const sidos = useMemo(() => [...new Set(regions.map(r => r.sido))], [regions]);
  const sggCodes = useMemo(() => regions.filter(r => r.sgg).map(r => r.sgg), [regions]);
  const singleSido = sidos.length === 1 && sggCodes.length > 0 ? sidos[0] : null;
  const [sggLoaded, setSggLoaded] = useState({ code: null, data: null });

  useEffect(() => {
    if (!singleSido) return undefined;
    let alive = true;
    loadSgg(singleSido).then(d => alive && setSggLoaded({ code: singleSido, data: d })).catch(() => {});
    return () => { alive = false; };
  }, [singleSido]);

  if (!regions.length) {
    return (
      <button type="button" className="tmm-empty" onClick={onPickRegion}>
        지역을 고르면 이번 여행 약도가 보여요 · <b>지역 고르기</b>
      </button>
    );
  }

  const data = singleSido ? (sggLoaded.code === singleSido ? sggLoaded.data : null) : sidoData;
  if (!data) return <div className="tmm tmm-loading" aria-hidden="true" />;

  const hit = new Set(singleSido ? sggCodes : sidos);
  const nameOf = (code) => (singleSido ? (SGG_BY_CODE[code]?.gu || SGG_BY_CODE[code]?.city) : SIDO_BY_CODE[code]?.short) || '';
  const hitDs = Object.entries(data.d).filter(([c]) => hit.has(c)).map(([, d]) => d);
  // 여행 지역 둘레 + 여백, 약도 비율에 맞춰 넓힘(너무 작은 지역은 최소 크기)
  const b = bounds(hitDs.length ? hitDs : Object.values(data.d));
  let w = Math.max(b.x1 - b.x0, data.w * 0.12); let h = Math.max(b.y1 - b.y0, data.h * 0.08);
  const pad = Math.max(w, h) * 0.25; w += pad * 2; h += pad * 2;
  if (w / h < ASPECT) w = h * ASPECT; else h = w / ASPECT;
  const cx = (b.x0 + b.x1) / 2; const cy = (b.y0 + b.y1) / 2;
  const vb = `${cx - w / 2} ${cy - h / 2} ${w} ${h}`;
  const fs = h / 13;
  const go = () => navigate(singleSido || sidos.length === 1 ? `/map/${sidos[0]}` : '/map');

  return (
    <button type="button" className="tmm" onClick={go} aria-label={`이번 여행 지역 약도 — 우리 지도에서 보기`}>
      <svg viewBox={vb} preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">
        {Object.entries(data.d).map(([code, d]) => (
          <path key={code} d={d} className={hit.has(code) ? 'on' : ''} style={{ strokeWidth: h / 220 }} />
        ))}
        {Object.entries(data.d).filter(([c]) => hit.has(c)).map(([code, d]) => {
          const p = labelPoint(d);
          // '광주 동구'처럼 띄어쓰기가 있으면 두 줄로(이웃 이름표끼리 겹치지 않게)
          const lines = nameOf(code).split(' ');
          const top = p.y + fs / 3 - ((lines.length - 1) * fs * 1.1) / 2;
          return (
            <text key={code} x={p.x} y={top} style={{ fontSize: fs, strokeWidth: fs / 4 }}>
              {lines.map((l, i) => <tspan key={i} x={p.x} dy={i ? fs * 1.1 : 0}>{l}</tspan>)}
            </text>
          );
        })}
      </svg>
    </button>
  );
};

export default TripMiniMap;
