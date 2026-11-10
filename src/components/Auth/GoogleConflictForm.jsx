// src/components/Auth/GoogleConflictForm.jsx
// 이미 이메일/비밀번호로 가입된 주소로 구글 로그인을 시도했을 때 — 기존 비밀번호를 확인받아
// 그 계정에 구글 로그인을 연결함(새 계정이 따로 생기지 않음). 로직은 authService.linkPendingGoogleCredential.
import React, { useState } from 'react';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';

const GoogleConflictForm = ({ email, onSubmit, onCancel }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit(password);
      // 성공하면 AuthContext가 로그인 상태를 감지해 다음 화면으로 이동
    } catch (err) {
      setError(getFriendlyErrorMessage(err, '연결하지 못했어요. 다시 시도해 주세요.'));
      setLoading(false);
    }
  };

  return (
    <form className="auth-screen" onSubmit={handleSubmit} noValidate>
      <button type="button" className="auth-back" onClick={onCancel} aria-label="취소">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <h1 className="auth-title">이미 가입한 계정이 있어요</h1>
      <p className="auth-conflict-msg">
        <strong>{email}</strong>(으)로 가입된 계정이 있어요.
        비밀번호를 입력하면 이 계정에 구글 로그인을 연결해 드릴게요.
      </p>

      <div className="auth-fields">
        <div className="auth-field">
          <label htmlFor="conflict-password">기존 계정 비밀번호</label>
          <input
            id="conflict-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
          />
        </div>
      </div>

      {error && <p className="auth-error" role="alert">{error}</p>}

      <div className="auth-actions">
        <button type="submit" className="auth-btn" disabled={loading || !password}>
          {loading ? '연결하는 중...' : '연결하고 로그인'}
        </button>
        <button type="button" className="auth-link" onClick={onCancel}>취소</button>
      </div>
    </form>
  );
};

export default GoogleConflictForm;
