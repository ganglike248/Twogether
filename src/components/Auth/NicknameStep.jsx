// src/components/Auth/NicknameStep.jsx
// 첫 실행 닉네임 단계 — 가입 직후 커플 연결 전에 한 번. 이메일 가입은 빈 이름으로 계정이 만들어지고,
// 구글 가입은 구글 이름(실명일 수 있음)이 미리 채워진 채로 시작함. 저장하면 users.nicknameConfirmed=true.
import React, { useState } from 'react';
import { confirmNickname } from '../../services/authService';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import './AuthFlow.css';

const MAX_LENGTH = 20;

const NicknameStep = ({ initialName = '', onDone, onBack }) => {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const trimmed = name.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!trimmed) return;
    setError('');
    setLoading(true);
    try {
      await confirmNickname(trimmed);
      onDone?.();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, '저장하지 못했어요. 다시 시도해 주세요.'));
      setLoading(false);
    }
  };

  return (
    <form className="auth-screen" onSubmit={handleSubmit} noValidate>
      {onBack && (
        <button type="button" className="auth-back" onClick={onBack} aria-label="뒤로">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      <div className="auth-progress" role="img" aria-label="3단계 중 1단계">
        <span className="on" /><span /><span />
      </div>

      <h1 className="auth-title" style={{ marginTop: onBack ? 24 : 30 }}>상대가 나를<br />뭐라고 부르면 좋을까요?</h1>
      <p className="auth-desc">
        {onBack
          ? '연결하기 전에 언제든 다시 바꿀 수 있어요.'
          : initialName ? '구글 이름을 그대로 쓰지 않아도 돼요.' : '짧고 부르기 쉬운 이름이면 좋아요.'}
        <br />나중에 프로필에서 바꿀 수 있어요.
      </p>

      <div className="auth-field">
        <label htmlFor="nickname">닉네임</label>
        <input
          id="nickname"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={MAX_LENGTH}
          autoComplete="nickname"
          required
        />
      </div>

      <div className="nickname-preview" aria-hidden="true">
        <span className="auth-hint">상대 화면에서는 이렇게 보여요</span>
        <div className="nickname-preview-card">
          <span className="auth-hint">오늘 · 오후 7:00</span>
          <span className="nickname-preview-title">성수동 저녁 약속</span>
          <span className="nickname-preview-badge">{trimmed || '나'}님이 추가함</span>
        </div>
      </div>

      {error && <p className="auth-error" role="alert">{error}</p>}

      <div className="auth-actions">
        <button type="submit" className="auth-btn" disabled={loading || !trimmed}>
          {loading ? '저장하는 중...' : '다음'}
        </button>
      </div>
    </form>
  );
};

export default NicknameStep;
