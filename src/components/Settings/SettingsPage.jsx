import React from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { HiInformationCircle } from 'react-icons/hi2';
import { MdPalette, MdCheck, MdNotifications } from 'react-icons/md';
import { useAuthContext } from '../../contexts/AuthContext';
import CycleSettingsModal from '../Profile/CycleSettingsModal';
import EventTypeColorSettingsModal from './EventTypeColorSettingsModal';
import './SettingsPage.css';

const SettingsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { coupleDoc } = useAuthContext();
  // 모달 열림 상태를 useState 대신 ?modal= 쿼리에서 파생 — 손수 만든 pushState/popstate
  // 훅(useModalBackButton) 없이 React Router가 히스토리를 전담하게 함(캘린더와 같은 이유).
  const [searchParams] = useSearchParams();
  const modalType = searchParams.get('modal');
  const showCycleModal = modalType === 'cycle';
  const showColorModal = modalType === 'colors';

  const openModal = (type) => navigate(`/settings?modal=${type}`, { state: { modal: true } });

  // location.key === 'default'면 이 세션에서 첫 진입(딥링크/새로고침)이라 navigate(-1)이
  // 앱 밖으로 나갈 수 있어 대신 /settings로 보냄 — 캘린더 closeModal과 동일한 패턴.
  const closeModal = () => {
    if (location.key === 'default') {
      navigate('/settings', { replace: true });
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="settings-page">
      <p className="profile-section-label" style={{ marginTop: '0.875rem', marginBottom: '1rem' }}>설정</p>

      {/* 생리주기 설정 */}
      <button
        className="profile-cycle-btn"
        onClick={() => openModal('cycle')}
      >
        <span className="profile-cycle-btn-icon">
          {coupleDoc?.cycleSettings?.enabled ? (coupleDoc.cycleSettings.icon || '🌸') : '🌸'}
        </span>
        <span className="profile-cycle-btn-text">
          {coupleDoc?.cycleSettings?.enabled ? <><MdCheck className="inline-check" color="#51cf66" />생리주기 설정 중</> : '생리주기 사용하기'}
        </span>
        <span className="profile-cycle-btn-arrow">›</span>
      </button>

      {/* 이벤트 색상 설정 */}
      <button
        className="profile-cycle-btn"
        onClick={() => openModal('colors')}
      >
        <MdPalette className="profile-cycle-btn-icon" color="#cc5de8" />
        <span className="profile-cycle-btn-text">이벤트 색상 설정</span>
        <span className="profile-cycle-btn-arrow">›</span>
      </button>

      {/* 알림 설정 */}
      <button
        className="profile-cycle-btn"
        onClick={() => navigate('/notification-settings')}
      >
        <MdNotifications className="profile-cycle-btn-icon" color="#ff8787" />
        <span className="profile-cycle-btn-text">알림 설정</span>
        <span className="profile-cycle-btn-arrow">›</span>
      </button>

      {/* 앱 소개 다시보기 */}
      <button
        className="profile-onboarding-btn"
        onClick={() => navigate('/', { replace: true, state: { showTutorial: true } })}
      >
        <HiInformationCircle className="profile-onboarding-icon" />
        앱 소개 다시 보기
      </button>

      <CycleSettingsModal
        isOpen={showCycleModal}
        onClose={closeModal}
      />

      <EventTypeColorSettingsModal
        isOpen={showColorModal}
        onClose={closeModal}
      />
    </div>
  );
};

export default SettingsPage;
