// src/components/Onboarding/OnboardingSlides.jsx
import React, { useState, useRef } from 'react';
import { HiHeart, HiCalendarDays, HiPhoto, HiCheckCircle, HiPaperAirplane } from 'react-icons/hi2';
import './OnboardingSlides.css';

const SLIDES = [
  {
    Icon: HiHeart,
    iconColor: '#ff6b6b',
    title: '우리두리에 오신 것을 환영해요',
    desc: '커플을 위한 공간이에요.\n일상의 소중한 순간들을 함께 기록하고,\n오래도록 추억으로 남겨봐요 💕',
    isOpening: true,
  },
  {
    Icon: HiCalendarDays,
    iconColor: '#4dabf7',
    title: '캘린더',
    desc: '서로의 일정과 기념일, 데이트 일정을 함께 관리하고, 일기를 기록해요',
  },
  {
    Icon: HiPhoto,
    iconColor: '#cc5de8',
    title: '추억',
    desc: '지나온 일정들을 리스트로 한눈에 모아보며 우리만의 소중한 순간들을 회상해요',
  },
  {
    Icon: HiCheckCircle,
    iconColor: '#51cf66',
    title: '버킷리스트',
    desc: '음식, 여행, 데이트 등 함께 하고 싶은 것들을 기록해두어요',
  },
  {
    Icon: HiPaperAirplane,
    iconColor: '#339af0',
    title: '여행',
    desc: '날짜, 예산, 시간, 장소 등 여행 일정을 함께 계획하고 공유해요',
  },
];

const OnboardingSlides = ({ onClose }) => {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(null);

  const isLast = current === SLIDES.length - 1;

  const goNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrent(c => c + 1);
    }
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (delta > 50 && !isLast) setCurrent(c => c + 1);
    if (delta < -50 && current > 0) setCurrent(c => c - 1);
    touchStartX.current = null;
  };

  return (
    <div className="onboarding-overlay">
      <div
        className="onboarding-card"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 건너뛰기 */}
        {!isLast && (
          <button className="onboarding-skip" onClick={onClose}>
            건너뛰기
          </button>
        )}

        {/* 슬라이드 내용 */}
        <div className="onboarding-slides-wrap">
          {SLIDES.map((slide, i) => (
            <div
              key={i}
              className={`onboarding-slide${i === current ? ' active' : i < current ? ' prev' : ' next'}`}
            >
              <slide.Icon
                className={`onboarding-icon${slide.isOpening ? ' opening' : ''}`}
                style={{ color: slide.iconColor }}
              />
              <h2 className="onboarding-title">{slide.title}</h2>
              <p className="onboarding-desc">
                {slide.desc.split('\n').map((line, j) => (
                  <React.Fragment key={j}>{line}{j < slide.desc.split('\n').length - 1 && <br />}</React.Fragment>
                ))}
              </p>
            </div>
          ))}
        </div>

        {/* 점 인디케이터 */}
        <div className="onboarding-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`onboarding-dot${i === current ? ' active' : ''}`}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>

        {/* 다음 / 시작하기 */}
        <button className="onboarding-next-btn" onClick={goNext}>
          {isLast ? '알겠어요!' : current === 0 ? '기능 둘러보기 →' : '다음'}
        </button>
      </div>
    </div>
  );
};

export default OnboardingSlides;
