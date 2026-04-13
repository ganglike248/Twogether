// src/components/Onboarding/TutorialSlides.jsx
import React, { useState, useRef } from 'react';
import {
  HiHeart, HiCalendarDays, HiPhoto, HiCheckCircle, HiPaperAirplane,
} from 'react-icons/hi2';
import './TutorialSlides.css';

const SLIDES = [
  {
    Icon: HiHeart,
    iconColor: '#ff6b6b',
    title: '홈 화면',
    points: [
      'D+day와 연애 기간을 한눈에 확인',
      '다음 100일 기념일까지 D-day 카운트',
      '이번 달 일정 수 요약',
      '다음 여행 및 예정 일정 미리보기',
    ],
  },
  {
    Icon: HiCalendarDays,
    iconColor: '#4dabf7',
    title: '캘린더',
    points: [
      '데이트 약속, 기념일, 개인 일정 등록',
      '커플 / 내 일정 / 상대방 일정 색상 구분',
      '일정에 메모(일기) 남기기',
      '1년 전 오늘 일정 홈에서 회상',
    ],
  },
  {
    Icon: HiPhoto,
    iconColor: '#cc5de8',
    title: '추억 갤러리',
    points: [
      '지나온 일정들을 리스트로 모아보기',
      '날짜순으로 우리의 기록 되돌아보기',
      '일정에 남긴 메모를 한 곳에서 확인',
    ],
  },
  {
    Icon: HiCheckCircle,
    iconColor: '#51cf66',
    title: '버킷리스트',
    points: [
      '먹고 싶은 것, 가고 싶은 곳, 해보고 싶은 것 기록',
      '카테고리별로 목록 관리',
      '완료하면 체크 — 진행률 홈에서 확인',
      '둘 중 누구나 추가·수정 가능',
    ],
  },
  {
    Icon: HiPaperAirplane,
    iconColor: '#339af0',
    title: '여행',
    points: [
      '여행 날짜, 목적지, 예산 함께 계획',
      '날짜별 시간표 및 장소 등록',
      '진행 중인 여행은 홈에서 오늘 일정 확인',
      '다음 여행 D-day 홈에서 카운트다운',
    ],
  },
];

const TutorialSlides = ({ onClose }) => {
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
    <div className="tutorial-overlay">
      <div
        className="tutorial-card"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {!isLast && (
          <button className="tutorial-skip" onClick={onClose}>
            건너뛰기
          </button>
        )}

        <div className="tutorial-slides-wrap">
          {SLIDES.map((slide, i) => (
            <div
              key={i}
              className={`tutorial-slide${i === current ? ' active' : i < current ? ' prev' : ' next'}`}
            >
              <slide.Icon className="tutorial-icon" style={{ color: slide.iconColor }} />
              <h2 className="tutorial-title">{slide.title}</h2>
              <ul className="tutorial-points">
                {slide.points.map((point, j) => (
                  <li key={j} className="tutorial-point">{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="tutorial-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`tutorial-dot${i === current ? ' active' : ''}`}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>

        <button className="tutorial-next-btn" onClick={goNext}>
          {isLast ? '시작하기 💕' : '다음'}
        </button>
      </div>
    </div>
  );
};

export default TutorialSlides;
