// src/components/Auth/LoginPage.jsx
// 로그인 전 첫 실행 흐름의 진입점. 단계는 URL 쿼리(?step=)로 관리 — 앱 전체 모달 구조와 같은
// 방식이라 안드로이드 하드웨어 뒤로가기가 이전 단계로 자연스럽게 돌아감.
//   (없음) 시작 화면 · signup 이메일 가입 · login 이메일 로그인 · reset 비밀번호 찾기
import React, { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { signInWithGoogle, linkPendingGoogleCredential } from '../../services/authService';
import { useAuthContext } from '../../contexts/AuthContext';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import WelcomeScreen from './WelcomeScreen';
import EmailAuthForm from './EmailAuthForm';
import PasswordResetForm from './PasswordResetForm';
import GoogleConflictForm from './GoogleConflictForm';
import './AuthFlow.css';

const STEPS = ['signup', 'login', 'reset'];

// 사용자가 구글 계정 선택창을 직접 닫은 경우는 에러로 보여주지 않음
const isUserCancelledGoogleSignIn = (err) => {
  const code = err?.code || '';
  const message = (err?.message || '').toLowerCase();
  return (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    message.includes('cancel')
  );
};

const LoginPage = () => {
  const { user, loading: authLoading } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const stepParam = searchParams.get('step');
  const step = STEPS.includes(stepParam) ? stepParam : null;

  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  // 이메일/비밀번호로 이미 가입된 이메일로 구글 로그인을 시도한 경우 — 비밀번호를 다시
  // 확인받아 그 계정에 구글 로그인을 연동해줌 (신규 계정이 따로 생기는 걸 방지)
  const [googleConflict, setGoogleConflict] = useState(null); // { email, pendingCredential } | null

  const goStep = (next) => setSearchParams(next ? { step: next } : {});
  // 단계 간 이동은 push라 뒤로가기로 되돌아감. 화면 안의 "뒤로" 버튼도 같은 효과를 내되,
  // 바로 이 화면으로 들어온 경우(히스토리 없음)에도 시작 화면으로 가도록 history 대신 직접 지정
  const goBack = (fallback = null) => setSearchParams(fallback ? { step: fallback } : {}, { replace: true });

  const handleGoogle = async () => {
    setGoogleError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      if (err.code === 'account-exists-with-different-credential') {
        setGoogleConflict({ email: err.email, pendingCredential: err.pendingCredential });
      } else if (!isUserCancelledGoogleSignIn(err)) {
        setGoogleError(getFriendlyErrorMessage(err, '구글 로그인에 실패했어요. 다시 시도해 주세요.'));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // 로그인되면 ProtectedRoute가 닉네임/커플 연결/홈 중 알맞은 곳으로 보냄
  if (!authLoading && user) return <Navigate to="/" replace />;

  if (googleConflict) {
    return (
      <GoogleConflictForm
        email={googleConflict.email}
        onSubmit={(password) => linkPendingGoogleCredential(googleConflict.email, password, googleConflict.pendingCredential)}
        onCancel={() => setGoogleConflict(null)}
      />
    );
  }

  if (step === 'signup' || step === 'login') {
    return (
      <EmailAuthForm
        key={step}
        mode={step}
        onBack={() => goBack()}
        onForgot={() => goStep('reset')}
        onSwitchMode={() => setSearchParams({ step: step === 'signup' ? 'login' : 'signup' }, { replace: true })}
      />
    );
  }

  if (step === 'reset') {
    return <PasswordResetForm onBack={() => goBack('login')} />;
  }

  return (
    <WelcomeScreen
      onGoogle={handleGoogle}
      googleLoading={googleLoading}
      onEmailSignUp={() => goStep('signup')}
      onEmailLogin={() => goStep('login')}
      error={googleError}
    />
  );
};

export default LoginPage;
