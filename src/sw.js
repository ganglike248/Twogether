// src/sw.js — Workbox 프리캐싱 + FCM 백그라운드 알림 통합 서비스워커
// vite-plugin-pwa injectManifest 전략으로 빌드됨 (vite.config.js 참고)
// FCM 웹 푸시는 firebase-messaging-sw.js를 별도 등록하면 이 서비스워커와 scope('/')가 충돌하므로
// 하나의 서비스워커에 프리캐싱 + 푸시 처리를 함께 둔다.
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.origin === 'https://firestore.googleapis.com',
  new NetworkFirst({
    cacheName: 'firebase-firestore',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24, // 1일
      }),
    ],
  })
);

const firebaseApp = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});
const messaging = getMessaging(firebaseApp);

// 서버에서 항상 data-only로 보냄(functions/index.js) — notification 필드를 쓰면 브라우저 자동 표시와
// 이 핸들러의 수동 표시가 겹쳐 모바일에서 알림이 2번 뜨는 문제가 있어 표시를 여기서만 담당함
onBackgroundMessage(messaging, (payload) => {
  const { title, body } = payload.data || {};
  if (!title) return;
  self.registration.showNotification(title, {
    body,
    icon: '/app-icon.png',
    badge: '/app-icon.png',
    data: payload.data,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.link || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
