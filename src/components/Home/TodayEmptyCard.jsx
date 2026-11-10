// src/components/Home/TodayEmptyCard.jsx
// 홈 '오늘' 탭이 통째로 비었을 때(여행·오늘 일정·다음 일정·디데이 없음 + 첫 걸음 카드 꺼짐) 보여주는 카드.
// 빈 화면 대신 바로 할 수 있는 것 세 가지로 이어줌 — 일정 추가 / 여행 계획 / 돌림판으로 데이트 정하기.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HiCalendarDays, HiPaperAirplane, HiSparkles } from 'react-icons/hi2';
import mascotImg from '../images/mascot.png';
import { getLocalDateStr } from '../../utils/dataUtils';
import './TodayEmptyCard.css';

const TodayEmptyCard = () => {
  const navigate = useNavigate();
  const actions = [
    { key: 'event', Icon: HiCalendarDays, label: '일정 추가', onClick: () => navigate(`/calendar/event/new/${getLocalDateStr()}`, { state: { modal: true } }) },
    { key: 'trip', Icon: HiPaperAirplane, label: '여행 계획', onClick: () => navigate('/travel', { replace: true }) },
    { key: 'wheel', Icon: HiSparkles, label: '데이트 고르기', onClick: () => navigate('/?modal=wheel', { state: { modal: true } }) },
  ];

  return (
    <section className="home-card today-empty" aria-label="오늘">
      <img src={mascotImg} alt="" className="today-empty-mascot" />
      <p className="today-empty-title">다가오는 일정이 아직 없어요</p>
      <p className="today-empty-desc">다음 데이트를 같이 정해 볼까요?</p>
      <div className="today-empty-actions">
        {actions.map(({ key, label, onClick, Icon: icon }) => (
          <button key={key} type="button" className="today-empty-action" onClick={onClick}>
            <span className="today-empty-action-icon" aria-hidden="true">{React.createElement(icon)}</span>
            {label}
          </button>
        ))}
      </div>
    </section>
  );
};

export default TodayEmptyCard;
