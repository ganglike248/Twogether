// src/components/Travel/Checklist/ProgressRing.jsx — 체크리스트 진행률 원형 링(60px)
import React from 'react';

const RADIUS = 27;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const ProgressRing = ({ percent }) => {
  const filled = (Math.max(0, Math.min(100, percent)) / 100) * CIRCUMFERENCE;
  return (
    <svg className="tct-ring" width="60" height="60" viewBox="0 0 64 64" role="img" aria-label={`준비 ${percent}%`}>
      <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="rgba(255, 182, 193, 0.22)" strokeWidth="7" />
      {filled > 0 && (
        <circle
          cx="32" cy="32" r={RADIUS} fill="none" stroke="#ff9bac" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${filled} ${CIRCUMFERENCE}`} transform="rotate(-90 32 32)"
        />
      )}
      <text x="32" y="37" textAnchor="middle" fontSize="15" fontWeight="700" fill="#343A40" fontFamily="Gowun Dodum, sans-serif">
        {percent}%
      </text>
    </svg>
  );
};

export default ProgressRing;
