// src/components/Auth/JoinStep.jsx
// 초대받은 쪽 — 6자리 초대 코드 입력. 실제 합류는 서버 콜러블(joinCoupleWithInviteCode)이 검증.
import React from 'react';

// hasSoloCouple: 이미 '새로 시작'으로 혼자 커플을 만들어 둔 경우 — 합류하면 그 커플에 넣은 기록은 옮겨지지 않음을 미리 알림(AUDIT B-4)
const JoinStep = ({ code, onCodeChange, onSubmit, loading, error, onBack, hasSoloCouple = false }) => (
  <form className="auth-screen" onSubmit={onSubmit} noValidate>
    <button type="button" className="auth-back" onClick={onBack} aria-label="뒤로">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>

    <h1 className="auth-title">받은 초대 코드를<br />입력해 주세요</h1>
    <p className="auth-desc">상대가 보낸 메시지에 있는 6자리 코드예요.</p>

    <div className="auth-field">
      <label htmlFor="invite-code">초대 코드</label>
      <input
        id="invite-code"
        className="join-code-input"
        type="text"
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        value={code}
        onChange={e => onCodeChange(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
        maxLength={6}
        autoFocus
      />
    </div>

    {hasSoloCouple && (
      <p className="auth-hint join-solo-note">
        먼저 혼자 만들어 둔 우리 공간에 넣은 일정·기록은 상대의 공간으로 옮겨지지 않아요.
      </p>
    )}

    {error && <p className="auth-error" role="alert">{error}</p>}

    <div className="auth-actions">
      <button type="submit" className="auth-btn" disabled={loading || code.length < 6}>
        {loading ? '연결하는 중...' : '연결하기'}
      </button>
    </div>
  </form>
);

export default JoinStep;
