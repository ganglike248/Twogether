// src/components/Auth/InviteStep.jsx
// 초대하는 쪽 — 연애 시작일 입력 → 초대 코드 생성 → 코드 보내기/복사 + 상대 기다리는 중.
// 연애 시작일은 홈 D+day·기념일·사이드바·기록 파일 등 여러 곳이 전제로 쓰므로 비워둘 수 없게 유지(코드 만들기 전에 받음).
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { HiArrowUpOnSquare } from 'react-icons/hi2';
import { getLocalDateStr } from '../../utils/dataUtils';
import { shareInviteCode } from '../../services/inviteShare';

const BackButton = ({ onClick }) => (
  <button type="button" className="auth-back" onClick={onClick} aria-label="뒤로">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  </button>
);

const InviteStep = ({ code, myName, anniversaryDate, onDateChange, onCreate, loading, error, onBack }) => {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      const result = await shareInviteCode(code);
      if (result === 'copied') toast.success('초대 메시지를 복사했어요. 상대에게 붙여넣어 보내 주세요.');
    } catch {
      toast.error('보내지 못했어요. 코드를 복사해서 전달해 주세요.');
    } finally {
      setSharing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('초대 코드를 복사했어요.');
    } catch {
      toast.error('복사하지 못했어요. 코드를 직접 알려 주세요.');
    }
  };

  // 1) 코드 만들기 전: 연애 시작일
  if (!code) {
    return (
      <form className="auth-screen" onSubmit={onCreate} noValidate>
        <BackButton onClick={onBack} />
        <h1 className="auth-title">우리가 처음 만난 날은<br />언제인가요?</h1>
        <p className="auth-desc">홈에 함께한 날(D+day)과 기념일이 표시돼요.<br />나중에 커플 정보에서 바꿀 수 있어요.</p>

        <div className="auth-field">
          <label htmlFor="anniversary">연애 시작일</label>
          {/* toISOString() 대신 getLocalDateStr() — KST 자정~9시엔 UTC 변환으로 오늘을 못 고르던 버그 방지 */}
          <input
            id="anniversary"
            type="date"
            value={anniversaryDate}
            onChange={e => onDateChange(e.target.value)}
            max={getLocalDateStr()}
            required
          />
        </div>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <div className="auth-actions">
          <button type="submit" className="auth-btn" disabled={loading || !anniversaryDate}>
            {loading ? '코드 만드는 중...' : '초대 코드 만들기'}
          </button>
        </div>
      </form>
    );
  }

  // 2) 코드 생성 후: 보내기 + 기다리는 중
  return (
    <div className="auth-screen">
      <BackButton onClick={onBack} />
      <h1 className="auth-title">이 코드를 보내 주세요</h1>
      <p className="auth-desc">상대가 입력하는 순간 바로 연결돼요.</p>

      <div className="invite-code-card">
        <span className="collage-tape" aria-hidden="true" />
        <span className="auth-hint">초대 코드</span>
        <span className="invite-code" aria-label={`초대 코드 ${code.split('').join(' ')}`}>{code}</span>
        <div className="invite-code-actions">
          <button type="button" className="auth-btn" onClick={handleShare} disabled={sharing}>
            <HiArrowUpOnSquare className="auth-btn-icon" aria-hidden="true" />
            코드 보내기
          </button>
          <button type="button" className="auth-btn secondary" onClick={handleCopy}>복사</button>
        </div>
      </div>

      <div className="name-tags" aria-hidden="true">
        <div className="name-tag me">
          <span className="name-tag-stripe" />
          <span className="name-tag-body">
            <span className="name-tag-role">나</span>
            <span className="name-tag-name">{myName || '나'}</span>
          </span>
        </div>
        <span className="name-tag-dots" />
        <div className="name-tag waiting">
          <span className="name-tag-body">
            <span className="name-tag-role">상대</span>
            <span className="name-tag-name">기다리는 중</span>
          </span>
        </div>
      </div>
      <p className="invite-waiting-note" role="status">
        이 화면을 닫아도 괜찮아요.<br />다시 들어오면 같은 코드가 그대로 있어요.
      </p>
    </div>
  );
};

export default InviteStep;
