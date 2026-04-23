// src/components/common/PWAUpdatePrompt.jsx
import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const PWAUpdatePrompt = () => {
  // 배너 없음 - 백그라운드에서만 자동 업데이트
  useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // 5분마다 업데이트 확인
      const updateCheckInterval = setInterval(() => registration.update(), 5 * 60 * 1000);

      // 앱이 활성화될 때(visible) 즉시 업데이트 확인
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

  return null;
};

export default PWAUpdatePrompt;
