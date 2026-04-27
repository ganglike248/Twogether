import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiInformationCircle } from 'react-icons/hi2';
import { useAuthContext } from '../../contexts/AuthContext';
import CycleSettingsModal from '../Profile/CycleSettingsModal';
import './SettingsPage.css';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { coupleDoc } = useAuthContext();
  const [showCycleModal, setShowCycleModal] = useState(false);

  return (
    <div className="settings-page">
      <p className="profile-section-label" style={{ marginTop: '0.875rem', marginBottom: '1rem' }}>설정</p>

      {/* 생리주기 설정 */}
      <button
        className="profile-cycle-btn"
        onClick={() => setShowCycleModal(true)}
      >
        <span className="profile-cycle-btn-icon">
          {coupleDoc?.cycleSettings?.enabled ? (coupleDoc.cycleSettings.icon || '🌸') : '🌸'}
        </span>
        <span className="profile-cycle-btn-text">
          {coupleDoc?.cycleSettings?.enabled ? '생리주기 설정 중 ✓' : '생리주기 사용하기'}
        </span>
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
        onClose={() => setShowCycleModal(false)}
      />
    </div>
  );
};

export default SettingsPage;
