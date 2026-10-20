// src/components/Travel/Decisions/ScoreSlider.jsx
// 1~10점 슬라이더 — 카드의 점수 막대와 같은 핑크 막대를 끌어서 정함.
// 실제 입력은 투명한 <input type="range">가 받아서 터치·키보드 접근성은 브라우저 기본 그대로.
// 상대가 매긴 점수는 막대 위 초록 점으로 표시.
import React from 'react';
import { withTopicParticle } from './decisionViewUtils';

const MIN = 1;
const MAX = 10;
const toPercent = (v) => ((v - MIN) / (MAX - MIN)) * 100;

const ScoreSlider = ({ value, onChange, partner }) => {
  const hasValue = value != null;
  const shown = hasValue ? value : 5;
  const pct = toPercent(shown);

  return (
    <div className="ssl">
      <div className="ssl-head">
        <span className="ssl-label">내 점수</span>
        <span className="ssl-value">{hasValue ? value : '–'}<span className="ssl-value-max"> / 10</span></span>
      </div>
      <div className="ssl-track-wrap">
        <span className="ssl-track" />
        {hasValue && <span className="ssl-fill" style={{ width: `${pct}%` }} />}
        {partner && (
          <span
            className="ssl-partner"
            style={{ left: `calc(${toPercent(partner.score)}% - 5px)`, background: partner.color }}
            title={`${partner.name} ${partner.score}점`}
          />
        )}
        <span className={`ssl-thumb ${hasValue ? '' : 'idle'}`} style={{ left: `calc(${pct}% - 14px)` }} />
        <input
          type="range"
          className="ssl-input"
          min={MIN}
          max={MAX}
          step={1}
          value={shown}
          onChange={(e) => onChange(Number(e.target.value))}
          // 아직 안 고른 상태에서 그냥 탭만 해도 그 위치 점수로 정해지도록
          onPointerDown={(e) => { if (!hasValue) onChange(Number(e.currentTarget.value)); }}
          aria-label="내 점수 (1~10)"
        />
      </div>
      <div className="ssl-ticks">
        {Array.from({ length: MAX }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            className={`ssl-tick ${n === value ? 'on' : ''}`}
            onClick={() => onChange(n)}
            aria-label={`${n}점`}
          >
            {n}
          </button>
        ))}
      </div>
      {partner && (
        <span className="ssl-partner-note">
          <span className="ssl-partner-dot" style={{ background: partner.color }} />{withTopicParticle(partner.name)} {partner.score}점을 줬어요
        </span>
      )}
    </div>
  );
};

export default ScoreSlider;
