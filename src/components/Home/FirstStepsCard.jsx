// src/components/Home/FirstStepsCard.jsx
// 홈 '오늘' 탭 맨 위 "우리 둘의 첫 걸음" — 예전 기능 설명 슬라이드(TutorialSlides) 대신 해보면서 익히게 함(첫 실행 리디자인 ④).
// 할 일 4개는 실제 데이터로 자동 체크(별도 저장 없음), 둘 중 누가 해도 체크되고 알 수 있으면 누가 했는지 표시.
// 끄면 users/{uid}.firstStepsDismissed=true — 기존 사용자도 업데이트 후 한 번 보고, 설정 → "첫 걸음 다시 보기"로 다시 켤 수 있음.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HiCheck } from 'react-icons/hi2';
import mascotImg from '../images/mascot.png';
import { getLocalDateStr } from '../../utils/dataUtils';
import './FirstStepsCard.css';

const FirstStepsCard = ({ events, bucketList, sealedMessages, heroImageUrl, coupleDoc, myUid, getName, onDismiss }) => {
  const navigate = useNavigate();

  // 역할 → 커플 색 (members[0]=boyfriend, members[1]=girlfriend)
  const roleOf = (uid) => {
    const idx = coupleDoc?.members?.indexOf(uid);
    return idx === 0 ? 'boyfriend' : idx === 1 ? 'girlfriend' : null;
  };
  const byLabel = (uid, verb) => {
    if (!uid) return null;
    return { text: uid === myUid ? `내가 ${verb}` : `${getName(uid)}님이 ${verb}`, role: roleOf(uid) };
  };

  const firstCoupleEvent = events.find(e => !e.extendedProps?.isTrip && !e.extendedProps?.isPersonal);
  const firstBucket = bucketList[0];
  const firstLetter = sealedMessages[0];

  const steps = [
    {
      key: 'event',
      title: '다음 데이트 일정 남기기',
      done: !!firstCoupleEvent,
      by: byLabel(firstCoupleEvent?.extendedProps?.createdBy, '남김'),
      go: () => navigate(`/calendar/event/new/${getLocalDateStr()}`, { state: { modal: true } }),
    },
    {
      key: 'bucket',
      title: '같이 하고 싶은 것 하나 담기',
      done: !!firstBucket,
      by: byLabel(firstBucket?.createdBy, '담음'),
      go: () => navigate('/bucket', { replace: true }),
    },
    {
      key: 'photo',
      title: '우리 사진 걸어두기',
      done: !!heroImageUrl,
      by: null,
      go: () => navigate('/profile'),
    },
    {
      key: 'letter',
      title: '봉인 편지 한 통 써보기',
      done: !!firstLetter,
      by: byLabel(firstLetter?.authorUid, '씀'),
      go: () => navigate('/letters'),
    },
  ];
  const doneCount = steps.filter(s => s.done).length;
  const allDone = doneCount === steps.length;

  return (
    <section className="home-card first-steps" aria-label="우리 둘의 첫 걸음">
      <div className="first-steps-head">
        <img src={mascotImg} alt="" className="first-steps-mascot" />
        <div className="first-steps-head-text">
          <span className="first-steps-title">우리 둘의 첫 걸음</span>
          <span className="first-steps-sub">
            {allDone ? '다 해봤어요! 이제 우리두리가 익숙하죠?' : '해보면서 익혀요 · 둘 중 누가 해도 돼요'}
          </span>
        </div>
        <span className="first-steps-count"><em>{doneCount}</em>/{steps.length}</span>
      </div>
      <div className="first-steps-bar" aria-hidden="true">
        <span style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>

      <ul className="first-steps-list">
        {steps.map(step => (
          <li key={step.key}>
            {step.done ? (
              <div className="first-steps-item done">
                <span className="first-steps-check on" aria-hidden="true"><HiCheck /></span>
                <span className="first-steps-item-title">{step.title}</span>
                {step.by && (
                  <span className={`first-steps-by ${step.by.role || ''}`}>{step.by.text}</span>
                )}
                <span className="sr-only">완료</span>
              </div>
            ) : (
              <button type="button" className="first-steps-item" onClick={step.go}>
                <span className="first-steps-check" aria-hidden="true" />
                <span className="first-steps-item-title">{step.title}</span>
                <span className="first-steps-go">하러 가기 ›</span>
              </button>
            )}
          </li>
        ))}
      </ul>

      <button type="button" className="first-steps-dismiss" onClick={onDismiss}>
        {allDone ? '닫기' : '닫기 · 설정에서 다시 볼 수 있어요'}
      </button>
    </section>
  );
};

export default FirstStepsCard;
