// src/components/Auth/CoupleChoiceStep.jsx
// 커플 연결 방법 고르기 — 예전 "새 커플 시작 / 초대 코드 입력" 탭은 설명 문단을 읽어야 이해됐음.
// 누가 무엇을 하는지가 바로 보이는 선택 카드 두 장으로 바꿈(2026-11 첫 실행 리디자인 ②).
import React from 'react';
import { HiEnvelope, HiKey, HiChevronRight } from 'react-icons/hi2';

const CoupleChoiceStep = ({ onBack, onInvite, onJoin, onLogout, onDeleteAccount, formerPanel }) => (
  <div className="auth-screen">
    {/* 뒤로 = 닉네임 다시 정하기 */}
    <button type="button" className="auth-back" onClick={onBack} aria-label="닉네임 다시 정하기">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
    <div className="auth-progress" role="img" aria-label="3단계 중 2단계">
      <span className="on" /><span className="on" /><span />
    </div>

    <h1 className="auth-title" style={{ marginTop: 24 }}>이제 상대와<br />연결해 볼까요?</h1>
    <p className="auth-desc">둘 중 한 명만 초대하면 돼요.</p>

    {formerPanel && <div className="couple-former">{formerPanel}</div>}

    <div className="couple-choice-list">
      <button type="button" className="couple-choice-card" onClick={onInvite}>
        <span className="couple-choice-icon invite" aria-hidden="true"><HiEnvelope /></span>
        <span className="couple-choice-text">
          <span className="couple-choice-title">내가 초대할게요</span>
          <span className="couple-choice-sub">초대 코드를 만들어 상대에게 보내요</span>
        </span>
        <HiChevronRight className="couple-choice-arrow" aria-hidden="true" />
      </button>
      <button type="button" className="couple-choice-card" onClick={onJoin}>
        <span className="couple-choice-icon join" aria-hidden="true"><HiKey /></span>
        <span className="couple-choice-text">
          <span className="couple-choice-title">초대 코드를 받았어요</span>
          <span className="couple-choice-sub">받은 6자리 코드를 입력해요</span>
        </span>
        <HiChevronRight className="couple-choice-arrow" aria-hidden="true" />
      </button>
    </div>

    {/* 커플이 없으면 프로필에 못 들어가므로 탈퇴 입구는 여기에도 남겨둠(앱 내 계정 삭제 정책) */}
    <div className="auth-actions">
      <div className="auth-footer-links">
        <button type="button" className="auth-link" onClick={onLogout}>로그아웃</button>
        <button type="button" className="auth-link" onClick={onDeleteAccount}>회원 탈퇴</button>
      </div>
    </div>
  </div>
);

export default CoupleChoiceStep;
