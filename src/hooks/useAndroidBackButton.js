import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { toast } from 'react-toastify';

// 홈("/")에서 한 번 더 뒤로가기를 눌러야 종료되게 하는 유예 시간 — 실수로 앱이 꺼지는 것 방지
const EXIT_CONFIRM_WINDOW_MS = 2000;

// 안드로이드 하드웨어/제스처 뒤로가기 처리.
// 이 앱은 탭 전환·사이드바 메뉴 이동이 대부분 replace 네비게이션이라 브라우저 히스토리가
// 잘 안 쌓이는데, @capacitor/app 리스너를 안 달면(기본 동작에 맡기면) 웹뷰가 "더 갈 곳 없음"
// 상태에서 뒤로가기를 그냥 앱 종료로 처리해버림 — 그래서 아래처럼 직접 판단해서 처리함.
//
// 우선순위: ① 갈 수 있는 히스토리가 있으면(모달 열림 등) 그쪽으로 이동 → useModalBackButton의
// popstate 리스너가 그대로 받아서 모달을 닫음 ② 홈이 아니면 홈으로 ③ 이미 홈이면 한 번 더
// 눌러야 종료(토스트 안내)
const useAndroidBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;
  const lastBackPressRef = useRef(0);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    let handle;
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        navigate(-1);
        return;
      }

      if (locationRef.current.pathname !== '/') {
        navigate('/', { replace: true });
        return;
      }

      const now = Date.now();
      if (now - lastBackPressRef.current < EXIT_CONFIRM_WINDOW_MS) {
        App.exitApp();
        return;
      }
      lastBackPressRef.current = now;
      toast.info('뒤로가기를 한 번 더 누르면 종료됩니다', { autoClose: EXIT_CONFIRM_WINDOW_MS });
    }).then((h) => {
      handle = h;
    });

    return () => handle?.remove();
  }, [navigate]);
};

export default useAndroidBackButton;
