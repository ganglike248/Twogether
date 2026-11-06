// src/components/Account/DeleteAccountPage.jsx
// 회원 탈퇴(/delete-account) — 앱 안에서 직접 계정을 삭제하는 경로(App Store 5.1.1(v), Google Play 계정 삭제 요건).
// 커플이 없어도 들어와야 해서(커플 연결 화면에서도 진입) ProtectedRoute 밖, 로그인만 확인.
// 흐름: 삭제되는 것 안내 + 기록 파일 저장 + 확인 체크 → 비밀번호/구글로 다시 확인 → deleteMyAccount → 로그인 화면.
// 서버 정책(functions/coupleLifecycle.js): 개인 데이터·계정은 즉시 삭제, 커플 기록은 남은 사람을 위해 30일 보관 후 삭제.
import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { HiArrowLeft, HiArrowDownTray } from 'react-icons/hi2';
import { FcGoogle } from 'react-icons/fc';
import { useAuthContext } from '../../contexts/AuthContext';
import useRecordSave from '../../hooks/useRecordSave';
import useFormerCouples from '../../hooks/useFormerCouples';
import FormerCouplesPanel from './FormerCouplesPanel';
import {
  getSignInProviders, reauthenticateWithPassword, reauthenticateWithGoogle, signOut,
} from '../../services/authService';
import { deleteMyAccount, isRecentLoginRequired } from '../../services/coupleLifecycleService';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import './account.css';

const DeleteAccountPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, coupleDoc, coupleId, partnerDoc, loading } = useAuthContext();
  const { saving, saveCurrent } = useRecordSave();
  const { couples: formerCouples } = useFormerCouples(!!user);
  const [checked, setChecked] = useState(false);
  const [step, setStep] = useState('warn'); // 'warn' | 'confirm'
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!loading && !user) return <Navigate to="/login" replace />;
  if (loading || !user) return null;

  const withPartner = coupleDoc?.members?.length === 2;
  const soloCouple = !!coupleId && !withPartner;
  const partnerName = partnerDoc?.displayName || '상대방';
  const providers = getSignInProviders();
  const hasPassword = providers.includes('password');
  const hasGoogle = providers.includes('google.com');

  const goBack = () => {
    if (location.key === 'default') navigate(coupleId ? '/profile' : '/couple-setup', { replace: true });
    else navigate(-1);
  };

  const runDelete = async () => {
    await deleteMyAccount();
    // 서버가 계정을 지웠어도 이 기기엔 세션이 남아 있으므로 정리
    try { await signOut(); } catch { /* 이미 무효화된 세션 */ }
    toast.success('탈퇴가 완료됐어요. 그동안 우리두리와 함께해 주셔서 고마워요.');
    navigate('/login', { replace: true });
  };

  const confirmWith = async (reauth) => {
    if (deleting) return;
    setError('');
    setDeleting(true);
    try {
      await reauth();
      await runDelete();
    } catch (err) {
      console.error('회원 탈퇴 실패:', err);
      setError(isRecentLoginRequired(err)
        ? '보안 확인 시간이 지났어요. 다시 한 번 확인해주세요.'
        : getFriendlyErrorMessage(err, '탈퇴하지 못했어요. 잠시 후 다시 시도해주세요.'));
      setDeleting(false);
    }
  };

  return (
    <div className="acc-page">
      <div className="acc-page-inner">
        <div className="acc-page-header">
          <button type="button" className="acc-back" onClick={goBack} aria-label="뒤로" disabled={deleting}>
            <HiArrowLeft />
          </button>
          <p className="profile-section-label" style={{ margin: 0 }}>회원 탈퇴</p>
        </div>

        <div className="acc-section">
          <p className="acc-title">탈퇴하면 이렇게 돼요</p>
          <ul className="acc-list">
            <li><strong>내 계정과 개인 일정</strong>이 바로 삭제돼요.</li>
            {withPartner && (
              <li>
                커플 연결이 해제돼요. {partnerName}님은 <strong>30일 동안</strong> 우리 기록을 파일로 저장할 수 있고,
                그 뒤 모든 기록(일정·여행·버킷리스트·봉인 편지)이 <strong>완전히 삭제</strong>돼요.
              </li>
            )}
            {soloCouple && <li>혼자 만들어 둔 커플과 그 기록도 <strong>바로 삭제</strong>돼요.</li>}
            {formerCouples.length > 0 && <li>보관 중인 이전 커플 기록은 상대방이 남은 기간 동안 저장할 수 있고, 그 뒤 삭제돼요.</li>}
            <li>삭제된 계정과 기록은 <strong>되돌릴 수 없어요.</strong></li>
          </ul>

          {coupleId && (
            <div className="acc-save-box">
              <p>함께한 기록을 간직하고 싶다면 탈퇴 전에 파일로 저장해 두세요.</p>
              <button type="button" className="acc-save-btn" onClick={saveCurrent} disabled={!!saving || deleting}>
                <HiArrowDownTray />
                {saving === 'current' ? '기록을 모으는 중…' : '기록 파일 저장'}
              </button>
            </div>
          )}
        </div>

        {formerCouples.length > 0 && <FormerCouplesPanel couples={formerCouples} allowCancel={false} />}

        {step === 'warn' ? (
          <div className="acc-section">
            <label className="acc-check" htmlFor="delete-ack">
              <input id="delete-ack" type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
              위 내용을 모두 확인했고, 탈퇴할게요.
            </label>
            <div className="acc-actions">
              <button type="button" className="btn btn-secondary" onClick={goBack}>취소</button>
              <button type="button" className="btn btn-danger" disabled={!checked || !!saving} onClick={() => setStep('confirm')}>
                탈퇴하기
              </button>
            </div>
          </div>
        ) : (
          <div className="acc-section">
            <p className="acc-title">본인 확인</p>
            <p className="acc-text">보안을 위해 한 번 더 확인할게요. 확인하면 바로 탈퇴가 진행돼요.</p>
            {hasPassword && (
              <form
                className="acc-field"
                onSubmit={(e) => { e.preventDefault(); if (password) confirmWith(() => reauthenticateWithPassword(password)); }}
              >
                <label htmlFor="delete-password">비밀번호</label>
                <input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={deleting}
                />
                <button type="submit" className="btn btn-danger" disabled={!password || deleting} style={{ marginTop: '0.4rem' }}>
                  {deleting ? '탈퇴하는 중…' : '확인하고 탈퇴'}
                </button>
              </form>
            )}
            {hasPassword && hasGoogle && <div className="acc-divider">또는</div>}
            {hasGoogle && (
              <button type="button" className="acc-google-btn" onClick={() => confirmWith(reauthenticateWithGoogle)} disabled={deleting}>
                <FcGoogle /> {deleting ? '탈퇴하는 중…' : '구글 계정으로 확인하고 탈퇴'}
              </button>
            )}
            {error && <p className="acc-error">{error}</p>}
            <button type="button" className="btn btn-secondary" onClick={() => { setStep('warn'); setError(''); }} disabled={deleting}>
              돌아가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeleteAccountPage;
