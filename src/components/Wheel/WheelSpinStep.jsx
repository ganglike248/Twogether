// src/components/Wheel/WheelSpinStep.jsx
// 돌림판 2단계 — 파스텔 원판(SVG)을 CSS transform으로 돌리고, 결과는 마스크 테이프 붙은 종이 카드로.
// 결과는 자동으로 사라지지 않음(예전 3초 자동 초기화는 읽기 전에 사라져서 불편했음).
import React, { useState, useRef, useEffect } from 'react';
import { MdClose, MdChevronLeft } from 'react-icons/md';
import { getCategoryDisplayName } from '../../services/categoryColorService';

const SEGMENT_COLORS = ['#ffd6e0', '#dff4e3', '#e3f0fc', '#fff3d0', '#efe6ff', '#ffe4d1', '#dcf4f6', '#f6e3ee'];
const SPIN_MS = 3600;
const SIZE = 280;
const R = SIZE / 2;

const polar = (deg, r) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [R + r * Math.cos(rad), R + r * Math.sin(rad)];
};

const slicePath = (start, end) => {
  const [x1, y1] = polar(start, R);
  const [x2, y2] = polar(end, R);
  const large = end - start > 180 ? 1 : 0;
  return `M ${R} ${R} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
};

const shorten = (text, n) => (text.length > n ? `${text.slice(0, n)}…` : text);

const WheelSpinStep = ({ items, customCategories, onExclude, onBack, onClose }) => {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const timerRef = useRef(null);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const count = items.length;
  const seg = 360 / Math.max(count, 1);
  const labelLen = count > 8 ? 4 : count > 5 ? 6 : 8;
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const duration = reduceMotion ? 600 : SPIN_MS;

  const spin = () => {
    if (spinning || count < 2) return;
    const index = Math.floor(Math.random() * count);
    const center = index * seg + seg / 2;
    const jitter = (Math.random() - 0.5) * seg * 0.6;
    // 바늘은 위(0°) — 고른 칸의 중심이 위로 오도록 현재 각도에서 이어서 여러 바퀴
    const current = ((rotation % 360) + 360) % 360;
    const delta = ((360 - center - jitter - current) % 360 + 360) % 360;
    setResult(null);
    setSpinning(true);
    setRotation(rotation + 360 * (reduceMotion ? 1 : 5) + delta);
    timerRef.current = setTimeout(() => {
      setSpinning(false);
      setResult(items[index]);
    }, duration);
  };

  const excludeAndRespin = () => {
    if (!result) return;
    onExclude(result.id);
    setResult(null);
  };

  return (
    <>
      <div className="wm-head center">
        <button type="button" className="wm-icon-btn" onClick={onBack} aria-label="후보 다시 고르기" disabled={spinning}><MdChevronLeft /></button>
        <h2 className="wm-title">두근두근 돌림판</h2>
        <button type="button" className="wm-icon-btn" onClick={onClose} aria-label="닫기"><MdClose /></button>
      </div>

      <div className="wm-body wm-spin-body">
        <div className="wm-wheel-wrap">
          <span className="wm-pointer" aria-hidden="true" />
          <div className="wm-wheel">
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="wm-wheel-svg"
              style={{ transform: `rotate(${rotation}deg)`, transitionDuration: `${duration}ms` }}
              role="img"
              aria-label={`후보 ${count}개: ${items.map(i => i.title).join(', ')}`}
            >
              {items.map((item, i) => {
                const start = i * seg;
                const mid = start + seg / 2;
                const [tx, ty] = polar(mid, R * 0.64);
                return (
                  <g key={item.id}>
                    <path d={slicePath(start, start + seg)} fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]} stroke="#ffffff" strokeWidth="2" />
                    <text
                      x={tx}
                      y={ty}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${mid} ${tx} ${ty})`}
                      className="wm-wheel-label"
                    >
                      {shorten(item.title, labelLen)}
                    </text>
                  </g>
                );
              })}
            </svg>
            <button type="button" className="wm-spin-btn" onClick={spin} disabled={spinning || count < 2}>
              {spinning ? '…' : '돌리기'}
            </button>
          </div>
        </div>

        <div className="wm-result-slot" aria-live="polite">
          {result ? (
            <div className="wm-result">
              <span className="wm-result-tape" aria-hidden="true" />
              <span className="wm-result-label">오늘은 이거!</span>
              <span className="wm-result-title">{result.title}</span>
              <span className="wm-result-meta">
                {result.isLocal ? '직접 적은 후보' : `${result.category ? `${getCategoryDisplayName(result.category, customCategories)} · ` : ''}버킷리스트`}
              </span>
            </div>
          ) : (
            <p className="wm-hint">{spinning ? '두근두근…' : count < 2 ? '후보가 2개 이상 있어야 돌릴 수 있어요' : '가운데 버튼을 눌러 돌려 보세요'}</p>
          )}
        </div>
      </div>

      <div className="wm-footer">
        {result ? (
          <div className="wm-footer-row">
            <button type="button" className="wm-secondary" onClick={spin}>다시 돌리기</button>
            {count > 2 && <button type="button" className="wm-secondary" onClick={excludeAndRespin}>이건 빼고</button>}
            <button type="button" className="wm-primary grow" onClick={onClose}>이걸로 정했어요</button>
          </div>
        ) : (
          <button type="button" className="wm-primary" onClick={spin} disabled={spinning || count < 2}>
            {spinning ? '돌아가는 중…' : '돌리기'}
          </button>
        )}
      </div>
    </>
  );
};

export default WheelSpinStep;
