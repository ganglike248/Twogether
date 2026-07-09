// src/services/notificationService.js — 웹 푸시 알림 권한/토큰 관리
import { doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, app, functionsInstance } from '../firebase';

let messagingPromise = null;

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

// 알림 권한 요청 → FCM 토큰 발급 → registerFcmToken 콜러블로 저장
// (같은 브라우저로 예전에 다른 계정을 테스트했다면 서버에서 그 계정 문서의 토큰을 정리하고 현재 계정에만 등록함)
export const enableNotifications = async () => {
  if (!isNotificationSupported()) {
    throw new Error('이 브라우저는 알림을 지원하지 않습니다.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('알림 권한이 거부되었습니다.');
  }

  const messaging = await getMessagingInstance();
  if (!messaging) {
    throw new Error('이 브라우저는 웹 푸시를 지원하지 않습니다.');
  }

  const { getToken } = await import('firebase/messaging');
  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error('알림 토큰을 발급받지 못했습니다.');
  }

  await httpsCallable(functionsInstance, 'registerFcmToken')({ token });

  return token;
};

// 알림 끄기 — 이 기기의 토큰만 users 문서에서 제거 (다른 기기 토큰은 유지)
export const disableNotifications = async (userId) => {
  const messaging = await getMessagingInstance();
  if (!messaging) return;

  const { getToken } = await import('firebase/messaging');
  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  }).catch(() => null);

  if (token) {
    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayRemove(token),
    });
  }
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
