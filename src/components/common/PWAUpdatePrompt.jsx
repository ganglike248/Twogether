// src/components/common/PWAUpdatePrompt.jsx
import React, { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './PWAUpdatePrompt.css';

const PWAUpdatePrompt = () => {
  const [isUpdating, setIsUpdating] = useState(false);
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

  const handleUpdate = () => {
    setIsUpdating(true);
    updateServiceWorker(true);
  };

  return (
    <div className="pwa-update-banner">
      <div className="pwa-update-content">
        <span className="pwa-update-icon">{isUpdating ? '⏳' : '🎉'}</span>
        <p className="pwa-update-text">
          {isUpdating ? '업데이트 중입니다...' : '새 버전이 있어요!'}
        </p>
      </div>
      <div className="pwa-update-actions">
        <button
          className="pwa-update-dismiss"
          onClick={() => setNeedRefresh(false)}
          disabled={isUpdating}
        >
          나중에
        </button>
        <button
          className="pwa-update-confirm"
          onClick={handleUpdate}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <>
              <span className="pwa-update-spinner"></span>
              잠시만 기다려주세요
            </>
          ) : (
            '지금 업데이트'
          )}
        </button>
      </div>
    </div>
  );
};

export default PWAUpdatePrompt;
