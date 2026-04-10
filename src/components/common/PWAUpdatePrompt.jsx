// src/components/common/PWAUpdatePrompt.jsx
import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './PWAUpdatePrompt.css';

const PWAUpdatePrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // iOS PWA는 자동으로 SW 업데이트를 확인하지 않으므로 1시간마다 수동 체크
      if (registration) {
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="pwa-update-banner">
      <div className="pwa-update-content">
        <span className="pwa-update-icon">🎉</span>
        <p className="pwa-update-text">새 버전이 있어요!</p>
      </div>
      <div className="pwa-update-actions">
        <button
          className="pwa-update-dismiss"
          onClick={() => setNeedRefresh(false)}
        >
          나중에
        </button>
        <button
          className="pwa-update-confirm"
          onClick={() => updateServiceWorker(true)}
        >
          지금 업데이트
        </button>
      </div>
    </div>
  );
};

export default PWAUpdatePrompt;
