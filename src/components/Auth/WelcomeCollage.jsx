// src/components/Auth/WelcomeCollage.jsx
// 시작 화면의 다이어리 소품 콜라주 — 사진 대신 앱의 실제 기능(캘린더·여행·버킷·봉인 편지)을
// 종이 소품으로 보여줌. 로그인 전엔 사용자 사진이 있을 수 없어서 사진 자리는 일부러 안 둠
// (2026-11 첫 실행 리디자인 결정). 순수 장식이라 스크린리더에는 숨김.
import React from 'react';
import mascotImg from '../images/mascot.png';

const CALENDAR_DAYS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

const dayClass = (day) => {
  if (day === 14) return 'collage-day-mark';
  if (day === 18) return 'collage-day-personal';
  if (day === 20) return 'collage-day-trip start';
  if (day === 21) return 'collage-day-trip';
  if (day === 22) return 'collage-day-trip end';
  return '';
};

const WelcomeCollage = () => (
  <div className="collage" aria-hidden="true">
    <div className="collage-item collage-calendar">
      <span className="collage-tape" />
      <div className="collage-calendar-head">
        <span className="collage-calendar-month">6월</span>
        <span className="collage-small">우리 캘린더</span>
      </div>
      <div className="collage-calendar-grid">
        {CALENDAR_DAYS.map(day => (
          <span key={day} className={dayClass(day)}>{day}</span>
        ))}
      </div>
    </div>

    <div className="collage-item collage-ticket">
      <div className="collage-ticket-main">
        <span className="collage-small">여행</span>
        <span className="collage-ticket-route">서울 → 제주</span>
        <span className="collage-ticket-date">6.20 – 6.22</span>
      </div>
      <div className="collage-ticket-stub">D-6</div>
    </div>

    <div className="collage-item collage-memo">
      <span className="collage-small">같이 하고 싶은 것</span>
      <span className="collage-memo-row"><span className="collage-check" />한강 피크닉</span>
      <span className="collage-memo-row done"><span className="collage-check" />첫 캠핑</span>
    </div>

    <div className="collage-item collage-letter">
      <svg width="168" height="112" viewBox="0 0 168 112">
        <rect x="1" y="1" width="166" height="110" rx="8" fill="#fffdf9" stroke="#efe4e7" />
        <path d="M2 6 L84 62 L166 6" fill="none" stroke="#e6d3d8" strokeWidth="1.5" />
        <circle cx="84" cy="62" r="13" style={{ fill: 'var(--color-primary)' }} />
        {/* 흰 하트는 빨간 원(r=13) 안에 여유 있게 들어가도록 원 중심 기준 축소 */}
        <path d="M84 68 c-6-4-9-7-9-10 a4 4 0 0 1 9-2 a4 4 0 0 1 9 2 c0 3-3 6-9 10z" fill="#ffffff" transform="translate(84 62) scale(0.68) translate(-84 -61)" />
      </svg>
      <span className="collage-letter-caption">100일에 열어봐 · <em>D-12</em></span>
    </div>

    <img src={mascotImg} alt="" className="collage-mascot" />
  </div>
);

export default WelcomeCollage;
