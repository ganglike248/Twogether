// src/components/Account/AccountPage.jsx
// 설정 → 계정 (/account). 계정과 관련된 건 전부 여기서 — 로그인 정보, 비밀번호 변경, 연결된 계정(구글),
// 로그아웃, 회원 탈퇴. v1.0.26에서 프로필(비밀번호·구글·탈퇴)과 사이드바(로그아웃)에 흩어져 있던 걸 모음.
// 모달은 다른 화면과 같이 ?modal= 쿼리에서 파생(password | logout) — 안드로이드 뒤로가기로 닫힘.
import React from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { HiLockClosed, HiArrowRightOnRectangle } from 'react-icons/hi2';
import { useAuthContext } from '../../contexts/AuthContext';
import { signOut } from '../../services/authService';
import ChangePasswordModal from '../Profile/ChangePasswordModal';
import ConfirmModal from '../common/ConfirmModal';
import LinkedAccountsSection from './LinkedAccountsSection';
import '../Profile/ProfilePage.css';
import './account.css';
import './AccountPage.css';
import { MenuPageHeader } from '../common/MenuPage';


const PROVIDER_LABELS = { password: '이메일', 'google.com': '구글' };

const AccountPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const [searchParams] = useSearchParams();
  const modal = searchParams.get('modal');

  const providers = (user?.providerData || [])
    .map(p => PROVIDER_LABELS[p.providerId])
    .filter(Boolean);
  const hasPassword = (user?.providerData || []).some(p => p.providerId === 'password');

  const openModal = (type) => navigate(`/account?modal=${type}`, { state: { modal: true } });
  // 첫 진입(딥링크/새로고침)이면 navigate(-1)이 앱 밖으로 나갈 수 있어 대신 /account로
  const closeModal = () => {
    if (location.key === 'default') navigate('/account', { replace: true });
    else navigate(-1);
  };

  // signOut을 먼저 기다린 뒤 이동(순서 보장) — 로그아웃 리다이렉트 레이스 방지(CLAUDE.md 참고)
  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="account-page menu-page">
      <MenuPageHeader title="계정" onBack={() => navigate('/settings')} backLabel="설정으로" />

      <div className="profile-section">
        <div className="profile-section-title">로그인 정보</div>
        <div className="account-info-row">
          <span className="account-info-label">이메일</span>
          <span className="account-info-value">{user?.email || '-'}</span>
        </div>
        <div className="account-info-row">
          <span className="account-info-label">로그인 방법</span>
          <span className="account-info-value">{providers.join(' · ') || '-'}</span>
        </div>
      </div>

      {hasPassword && (
        <div className="profile-section">
          <div className="profile-section-title">보안</div>
          <button type="button" className="profile-change-password-btn" onClick={() => openModal('password')}>
            <HiLockClosed className="profile-field-icon" />
            비밀번호 변경
          </button>
        </div>
      )}

      {/* 자체적으로 profile-section 카드를 그림 */}
      <LinkedAccountsSection />

      <button type="button" className="account-logout-btn" onClick={() => openModal('logout')}>
        <HiArrowRightOnRectangle />
        로그아웃
      </button>

      {/* 앱 안 계정 삭제 경로(App Store/Play 요건) — 눈에 덜 띄는 링크로 맨 아래 */}
      <button type="button" className="acc-danger-link" onClick={() => navigate('/delete-account')}>
        회원 탈퇴
      </button>

      <ChangePasswordModal isOpen={modal === 'password'} onClose={closeModal} />
      <ConfirmModal
        isOpen={modal === 'logout'}
        title="로그아웃"
        message="정말 로그아웃할까요?"
        confirmText="로그아웃"
        danger={false}
        onConfirm={handleLogout}
        onCancel={closeModal}
      />
    </div>
  );
};

export default AccountPage;
