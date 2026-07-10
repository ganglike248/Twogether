// src/components/common/NotificationPrimingModal.jsx
// 브라우저 알림 권한 팝업은 설명 없이 뜨고, 한 번 차단하면 되돌릴 수 없어서(Notification.permission이
// JS로는 영구히 'denied'로 고정됨) 실제 팝업 전에 이 설명 화면을 먼저 보여줌 — "프라이밍" 패턴.
// CoupleSetupPage(신규 가입)와 Home(기존 가입자) 양쪽에 마운트하되, 로컬스토리지 플래그로 앱 전체에서
// 딱 한 번만 뜨도록 함(둘 중 먼저 도달하는 화면에서 뜨고 이후로는 다시 안 뜸).
import React, { useState, useEffect } from 'react';
import { HiBell } from 'react-icons/hi2';
import {
  getNotificationPermission,
  isExplicitlyDisabled,
  enableNotifications,
} from '../../services/notificationService';
import './NotificationPrimingModal.css';

const PRIMING_SHOWN_KEY = 'twogether_notification_priming_shown';

const NotificationPrimingModal = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(PRIMING_SHOWN_KEY)) return;
    if (isExplicitlyDisabled()) return;
    if (getNotificationPermission() !== 'default') return;
    setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(PRIMING_SHOWN_KEY, 'true');
    setVisible(false);
  };

  const handleEnable = () => {
    dismiss();
    enableNotifications().catch(() => {});
  };

  if (!visible) return null;

  return (
    <div className="npm-overlay">
      <div className="npm-card" onClick={(e) => e.stopPropagation()}>
        <HiBell className="npm-icon" />
        <h3 className="npm-title">알림을 받아보세요</h3>
        <ul className="npm-list">
          <li>파트너가 일정을 추가하거나 변경했을 때</li>
          <li>기념일, 여행 시작이 다가올 때</li>
          <li>내일 일정이 있을 때 미리</li>
        </ul>
        <p className="npm-desc">설정에서 언제든 종류별로 켜고 끌 수 있어요</p>
        <div className="npm-actions">
          <button className="npm-btn-skip" onClick={dismiss}>나중에</button>
          <button className="npm-btn-enable" onClick={handleEnable}>알림 받기</button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPrimingModal;
