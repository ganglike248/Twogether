// src/services/analyticsService.js
// Firebase Analytics — 처음 기록할 때 한 번만 불러와 초기화(AUDIT P-6). 예전엔 firebase.js에서 앱 시작 때 바로 getAnalytics()를 불렀음.
// 지원하지 않는 환경(isSupported false — 일부 웹뷰·쿠키 차단 등)이면 조용히 건너뜀. 기록 실패가 화면 동작을 막지 않게 전부 무시.
import { app } from '../firebase';

let analyticsPromise = null;
const loadAnalytics = () => {
  if (!analyticsPromise) {
    analyticsPromise = import('firebase/analytics')
      .then(async ({ getAnalytics, logEvent, isSupported }) => ((await isSupported()) ? { analytics: getAnalytics(app), logEvent } : null))
      .catch(() => null);
  }
  return analyticsPromise;
};

const send = (eventName, params) => {
  loadAnalytics().then((x) => {
    if (!x) return;
    try { x.logEvent(x.analytics, eventName, params); } catch (error) { console.warn(`Failed to log event "${eventName}":`, error); }
  });
};

export const logPageView = (pageName, pagePath) => send('page_view', {
  page_title: pageName,
  page_path: pagePath,
  page_location: window.location.href,
});

export const logAnalyticsEvent = (eventName, eventData = {}) => send(eventName, eventData);
