// src/firebase.js
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from 'firebase/firestore';
import { getAuth, initializeAuth, browserLocalPersistence, connectAuthEmulator } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
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

// 로컬 에뮬레이터 연결 — **개발 서버 전용**(`import.meta.env.DEV`라 운영 빌드에선 코드째 빠짐). 로그인이 필요한 화면을
// 운영 데이터와 무관하게 끝까지 눌러보는 용도(커플 연결 해제·탈퇴 화면 검증에 처음 사용, v1.0.21).
// 사용: emulators(auth/firestore/functions/storage)를 demo 프로젝트로 띄우고
//   VITE_USE_EMULATORS=true VITE_FIREBASE_PROJECT_ID=demo-twogether VITE_FIREBASE_STORAGE_BUCKET=demo-twogether.appspot.com npm run dev
// 포트는 VITE_EMULATOR_FIRESTORE_PORT 등으로 바꿀 수 있음(로컬 8080을 Docker가 쓰는 경우가 있음).
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  const env = import.meta.env;
  connectAuthEmulator(auth, `http://127.0.0.1:${env.VITE_EMULATOR_AUTH_PORT || 9099}`, { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', Number(env.VITE_EMULATOR_FIRESTORE_PORT || 8080));
  connectFunctionsEmulator(functionsInstance, '127.0.0.1', Number(env.VITE_EMULATOR_FUNCTIONS_PORT || 5001));
  connectStorageEmulator(storage, '127.0.0.1', Number(env.VITE_EMULATOR_STORAGE_PORT || 9199));
  console.info('[firebase] 로컬 에뮬레이터에 연결됨');
}
