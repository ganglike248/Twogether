import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['app-icon.png'],
      manifest: {
        name: '우리두리',
        short_name: '우리두리',
        description: '커플을 위한 우리만의 공간 - 일정, 추억, 여행을 함께',
        theme_color: '#fce4ec',
        background_color: '#fce4ec',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'ko',
        icons: [
          {
            src: '/app-icon.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/app-icon.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/app-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-firestore',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 1일
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // FullCalendar: 캘린더 페이지에서만 사용하는 대형 라이브러리
          if (id.includes('node_modules/@fullcalendar')) {
            return 'vendor-fullcalendar';
          }
          // framer-motion: 홈 페이지에서만 사용
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-framer-motion';
          }
          // Firebase SDK: 앱 전체에서 공유 (항상 필요)
          if (id.includes('node_modules/firebase')) {
            return 'vendor-firebase';
          }
          // React 코어: 항상 필요한 기반 라이브러리
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'vendor-react';
          }
          // date-fns: 날짜 처리 유틸
          if (id.includes('node_modules/date-fns')) {
            return 'vendor-date-fns';
          }
        },
      },
    },
    chunkSizeWarningLimit: 700, // Firebase SDK 특성상 단일 청크가 633kB — 정상 범위
  },
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.[jt]sx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
})
