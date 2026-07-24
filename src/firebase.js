// src/firebase.js
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from 'firebase/firestore';
import { getAuth, initializeAuth, browserLocalPersistence } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { Capacitor } from '@capacitor/core';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

// IndexedDB 기반 오프라인 퍼시스턴스: 재방문 시 캐시 데이터를 즉시 반환
// Safari 프라이빗 모드 등 IndexedDB 미지원 환경에서는 in-memory로 폴백
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  db = getFirestore(app);
}

export { db, app };
// iOS(WKWebView)에서 Auth 기본 퍼시스턴스(IndexedDB)가 onAuthStateChanged 콜백을
// 응답 없이 멈추게 하는 문제가 있어서(Safari 웹 인스펙터로 firebaseLocalStorageDb만
// 생성되고 이후 진행이 안 되는 것 확인) iOS만 localStorage 기반으로 명시 지정.
// 안드로이드/웹은 이미 정상 동작 중이라 기존 기본 동작(getAuth) 그대로 둠.
export const auth = Capacitor.getPlatform() === 'ios'
  ? initializeAuth(app, { persistence: browserLocalPersistence })
  : getAuth(app);
export const storage = getStorage(app);
export const functionsInstance = getFunctions(app);
export const analytics = getAnalytics(app);
