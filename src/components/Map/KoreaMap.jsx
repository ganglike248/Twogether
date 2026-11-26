// src/components/Map/KoreaMap.jsx
// 미리 계산한 SVG 경로(data/*.json, scripts/map/build_map_paths.py)로 지도 그리기 — 간 횟수만큼 진하게, 안 간 곳은 점선 윤곽,
// 모든 지역에 작은 이름표(간 곳은 진하게). 두 손가락·휠로 확대/축소, 확대 중엔 한 손가락으로 이동, +/−/원래대로 버튼.
// 지역을 누르면 onSelect(code) — 끌어서 움직인 경우엔 누름으로 치지 않음.
import React, { useMemo, useRef, useState, useCallback } from 'react';
import { level } from './mapStats';
import { labelPoint } from './mapGeometry';

const MIN = 1;
const MAX = 6;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// sparkCodes: 방금 처음 칠해진 곳(여행 끝 기록 직후) — 반짝임 / selected: 아래 시트에 열린 지역
const KoreaMap = ({ data, counts = {}, nameOf, onSelect, ariaLabel, labelSize = 8, sparkCodes = [], selected = null }) => {
  const entries = useMemo(() => Object.entries(data.d), [data]);
  const points = useMemo(() => Object.fromEntries(entries.map(([code, d]) => [code, labelPoint(d)])), [entries]);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 }); // 확대 배율 + 이동(viewBox 단위)
  const svgRef = useRef(null);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const moved = useRef(false);

  // 화면 좌표 → viewBox 좌표
  const toLocal = useCallback((clientX, clientY) => {
    const r = svgRef.current.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * data.w, y: ((clientY - r.top) / r.height) * data.h };
  }, [data.w, data.h]);

  // 확대/축소해도 지도가 화면 밖으로 다 빠지지 않게 이동량 제한
  const fit = useCallback((v) => {
    const k = clamp(v.k, MIN, MAX);
    return { k, x: clamp(v.x, data.w * (1 - k), 0), y: clamp(v.y, data.h * (1 - k), 0) };
  }, [data.w, data.h]);

  const zoomAt = useCallback((factor, cx = data.w / 2, cy = data.h / 2) => {
    setView(v => {
      const k = clamp(v.k * factor, MIN, MAX);
      const f = k / v.k;
      return fit({ k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f });
    });
  }, [data.w, data.h, fit]);

  const onPointerDown = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { type: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), mid: toLocal((a.x + b.x) / 2, (a.y + b.y) / 2) };
    } else {
      gesture.current = { type: 'pan', last: { x: e.clientX, y: e.clientY } };
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.type === 'pinch' && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.dist > 0) zoomAt(dist / g.dist, g.mid.x, g.mid.y);
      g.dist = dist;
      moved.current = true;
    } else if (g.type === 'pan' && view.k > 1) {
      const r = svgRef.current.getBoundingClientRect();
      const dx = ((e.clientX - g.last.x) / r.width) * data.w;
      const dy = ((e.clientY - g.last.y) / r.height) * data.h;
      if (Math.abs(e.clientX - g.last.x) + Math.abs(e.clientY - g.last.y) > 0) {
        if (Math.hypot(dx, dy) > 0.5) moved.current = true;
        setView(v => fit({ ...v, x: v.x + dx, y: v.y + dy }));
      }
      g.last = { x: e.clientX, y: e.clientY };
    }
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      gesture.current = { type: 'pan', last: p };
    } else if (pointers.current.size === 0) {
      gesture.current = null;
    }
  };

  const onWheel = (e) => {
    if (!e.ctrlKey && Math.abs(e.deltaY) < 1) return;
    const p = toLocal(e.clientX, e.clientY);
    zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, p.x, p.y);
  };

  const select = (code) => {
    if (moved.current || !onSelect) return;
    onSelect(code);
  };

  const fs = labelSize / Math.sqrt(view.k); // 확대할수록 글자는 덜 커지게

  return (
    <div className="km-wrap">
      <svg
        ref={svgRef}
        className={`km${view.k > 1 ? ' zoomed' : ''}`}
        viewBox={`0 0 ${data.w} ${data.h}`}
        role="img"
        aria-label={ariaLabel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {entries.map(([code, d]) => {
            const n = counts[code] || 0;
            return (
              <path
                key={code}
                d={d}
                className={`km-r l${level(n)}${n ? '' : ' un'}${sparkCodes.includes(code) ? ' spark' : ''}${selected === code ? ' sel' : ''}`}
                style={{ strokeWidth: (selected === code ? 1.8 : 0.8) / view.k }}
                onClick={() => select(code)}
              >
                <title>{`${nameOf(code)}${n ? ` · ${n}번` : ' · 아직'}`}</title>
              </path>
            );
          })}
          {entries.map(([code]) => (
            <text
              key={code}
              className={`km-lb${counts[code] ? ' on' : ''}`}
              x={points[code].x}
              y={points[code].y + fs / 3}
              style={{ fontSize: fs, strokeWidth: 2.2 / view.k }}
            >
              {nameOf(code, true)}
            </text>
          ))}
        </g>
      </svg>
      <div className="km-zoom">
        <button type="button" onClick={() => zoomAt(1.5)} aria-label="확대" disabled={view.k >= MAX}>+</button>
        <button type="button" onClick={() => zoomAt(1 / 1.5)} aria-label="축소" disabled={view.k <= MIN}>−</button>
        {view.k > 1 && <button type="button" className="km-reset" onClick={() => setView({ k: 1, x: 0, y: 0 })} aria-label="원래 크기로">↺</button>}
      </div>
    </div>
  );
};

export default KoreaMap;
