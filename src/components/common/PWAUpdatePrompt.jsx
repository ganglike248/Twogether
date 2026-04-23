// src/components/common/PWAUpdatePrompt.jsx
import React, { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './PWAUpdatePrompt.css';

const PWAUpdatePrompt = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // 1시간마다 수동으로 업데이트 확인
      const updateCheckInterval = setInterval(() => registration.update(), 60 * 60 * 1000);

      // 앱이 활성화될 때(visible) 업데이트 확인 - iOS 대응
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(updateCheckInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    },
  });

  useEffect(() => {
    if (!isUpdating) return;

    // 새 서비스 워커가 실제로 활성화될 때까지 기다린 후 새로고침
    let timeoutId;
    const handleControllerChange = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      clearTimeout(timeoutId);
      // 새 서비스 워커가 활성화된 후 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 500);
    };

    // 타임아웃 설정: 최대 30초까지 기다림
    timeoutId = setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      window.location.reload();
    }, 30000);

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      clearTimeout(timeoutId);
    };
  }, [isUpdating]);

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
