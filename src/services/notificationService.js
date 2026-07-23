// src/services/notificationService.js — 웹 푸시 + 네이티브(Android/iOS) 푸시 알림 권한/토큰 관리
import { doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { db, app, functionsInstance } from '../firebase';

// 브라우저 알림 권한(Notification.permission)은 JS로 되돌릴 수 없음(허용 후엔 영원히 'granted') —
// 그래서 이 기기의 토큰을 로컬에 캐싱해서 매번 getToken()을 다시 부르지 않도록 함.
const TOKEN_STORAGE_KEY = 'twogether_fcm_token';
// 사용자가 앱 안에서 명시적으로 "알림 끄기"를 누른 적이 있는지 — 권한은 여전히 'granted'로 남아있어도
// 이 플래그가 있으면 자동 재등록(백필)을 하지 않음. 기본값은 "안 꺼둠"이라 권한만 있으면 켜짐으로 간주함.
const DISABLED_FLAG_KEY = 'twogether_fcm_disabled';
// 네이티브(Android/iOS)는 OS 권한 상태를 Notification.permission처럼 동기적으로 읽을 방법이 없어서,
// 실제로 확인/요청했을 때의 결과를 로컬에 캐싱해두고 그 값을 돌려줌.
const NATIVE_PERMISSION_STORAGE_KEY = 'twogether_native_permission';

const isNative = () => Capacitor.isNativePlatform();
// 서버(users 문서) 필드: 웹은 fcmTokens(data-only 발송), 네이티브는 nativeFcmTokens(notification 포함 발송)
// — functions/index.js의 registerFcmToken / sendPushToUser와 일치해야 함.
const serverTokenField = () => (isNative() ? 'nativeFcmTokens' : 'fcmTokens');

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

export const isNotificationSupported = () => {
  // 네이티브 앱은 Play Core/APNs 기반이라 브라우저 Push API 지원 여부와 무관하게 항상 지원됨
  if (isNative()) return true;
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
};

export const getNotificationPermission = () => {
  if (isNative()) {
    return localStorage.getItem(NATIVE_PERMISSION_STORAGE_KEY) || 'default';
  }
  return isNotificationSupported() ? Notification.permission : 'unsupported';
};

export const isExplicitlyDisabled = () => localStorage.getItem(DISABLED_FLAG_KEY) === 'true';

// 표시용 "알림 받는 중" 상태 — 기본값은 켜짐: 권한이 허용돼 있고 사용자가 명시적으로
//끄지 않았다면 켜진 것으로 간주함 (권한만 있으면 실제 토큰 등록은 백그라운드에서 자동 보정됨)
export const shouldReceiveNotifications = () =>
  getNotificationPermission() === 'granted' && !isExplicitlyDisabled();

// 웹: 알림 권한 요청 → FCM 토큰 발급 → registerFcmToken 콜러블로 저장
// (같은 브라우저로 예전에 다른 계정을 테스트했다면 서버에서 그 계정 문서의 토큰을 정리하고 현재 계정에만 등록함)
const enableWebNotifications = async () => {
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

// 네이티브(Android/iOS): OS 권한 요청 → 네이티브 FCM 토큰 발급 → registerFcmToken 콜러블로 저장
// (@capacitor-firebase/messaging은 Android/iOS 모두 같은 API로 FCM 토큰을 주므로 플랫폼별 분기 불필요)
const enableNativeNotifications = async () => {
  const { receive } = await withTimeout(
    FirebaseMessaging.requestPermissions(),
    15000,
    '알림 권한 요청이 응답하지 않습니다. 다시 시도해주세요.'
  );
  localStorage.setItem(NATIVE_PERMISSION_STORAGE_KEY, receive === 'granted' ? 'granted' : 'denied');
  if (receive !== 'granted') {
    throw new Error('알림 권한이 거부되었습니다.');
  }

  const { token } = await withTimeout(
    FirebaseMessaging.getToken(),
    10000,
    '알림 토큰 발급이 지연되고 있습니다. 다시 시도해주세요.'
  );
  if (!token) {
    throw new Error('알림 토큰을 발급받지 못했습니다.');
  }

  await withTimeout(
    httpsCallable(functionsInstance, 'registerFcmToken')({ token, platform: Capacitor.getPlatform() }),
    10000,
    '알림 등록이 지연되고 있습니다. 다시 시도해주세요.'
  );
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.removeItem(DISABLED_FLAG_KEY);

  return token;
};

export const enableNotifications = () =>
  isNative() ? enableNativeNotifications() : enableWebNotifications();

// 알림 끄기 — 이 기기의 토큰만 users 문서에서 제거 (다른 기기 토큰은 유지)
// enableNotifications에서 캐싱해둔 토큰을 쓰므로 getToken()을 다시 호출하지 않음(느리거나 멈출 수 있었음)
export const disableNotifications = async (userId) => {
  localStorage.setItem(DISABLED_FLAG_KEY, 'true');

  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) return;

  await withTimeout(
    updateDoc(doc(db, 'users', userId), { [serverTokenField()]: arrayRemove(token) }),
    10000,
    '알림 해제가 지연되고 있습니다. 다시 시도해주세요.'
  );
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

// 이 기기 토큰이 실제로 Firestore(fcmTokens/nativeFcmTokens)에 등록돼 있는지 — 백그라운드 자동 등록(백필) 필요 여부 판단용
export const isDeviceSubscribed = (userDoc) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  return !!token && !!userDoc?.[serverTokenField()]?.includes(token);
};

// 앱이 포그라운드에 열려 있을 때 수신되는 메시지 — 시스템 알림 대신 콜백으로 처리(예: 토스트)
// 콜백 payload 형태는 웹/네이티브 공통: { notification: { title, body }, data: { title, body, link } }
export const subscribeForegroundMessages = (callback) => {
  if (isNative()) {
    let handle;
    FirebaseMessaging.addListener('notificationReceived', (event) => {
      const { title, body, data } = event.notification || {};
      // 안드로이드는 포그라운드에서 RemoteMessage.getNotification()이 null로 오는 경우가 있어서(실기기/에뮬레이터
      // 확인됨) title이 없을 때도 무조건 { notification: {...} } 형태로 감싸면 안 됨 — Layout.jsx의
      // `payload.notification || payload.data` 폴백이 "속이 빈 객체"를 그대로 선택해버려 토스트가 안 뜨는 버그가 있었음.
      callback({ notification: title ? { title, body } : undefined, data });
    }).then((h) => {
      handle = h;
    });
    return () => handle?.remove();
  }

  let unsubscribe = () => {};

  getMessagingInstance().then((messaging) => {
    if (!messaging) return;
    import('firebase/messaging').then(({ onMessage }) => {
      unsubscribe = onMessage(messaging, callback);
    });
  });

  return () => unsubscribe();
};

// 알림을 탭해서 앱이 열렸을 때(백그라운드/종료 상태) 딥링크 이동 — 네이티브 전용.
// 웹은 sw.js의 notificationclick에서 이미 동일하게 처리하고 있어 여기서는 다루지 않음.
export const subscribeNotificationTaps = (onNavigate) => {
  if (!isNative()) return () => {};

  let handle;
  FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
    const link = event.notification?.data?.link;
    if (link) onNavigate(link);
  }).then((h) => {
    handle = h;
  });

  return () => handle?.remove();
};
