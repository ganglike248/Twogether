// src/services/notificationService.js — 웹 푸시 알림 권한/토큰 관리
import { doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, app, functionsInstance } from '../firebase';

// 브라우저 알림 권한(Notification.permission)은 JS로 되돌릴 수 없음(허용 후엔 영원히 'granted') —
// 그래서 이 기기의 토큰을 로컬에 캐싱해서 매번 getToken()을 다시 부르지 않도록 함.
const TOKEN_STORAGE_KEY = 'twogether_fcm_token';
// 사용자가 앱 안에서 명시적으로 "알림 끄기"를 누른 적이 있는지 — 권한은 여전히 'granted'로 남아있어도
// 이 플래그가 있으면 자동 재등록(백필)을 하지 않음. 기본값은 "안 꺼둠"이라 권한만 있으면 켜짐으로 간주함.
const DISABLED_FLAG_KEY = 'twogether_fcm_disabled';

let messagingPromise = null;

// 특정 단계가 응답 없이 멈추는 경우(네트워크/브라우저 이슈 등) 버튼이 영원히 로딩 상태로
// 남는 걸 방지하기 위한 타임아웃 가드
const withTimeout = (promise, ms, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);

// 이미 활성화된 등록이 있으면 그걸 바로 쓰고, 없을 때만 navigator.serviceWorker.ready를 기다림.
// .ready만 쓰면 새 서비스워커가 activate는 됐지만 어떤 이유로 ready 이벤트가 안 붙는 경우
// (재배포를 반복한 세션 등) 응답 없이 멈출 수 있어서, 즉시 확인 가능한 경로를 우선함.
const getActiveServiceWorkerRegistration = async () => {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.active) return existing;
  return withTimeout(
    navigator.serviceWorker.ready,
    10000,
    '서비스워커 준비가 지연되고 있습니다. 새로고침 후 다시 시도해주세요.'
  );
};

// 브라우저별 웹 푸시 미지원(구형 Safari 등) 방어 — 지연 초기화
const getMessagingInstance = async () => {
  if (messagingPromise) return messagingPromise;

  messagingPromise = (async () => {
    try {
      const { isSupported, getMessaging } = await import('firebase/messaging');
      if (!(await isSupported())) return null;
      return getMessaging(app);
    } catch (err) {
      console.warn('[notificationService] 웹 푸시 미지원 환경:', err);
      return null;
    }
  })();

  return messagingPromise;
};

export const isNotificationSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

export const getNotificationPermission = () =>
  isNotificationSupported() ? Notification.permission : 'unsupported';

export const isExplicitlyDisabled = () => localStorage.getItem(DISABLED_FLAG_KEY) === 'true';

// 표시용 "알림 받는 중" 상태 — 기본값은 켜짐: 브라우저 권한이 허용돼 있고 사용자가 명시적으로
//끄지 않았다면 켜진 것으로 간주함 (권한만 있으면 실제 토큰 등록은 백그라운드에서 자동 보정됨)
export const shouldReceiveNotifications = () =>
  getNotificationPermission() === 'granted' && !isExplicitlyDisabled();

// 알림 권한 요청 → FCM 토큰 발급 → registerFcmToken 콜러블로 저장
// (같은 브라우저로 예전에 다른 계정을 테스트했다면 서버에서 그 계정 문서의 토큰을 정리하고 현재 계정에만 등록함)
export const enableNotifications = async () => {
  if (!isNotificationSupported()) {
    throw new Error('이 브라우저는 알림을 지원하지 않습니다.');
  }

  const permission = await withTimeout(
    Notification.requestPermission(),
    15000,
    '알림 권한 요청이 응답하지 않습니다. 다시 시도해주세요.'
  );
  if (permission !== 'granted') {
    throw new Error('알림 권한이 거부되었습니다.');
  }

  const messaging = await getMessagingInstance();
  if (!messaging) {
    throw new Error('이 브라우저는 웹 푸시를 지원하지 않습니다.');
  }

  const { getToken } = await import('firebase/messaging');
  const registration = await getActiveServiceWorkerRegistration();
  const token = await withTimeout(
    getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    }),
    10000,
    '알림 토큰 발급이 지연되고 있습니다. 다시 시도해주세요.'
  );

  if (!token) {
    throw new Error('알림 토큰을 발급받지 못했습니다.');
  }

  await withTimeout(
    httpsCallable(functionsInstance, 'registerFcmToken')({ token }),
    10000,
    '알림 등록이 지연되고 있습니다. 다시 시도해주세요.'
  );
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.removeItem(DISABLED_FLAG_KEY);

  return token;
};

// 알림 끄기 — 이 기기의 토큰만 users 문서에서 제거 (다른 기기 토큰은 유지)
// enableNotifications에서 캐싱해둔 토큰을 쓰므로 getToken()을 다시 호출하지 않음(느리거나 멈출 수 있었음)
export const disableNotifications = async (userId) => {
  localStorage.setItem(DISABLED_FLAG_KEY, 'true');

  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) return;

  await withTimeout(
    updateDoc(doc(db, 'users', userId), { fcmTokens: arrayRemove(token) }),
    10000,
    '알림 해제가 지연되고 있습니다. 다시 시도해주세요.'
  );
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

// 이 기기 토큰이 실제로 Firestore(fcmTokens)에 등록돼 있는지 — 백그라운드 자동 등록(백필) 필요 여부 판단용
export const isDeviceSubscribed = (userDoc) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  return !!token && !!userDoc?.fcmTokens?.includes(token);
};

// 앱이 포그라운드에 열려 있을 때 수신되는 메시지 — 시스템 알림 대신 콜백으로 처리(예: 토스트)
export const subscribeForegroundMessages = (callback) => {
  let unsubscribe = () => {};

  getMessagingInstance().then((messaging) => {
    if (!messaging) return;
    import('firebase/messaging').then(({ onMessage }) => {
      unsubscribe = onMessage(messaging, callback);
    });
  });

  return () => unsubscribe();
};
