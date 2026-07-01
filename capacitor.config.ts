import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.twogether.app',
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
    contentInset: 'always',
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
  },
};

export default config;
