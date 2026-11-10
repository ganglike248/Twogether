// src/components/Auth/EmailAuthForm.jsx
// 이메일 가입/로그인 화면. 닉네임은 여기서 받지 않고, 가입 직후 커플 연결 전 닉네임 단계
// (NicknameStep)에서 구글 가입자와 똑같이 정함.
import React, { useState } from 'react';
import { signUpWithEmail, signInWithEmail } from '../../services/authService';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';

const BackIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const EmailAuthForm = ({ mode, onBack, onForgot, onSwitchMode }) => {
  const isSignUp = mode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (isSignUp) {
      if (password.length < 6) {
        setError('비밀번호는 6자 이상이어야 해요.');
        return;
      }
      if (password !== passwordConfirm) {
        setError('비밀번호가 서로 달라요. 다시 확인해 주세요.');
        return;
      }
    }
    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email.trim(), password, '');
      } else {
        await signInWithEmail(email.trim(), password);
      }
      // 성공하면 AuthContext가 로그인 상태를 감지해 LoginPage가 다음 화면으로 보냄
    } catch (err) {
      setError(getFriendlyErrorMessage(err, '잠시 후 다시 시도해 주세요.'));
      setLoading(false);
    }
  };

  return (
    <form className="auth-screen" onSubmit={handleSubmit} noValidate>
      <button type="button" className="auth-back" onClick={onBack} aria-label="뒤로">
        <BackIcon />
      </button>

      <h1 className="auth-title">{isSignUp ? '이메일로 가입해요' : '다시 만나서 반가워요'}</h1>
      <p className="auth-desc">
        {isSignUp ? '닉네임은 다음 단계에서 정해요.' : '가입한 이메일로 로그인해 주세요.'}
      </p>

      <div className="auth-fields">
        <div className="auth-field">
          <label htmlFor="auth-email">이메일</label>
          <input
            id="auth-email"
            type="email"
            inputMode="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="auth-field">
          <label htmlFor="auth-password">비밀번호</label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            required
          />
          {isSignUp && <span className="auth-hint">6자 이상</span>}
        </div>
        {isSignUp && (
          <div className="auth-field">
            <label htmlFor="auth-password-confirm">비밀번호 확인</label>
            <input
              id="auth-password-confirm"
              type="password"
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
        )}
      </div>

      {error && <p className="auth-error" role="alert">{error}</p>}

      <div className="auth-actions">
        <button type="submit" className="auth-btn" disabled={loading || !email || !password}>
          {loading ? (isSignUp ? '가입하는 중...' : '로그인하는 중...') : (isSignUp ? '가입하기' : '로그인')}
        </button>
        {isSignUp ? (
          <button type="button" className="auth-link" onClick={onSwitchMode}>
            이미 계정이 있나요? <strong>로그인</strong>
          </button>
        ) : (
          <>
            <button type="button" className="auth-link" onClick={onForgot}>비밀번호를 잊었어요</button>
            <button type="button" className="auth-link" onClick={onSwitchMode}>
              처음이신가요? <strong>가입하기</strong>
            </button>
          </>
        )}
      </div>
    </form>
  );
};

export default EmailAuthForm;
