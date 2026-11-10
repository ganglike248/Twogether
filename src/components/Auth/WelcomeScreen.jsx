// src/components/Auth/WelcomeScreen.jsx
// 첫 실행 시작 화면 — 예전엔 로그인 카드 위에 기능 소개 슬라이드(OnboardingSlides)가 덮어 떴는데,
// 이 화면 자체가 앱 소개 역할을 하도록 바꿈(2026-11). 이메일은 가입/로그인 입구를 따로 둠 —
// Firebase 이메일 열거 보호 때문에 이메일만으로 "가입된 계정인지"를 판별할 수 없어서.
import React from 'react';
import { Link } from 'react-router-dom';
import { HiHeart } from 'react-icons/hi2';
import { FcGoogle } from 'react-icons/fc';
import WelcomeCollage from './WelcomeCollage';

const WelcomeScreen = ({ onGoogle, googleLoading, onEmailSignUp, onEmailLogin, error }) => (
  <div className="auth-screen">
    <div className="welcome-logo">
      <HiHeart className="welcome-logo-heart" aria-hidden="true" />
      <h1 className="welcome-logo-text">우리두리</h1>
    </div>

    <WelcomeCollage />

    <h2 className="welcome-headline">둘이 함께 쓰는<br />우리 다이어리</h2>
    <p className="welcome-sub">일정도, 여행도, 하고 싶은 것도<br />한 곳에 같이 모아요.</p>

    {error && <p className="auth-error">{error}</p>}

    <div className="auth-actions">
      <button type="button" className="auth-btn secondary" onClick={onGoogle} disabled={googleLoading}>
        <FcGoogle className="auth-btn-icon" aria-hidden="true" />
        {googleLoading ? '연결하는 중...' : '구글로 시작하기'}
      </button>
      <button type="button" className="auth-btn" onClick={onEmailSignUp}>
        이메일로 시작하기
      </button>
      <button type="button" className="auth-link" onClick={onEmailLogin}>
        이미 계정이 있나요? <strong>로그인</strong>
      </button>
      <p className="welcome-legal">
        시작하면 <Link to="/terms">이용약관</Link>과 <Link to="/privacy">개인정보처리방침</Link>에 동의하게 돼요.
      </p>
    </div>
  </div>
);

export default WelcomeScreen;
