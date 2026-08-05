import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wooridoori.twogether',
  appName: '우리두리',
  webDir: 'dist',

  // 개발 중 실기기에서 로컬 dev 서버 사용 시 활성화 (배포 빌드 시 주석 처리)
  // server: {
  //   url: 'http://192.168.x.x:5173',
  //   cleartext: true,
  // },

  android: {
    backgroundColor: '#fce4ec',
    // 앱스토어 스크린샷/출시 시 minSdkVersion은 android/variables.gradle에서 설정
  },

  ios: {
    backgroundColor: '#fce4ec',
    // 'always'였을 때 iOS 네이티브가 safe-area만큼 웹뷰 콘텐츠를 자체적으로 한 번
    // 밀어주는데, CSS(AppHeader/Navigation 등의 env(safe-area-inset-*))에서도
    // 똑같은 여백을 또 계산해서 이중으로 밀리는 문제가 있었음(상단 헤더 위/하단
    // 탭바 아래에 여백 발생, 당겼을 때 헤더가 밀려 내려감). 'never'로 바꿔서
    // 웹뷰가 화면 끝까지 채우고, safe-area 처리는 CSS에서만 하도록 함.
    contentInset: 'never',
    // Mac에서 npx cap run ios 실행 전 별도 설정 불필요
  },

  // @capacitor/assets 이미지 생성 설정
  // npx capacitor-assets generate 실행 시 assets/icon-only.png 를 기반으로
  // Android/iOS 전 해상도 아이콘 + 스플래시 자동 생성
  assets: {
    iconBackgroundColor: '#fce4ec',
    iconBackgroundColorDark: '#fce4ec',
    splashBackgroundColor: '#fce4ec',
    splashBackgroundColorDark: '#2d1a1f',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#fce4ec',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    // iOS 포그라운드 알림 표시를 끔 — notificationService.js가 토스트로 직접 표시하므로
    // 여기서도 자동으로 배너를 띄우면 알림이 2번 뜸 (sw.js의 data-only 처리와 같은 이유)
    FirebaseMessaging: {
      presentationOptions: [],
    },
    // 구글 로그인(v0.4.30~) — 안드로이드/iOS WebView 안에서는 구글 정책상 OAuth 팝업이
    // 막혀 있어서 네이티브 SDK로 계정 선택 화면만 띄우고, 실제 로그인 세션은 항상
    // firebase/auth(JS SDK) 하나로 통일함. skipNativeAuth:true — 이 플러그인이 자체
    // 관리하는 "네이티브 레이어 로그인"은 Firestore/Storage/Functions 등 앱 전체가 보는
    // JS SDK auth 세션과 별개라서, 이걸 켜두면 로그인은 됐는데 정작 데이터 접근에 쓰는
    // auth.currentUser는 null인 상태가 될 수 있음(authService.js에서 idToken만 뽑아
    // signInWithCredential로 JS SDK에 직접 로그인시킴).
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },

  // @capacitor-firebase/messaging, @capacitor-firebase/authentication의 SwiftPM 패키지
  // 식별자 충돌 방지 (Capacitor CLI 8.4+ 필요)
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          '@capacitor-firebase/messaging': {
            symlink: true,
          },
          '@capacitor-firebase/authentication': {
            symlink: true,
          },
        },
      },
    },
  },
};

export default config;
