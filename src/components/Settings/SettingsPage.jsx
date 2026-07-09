import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { HiInformationCircle } from 'react-icons/hi2';
import { MdPalette, MdCheck, MdNotifications, MdNotificationsOff } from 'react-icons/md';
import { useAuthContext } from '../../contexts/AuthContext';
import {
  isNotificationSupported,
  getNotificationPermission,
  enableNotifications,
  disableNotifications,
} from '../../services/notificationService';
import CycleSettingsModal from '../Profile/CycleSettingsModal';
import EventTypeColorSettingsModal from './EventTypeColorSettingsModal';
import './SettingsPage.css';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, coupleDoc } = useAuthContext();
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifSupported = isNotificationSupported();

  useEffect(() => {
    setNotifEnabled(getNotificationPermission() === 'granted');
  }, []);

  const handleToggleNotifications = async () => {
    if (!user || notifLoading) return;
    setNotifLoading(true);
    try {
      if (notifEnabled) {
        await disableNotifications(user.uid);
        setNotifEnabled(false);
        toast.success('이 기기의 알림을 껐습니다.');
      } else {
        await enableNotifications();
        setNotifEnabled(true);
        toast.success('알림이 켜졌습니다.');
      }
    } catch (err) {
      toast.error(err.message || '알림 설정 중 오류가 발생했습니다.');
    } finally {
      setNotifLoading(false);
    }
  };

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
          {coupleDoc?.cycleSettings?.enabled ? <><MdCheck className="inline-check" color="#51cf66" />생리주기 설정 중</> : '생리주기 사용하기'}
        </span>
        <span className="profile-cycle-btn-arrow">›</span>
      </button>

      {/* 이벤트 색상 설정 */}
      <button
        className="profile-cycle-btn"
        onClick={() => setShowColorModal(true)}
      >
        <MdPalette className="profile-cycle-btn-icon" color="#cc5de8" />
        <span className="profile-cycle-btn-text">이벤트 색상 설정</span>
        <span className="profile-cycle-btn-arrow">›</span>
      </button>

      {/* 알림 설정 */}
      <button
        className="profile-cycle-btn"
        onClick={handleToggleNotifications}
        disabled={!notifSupported || notifLoading}
      >
        {notifEnabled ? (
          <MdNotifications className="profile-cycle-btn-icon" color="#ff8787" />
        ) : (
          <MdNotificationsOff className="profile-cycle-btn-icon" color="#adb5bd" />
        )}
        <span className="profile-cycle-btn-text">
          {!notifSupported
            ? '이 브라우저는 알림을 지원하지 않아요'
            : notifEnabled
            ? <><MdCheck className="inline-check" color="#51cf66" />알림 받는 중</>
            : '알림 받기'}
        </span>
        {notifSupported && <span className="profile-cycle-btn-arrow">›</span>}
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

      <EventTypeColorSettingsModal
        isOpen={showColorModal}
        onClose={() => setShowColorModal(false)}
      />
    </div>
  );
};

export default SettingsPage;
