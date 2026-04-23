// src/components/common/PWAUpdatePrompt.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './PWAUpdatePrompt.css';

const PWAUpdatePrompt = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localNeedRefresh, setLocalNeedRefresh] = useState(false);
  const registrationRef = useRef(null);
  const updateCheckIntervalRef = useRef(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      registrationRef.current = registration;

      // 5분마다 업데이트 확인 (1시간 → 5분으로 단축)
      const checkUpdate = () => registration.update();
      updateCheckIntervalRef.current = setInterval(checkUpdate, 5 * 60 * 1000);

      // 앱이 활성화될 때(visible) 즉시 업데이트 확인 - iOS 대응
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (updateCheckIntervalRef.current) {
          clearInterval(updateCheckIntervalRef.current);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    },
  });

  // 새 버전이 감지되면 로컬 상태도 업데이트
  useEffect(() => {
    if (needRefresh && !localNeedRefresh) {
      setLocalNeedRefresh(true);
    }
  }, [needRefresh, localNeedRefresh]);

  // 업데이트 프로세스
  useEffect(() => {
    if (!isUpdating) return;

    let timeoutId;
    let controllerChangeHandler;

    const performUpdate = () => {
      // skipWaiting이 true이므로 controllerchange는 발생할 수도, 안 할 수도 있음
      // 따라서 최대 3초 기다린 후 바로 새로고침
      timeoutId = setTimeout(() => {
        if (controllerChangeHandler) {
          navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler);
        }
        window.location.reload();
      }, 3000);

      controllerChangeHandler = () => {
        clearTimeout(timeoutId);
        if (controllerChangeHandler) {
          navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler);
        }
        // 새 서비스 워커가 활성화된 후 페이지 새로고침
        window.location.reload();
      };

      navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler);
    };

    performUpdate();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (controllerChangeHandler) {
        navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler);
      }
    };
  }, [isUpdating]);

  if (!localNeedRefresh) return null;

  const handleUpdate = () => {
    setIsUpdating(true);
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    // "나중에" 클릭해도 배너는 닫지만, 백그라운드에서는 계속 감시
    setLocalNeedRefresh(false);
    // 5초 후 다시 업데이트 확인 (사용자가 나중에 클릭한 직후)
    setTimeout(() => {
      if (registrationRef.current) {
        registrationRef.current.update();
      }
    }, 5000);
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
          onClick={handleDismiss}
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
