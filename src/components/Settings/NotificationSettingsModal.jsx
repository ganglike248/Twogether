// src/components/Settings/NotificationSettingsModal.jsx
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import {
  isNotificationSupported,
  getNotificationPermission,
  shouldReceiveNotifications,
  enableNotifications,
  disableNotifications,
} from '../../services/notificationService';
import { useModalBackButton } from '../../hooks/useModalBackButton';
import './NotificationSettingsModal.css';

// 서버(functions/index.js)의 sendPushToUser type/defaultOn 인자와 일치해야 함.
// 새 알림 종류를 추가할 때 여기 목록에 항목만 추가하면 설정 UI에 자동으로 반영됨.
// coupleConnect(커플 연결)는 최초 1회뿐이고 항상 필요해서 설정 목록에 없음 — 서버에서 무조건 발송.
export const NOTIFICATION_TYPES = [
  { key: 'eventCreate', label: '일정 추가', desc: '파트너가 새 일정을 추가했을 때', defaultOn: true },
  { key: 'eventUpdate', label: '일정 날짜/시간 변경', desc: '파트너가 일정 날짜나 시간을 바꿨을 때', defaultOn: false },
  { key: 'tripDday', label: '여행 시작 D-day', desc: '여행 시작 3일 전 / 하루 전, 매일 오전 9시', defaultOn: true },
  { key: 'anniversaryDday', label: '기념일 D-day', desc: '100일 단위·매년 기념일 당일, 매일 오전 9시', defaultOn: true },
  { key: 'tomorrowReminder', label: '내일 일정 리마인드', desc: '내일 일정이 있으면 전날 저녁 9시', defaultOn: true },
];

const NotificationSettingsModal = ({ isOpen, onClose }) => {
  const { user, userDoc } = useAuthContext();
  const [notifLoading, setNotifLoading] = useState(false);
  const notifSupported = isNotificationSupported();
  const notifDenied = getNotificationPermission() === 'denied';
  // 기본값은 켜짐 — 권한이 허용돼 있고 사용자가 명시적으로 끄지 않았으면 켜진 것으로 표시.
  // 실제 토큰 등록(Firestore)은 Home 진입 시 백그라운드에서 자동으로 보정됨.
  const notifEnabled = shouldReceiveNotifications();
  useModalBackButton(isOpen, onClose);

  if (!isOpen) return null;

  const prefs = userDoc?.notificationPrefs || {};
  const isTypeEnabled = (type) => {
    const pref = prefs[type.key];
    return pref === undefined ? type.defaultOn : pref;
  };

  const handleToggleMaster = async () => {
    if (!user || notifLoading) return;
    setNotifLoading(true);
    try {
      if (notifEnabled) {
        await disableNotifications(user.uid);
        toast.success('이 기기의 알림을 껐습니다.');
      } else {
        await enableNotifications();
        toast.success('알림이 켜졌습니다.');
      }
    } catch (err) {
      toast.error(err.message || '알림 설정 중 오류가 발생했습니다.');
    } finally {
      setNotifLoading(false);
    }
  };

  const handleToggleType = async (key, checked) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        [`notificationPrefs.${key}`]: checked,
      });
    } catch (err) {
      console.error('[NotificationSettingsModal] 저장 실패:', err);
      toast.error('저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="nsm-overlay" onClick={onClose}>
      <div className="nsm-container" onClick={e => e.stopPropagation()}>
        <div className="nsm-header">
          <h2 className="nsm-title">알림 설정</h2>
          <button className="nsm-close" onClick={onClose}>×</button>
        </div>

        <div className="nsm-content">
          <div className="nsm-section">
            <div className="nsm-toggle-row">
              <div className="nsm-toggle-info">
                <div className="nsm-toggle-title">알림 받기</div>
                <div className="nsm-toggle-desc">
                  {!notifSupported
                    ? '이 브라우저는 알림을 지원하지 않아요'
                    : notifDenied
                    ? '브라우저에서 알림이 차단됐어요 — 브라우저 사이트 설정에서 직접 허용해주세요'
                    : '이 기기에서 푸시 알림을 받습니다'}
                </div>
              </div>
              <label className="nsm-toggle">
                <input
                  type="checkbox"
                  checked={notifEnabled}
                  disabled={!notifSupported || notifDenied || notifLoading}
                  onChange={handleToggleMaster}
                />
                <span className="nsm-toggle-slider" />
              </label>
            </div>
          </div>

          {notifEnabled && (
            <div className="nsm-section">
              <div className="nsm-section-title">알림 종류</div>
              {NOTIFICATION_TYPES.map((type, i) => (
                <div
                  key={type.key}
                  className={`nsm-toggle-row${i > 0 ? ' nsm-toggle-row--bordered' : ''}`}
                >
                  <div className="nsm-toggle-info">
                    <div className="nsm-toggle-title">{type.label}</div>
                    <div className="nsm-toggle-desc">{type.desc}</div>
                  </div>
                  <label className="nsm-toggle">
                    <input
                      type="checkbox"
                      checked={isTypeEnabled(type)}
                      onChange={e => handleToggleType(type.key, e.target.checked)}
                    />
                    <span className="nsm-toggle-slider" />
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsModal;
