// src/components/Auth/PasswordResetForm.jsx
// 비밀번호 재설정 메일 보내기. 결과 문구는 계정 존재 여부를 드러내지 않음 —
// Firebase 이메일 열거 보호가 켜져 있으면 가입 안 된 주소여도 성공으로 끝나기 때문.
import React, { useState } from 'react';
import { sendPasswordReset } from '../../services/authService';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';

const PasswordResetForm = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, '메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-screen" onSubmit={handleSubmit} noValidate>
      <button type="button" className="auth-back" onClick={onBack} aria-label="뒤로">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <h1 className="auth-title">비밀번호를 다시 정해요</h1>
      <p className="auth-desc">가입한 이메일로 재설정 링크를 보내 드려요.<br />구글로 가입했다면 구글로 시작하기를 눌러 주세요.</p>

      <div className="auth-fields">
        <div className="auth-field">
          <label htmlFor="reset-email">이메일</label>
          <input
            id="reset-email"
            type="email"
            inputMode="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setSent(false); }}
            autoComplete="email"
            required
          />
        </div>
      </div>

      {error && <p className="auth-error" role="alert">{error}</p>}
      {sent && (
        <p className="auth-notice" role="status">
          가입된 계정이 있다면 <strong>{email.trim()}</strong>로 메일을 보냈어요.
          메일이 안 보이면 스팸함도 확인해 주세요.
        </p>
      )}

      <div className="auth-actions">
        <button type="submit" className="auth-btn" disabled={loading || !email}>
          {loading ? '보내는 중...' : sent ? '다시 보내기' : '재설정 메일 보내기'}
        </button>
        <button type="button" className="auth-link" onClick={onBack}>로그인으로 돌아가기</button>
      </div>
    </form>
  );
};

export default PasswordResetForm;
