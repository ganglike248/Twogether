// src/components/Settings/NotificationSettingsPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { doc, updateDoc } from 'firebase/firestore';
import { HiArrowLeft } from 'react-icons/hi2';
import { db } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import {
  isNotificationSupported,
  getNotificationPermission,
  shouldReceiveNotifications,
  enableNotifications,
  disableNotifications,
} from '../../services/notificationService';
import './NotificationSettingsPage.css';

// 서버(functions/index.js)의 sendPushToUser type/defaultOn 인자와 일치해야 함.
// category는 이 페이지에서 소제목으로 묶어 표시하는 용도 — 새 알림 종류를 추가할 때 이 목록에
// 항목만 추가하면(기존 category를 쓰거나 새 category를 만들면) 설정 UI에 자동으로 반영됨.
// coupleConnect(커플 연결)는 최초 1회뿐이고 항상 필요해서 목록에 없음 — 서버에서 무조건 발송.
export const NOTIFICATION_TYPES = [
  { key: 'eventCreate', category: '일정', label: '일정 추가', desc: '파트너가 새 일정을 추가했을 때', defaultOn: true },
  { key: 'eventUpdate', category: '일정', label: '일정 날짜/시간 변경', desc: '파트너가 일정 날짜나 시간을 바꿨을 때', defaultOn: false },
  { key: 'tomorrowReminder', category: '일정', label: '내일 일정 리마인드', desc: '내일 일정이 있으면 전날 저녁 9시', defaultOn: true },
  { key: 'tripDday', category: 'D-day', label: '여행 시작 D-day', desc: '여행 시작 3일 전 / 하루 전, 매일 오전 9시', defaultOn: true },
  { key: 'anniversaryDday', category: 'D-day', label: '기념일 D-day', desc: '100일 단위·매년 기념일 당일, 매일 오전 9시', defaultOn: true },
  { key: 'ddayReminder', category: 'D-day', label: '디데이 D-day', desc: '디데이로 표시한 일정 3일 전 / 하루 전, 매일 오전 9시', defaultOn: true },
  { key: 'sealedMessageArrived', category: '봉인 편지', label: '봉인 편지 도착', desc: '파트너가 나에게 편지를 봉인했을 때', defaultOn: true },
  { key: 'sealedMessageUnlocked', category: '봉인 편지', label: '봉인 편지 공개', desc: '봉인했던 편지가 공개됐을 때', defaultOn: true },
];

// category 등장 순서를 유지하면서 그룹핑
const groupByCategory = (types) => {
  const groups = [];
  const indexByCategory = new Map();
  for (const type of types) {
    if (!indexByCategory.has(type.category)) {
      indexByCategory.set(type.category, groups.length);
      groups.push({ category: type.category, types: [] });
    }
    groups[indexByCategory.get(type.category)].types.push(type);
  }
  return groups;
};

const NotificationSettingsPage = () => {
  const navigate = useNavigate();
  const { user, userDoc } = useAuthContext();
  const [notifLoading, setNotifLoading] = useState(false);
  const notifSupported = isNotificationSupported();
  const notifDenied = getNotificationPermission() === 'denied';
  // 기본값은 켜짐 — 권한이 허용돼 있고 사용자가 명시적으로 끄지 않았으면 켜진 것으로 표시.
  // 실제 토큰 등록(Firestore)은 Home 진입 시 백그라운드에서 자동으로 보정됨.
  const notifEnabled = shouldReceiveNotifications();

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
      console.error('[NotificationSettingsPage] 저장 실패:', err);
      toast.error('저장 중 오류가 발생했습니다.');
    }
  };

  const categoryGroups = groupByCategory(NOTIFICATION_TYPES);

  return (
    <div className="nsp-page">
      <div className="nsp-header">
        <button className="nsp-back-btn" onClick={() => navigate('/settings')}>
          <HiArrowLeft />
        </button>
        <p className="profile-section-label" style={{ margin: 0 }}>알림 설정</p>
      </div>

      <div className="nsp-section">
        <div className="nsp-toggle-row">
          <div className="nsp-toggle-info">
            <div className="nsp-toggle-title">알림 받기</div>
            <div className="nsp-toggle-desc">
              {!notifSupported
                ? '이 브라우저는 알림을 지원하지 않아요'
                : notifDenied
                ? '브라우저에서 알림이 차단됐어요 — 브라우저 사이트 설정에서 직접 허용해주세요'
                : '이 기기에서 푸시 알림을 받습니다'}
            </div>
          </div>
          <label className="nsp-toggle">
            <input
              type="checkbox"
              checked={notifEnabled}
              disabled={!notifSupported || notifDenied || notifLoading}
              onChange={handleToggleMaster}
            />
            <span className="nsp-toggle-slider" />
          </label>
        </div>
      </div>

      {notifEnabled && categoryGroups.map((group) => (
        <div className="nsp-section" key={group.category}>
          <div className="nsp-section-title">{group.category}</div>
          {group.types.map((type, i) => (
            <div
              key={type.key}
              className={`nsp-toggle-row${i > 0 ? ' nsp-toggle-row--bordered' : ''}`}
            >
              <div className="nsp-toggle-info">
                <div className="nsp-toggle-title">{type.label}</div>
                <div className="nsp-toggle-desc">{type.desc}</div>
              </div>
              <label className="nsp-toggle">
                <input
                  type="checkbox"
                  checked={isTypeEnabled(type)}
                  onChange={e => handleToggleType(type.key, e.target.checked)}
                />
                <span className="nsp-toggle-slider" />
              </label>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default NotificationSettingsPage;
