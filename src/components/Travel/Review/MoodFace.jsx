// src/components/Travel/Review/MoodFace.jsx — 여행 기분 얼굴 아이콘(선 아이콘, 이모지 대신)
import React from 'react';

const MOUTH = {
  great: 'M8 14.5c1.5 2.6 6.5 2.6 8 0',
  good: 'M8.5 15c1.2 1.4 5.8 1.4 7 0',
  ok: 'M8.5 15.5h7',
  meh: 'M8.5 16.5c1.2-1.4 5.8-1.4 7 0',
  bad: 'M8 17c1.5-2.6 6.5-2.6 8 0',
};

const MoodFace = ({ kind, size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" />
    <circle cx="9" cy="10" r=".9" fill="currentColor" />
    <circle cx="15" cy="10" r=".9" fill="currentColor" />
    <path d={MOUTH[kind] || MOUTH.ok} />
  </svg>
);

export default MoodFace;
