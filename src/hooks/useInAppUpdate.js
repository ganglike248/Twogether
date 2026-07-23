import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'react-toastify';
import {
  AppUpdate,
  AppUpdateAvailability,
  FlexibleUpdateInstallStatus,
} from '@capawesome/capacitor-app-update';

// 업데이트 방식: 'FLEXIBLE'(백그라운드 다운로드 후 재시작 안내) | 'IMMEDIATE'(전체 화면 강제 업데이트)
// devNote.txt 참고 — 일반 기능 업데이트는 FLEXIBLE, 필수 업데이트(보안 패치 등)만 IMMEDIATE로 전환
const UPDATE_TYPE = 'FLEXIBLE';

const useInAppUpdate = () => {
  useEffect(() => {
    // Google Play In-App Update API는 Android 전용 (Play Store로 설치된 빌드에서만 동작)
    if (Capacitor.getPlatform() !== 'android') return;

    let cancelled = false;
    let listenerHandle;

    const checkForUpdate = async () => {
      try {
        const info = await AppUpdate.getAppUpdateInfo();
        if (cancelled || info.updateAvailability !== AppUpdateAvailability.UPDATE_AVAILABLE) {
          return;
        }

        if (UPDATE_TYPE === 'IMMEDIATE') {
          if (!info.immediateUpdateAllowed) return;
          await AppUpdate.performImmediateUpdate();
          return;
        }

        if (!info.flexibleUpdateAllowed) return;

        listenerHandle = await AppUpdate.addListener('onFlexibleUpdateStateChange', (state) => {
          if (state.installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) {
            toast.info('업데이트 준비가 완료됐습니다. 눌러서 재시작해주세요.', {
              autoClose: false,
              closeOnClick: false,
              onClick: () => AppUpdate.completeFlexibleUpdate(),
            });
          }
        });

        await AppUpdate.startFlexibleUpdate();
      } catch (error) {
        console.error('[InAppUpdate] 업데이트 확인 실패:', error);
      }
    };

    checkForUpdate();

    return () => {
      cancelled = true;
      listenerHandle?.remove();
    };
  }, []);
};

export default useInAppUpdate;
