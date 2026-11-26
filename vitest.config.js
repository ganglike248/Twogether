// vitest.config.js — 순수 함수 단위 테스트(npm test). 화면 동작은 npm run smoke(에뮬레이터+브라우저)가 맡음.
// vite.config.js(PWA 등)를 끌어오지 않도록 별도 설정
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.js', 'functions/**/*.test.js'],
    environment: 'node',
    env: { TZ: 'Asia/Seoul' },
  },
});
