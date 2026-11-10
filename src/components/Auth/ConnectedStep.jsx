// src/components/Auth/ConnectedStep.jsx
// 커플 연결 완료 — "다이어리 첫 장"(두 닉네임 + 커플 색 밑줄 + 연애 시작일)과 D+N.
// 예전엔 스피너만 2초 돌다 홈으로 자동 이동했는데, 연결 순간을 한 번 보여주고 사용자가 고르게 바꿈(첫 실행 리디자인 ③).
// 합류한 쪽은 연결 직후 coupleDoc/partnerDoc 구독이 몇 백 ms 늦게 들어올 수 있어서 값이 없을 땐 자리만 비워둠.
import React from 'react';
import { HiHeart } from 'react-icons/hi2';
import mascotImg from '../images/mascot.png';
import { calcDday } from '../../utils/dataUtils';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}. ${m}. ${d}`;
};

const ConnectedStep = ({ coupleDoc, myUid, myName, partnerName, onWriteFirstEvent, onGoHome }) => {
  // members[0] = boyfriend(커플 생성자), members[1] = girlfriend(합류자) — 앱 전체 역할·색 규칙과 동일
  const members = coupleDoc?.members || [];
  const colors = coupleDoc?.eventTypeColors || {};
  const nameOf = (uid) => (uid === myUid ? myName : partnerName) || '';
  const left = { name: nameOf(members[0]), color: colors.boyfriend || 'var(--color-boyfriend)' };
  const right = { name: nameOf(members[1]), color: colors.girlfriend || 'var(--color-girlfriend)' };
  const dday = calcDday(coupleDoc?.anniversaryDate);

  return (
    <div className="auth-screen connected-screen">
      <div className="diary-page-wrap">
        <div className="diary-page">
          <span className="diary-page-spine" aria-hidden="true" />
          <span className="diary-page-label">이 다이어리의 주인</span>
          <div className="diary-page-names">
            <span className="diary-page-name" style={{ borderBottomColor: left.color }}>{left.name || ' '}</span>
            <HiHeart className="diary-page-heart" aria-hidden="true" />
            <span className="diary-page-name" style={{ borderBottomColor: right.color }}>{right.name || ' '}</span>
          </div>
          <span className="diary-page-divider" aria-hidden="true" />
          <span className="diary-page-date">{coupleDoc?.anniversaryDate ? `${formatDate(coupleDoc.anniversaryDate)} 부터` : ' '}</span>
        </div>
        <span className="collage-tape diary-page-tape" aria-hidden="true" />
        <img src={mascotImg} alt="" className="diary-page-mascot" />
      </div>

      <p className="connected-caption" role="status">연결됐어요</p>
      <h1 className="connected-dday">{dday ? `D+${dday}` : ' '}</h1>
      <p className="connected-desc">함께한 날들, 오늘부터는<br />이 다이어리에 같이 남겨요.</p>

      <div className="auth-actions">
        <button type="button" className="auth-btn" onClick={onWriteFirstEvent}>첫 일정 남기러 가기</button>
        <button type="button" className="auth-link" onClick={onGoHome}>홈으로</button>
      </div>
    </div>
  );
};

export default ConnectedStep;
