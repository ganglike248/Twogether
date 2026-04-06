// src/components/Auth/LoginPage.jsx
import React, { useState } from 'react';
import { signUpWithEmail, signInWithEmail } from '../../services/authService';
import { HiHeart } from 'react-icons/hi2';
import './LoginPage.css';

const LoginPage = () => {
  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setPasswordConfirm('');
    setError('');
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    resetForm();
  };

  const getErrorMessage = (code) => {
    switch (code) {
      case 'auth/email-already-in-use': return '이미 사용 중인 이메일입니다.';
      case 'auth/invalid-email': return '유효하지 않은 이메일 형식입니다.';
      case 'auth/weak-password': return '비밀번호는 6자 이상이어야 합니다.';
      case 'auth/user-not-found': return '등록되지 않은 이메일입니다.';
      case 'auth/wrong-password': return '비밀번호가 올바르지 않습니다.';
      case 'auth/invalid-credential': return '이메일 또는 비밀번호가 올바르지 않습니다.';
      case 'auth/too-many-requests': return '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
      default: return '오류가 발생했습니다. 다시 시도해주세요.';
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    if (!displayName.trim()) {
      setError('닉네임을 입력해주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email, password, displayName.trim());
    } catch (err) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-logo">
          <HiHeart className="login-heart" />
          <h1 className="login-title">우리두리</h1>
          <p className="login-subtitle">우리만의 특별한 순간을 기록해요</p>
        </div>

        <div className="login-tabs">
          <button
            className={`login-tab${tab === 'login' ? ' active' : ''}`}
            onClick={() => handleTabChange('login')}
          >
            로그인
          </button>
          <button
            className={`login-tab${tab === 'signup' ? ' active' : ''}`}
            onClick={() => handleTabChange('signup')}
          >
            회원가입
          </button>
        </div>

        {tab === 'login' ? (
          <form className="login-form" onSubmit={handleLogin}>
            <div className="login-field">
              <label>이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="이메일을 입력해주세요"
                required
                autoComplete="email"
              />
            </div>
            <div className="login-field">
              <label>비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="비밀번호를 입력해주세요"
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleSignUp}>
            <div className="login-field">
              <label>닉네임</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="상대방에게 보여질 이름"
                required
                maxLength={20}
              />
            </div>
            <div className="login-field">
              <label>이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="이메일을 입력해주세요"
                required
                autoComplete="email"
              />
            </div>
            <div className="login-field">
              <label>비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="6자 이상"
                required
                autoComplete="new-password"
              />
            </div>
            <div className="login-field">
              <label>비밀번호 확인</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호를 다시 입력해주세요"
                required
                autoComplete="new-password"
              />
            </div>
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
