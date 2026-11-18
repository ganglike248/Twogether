import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'android', 'ios', 'scripts']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // 대문자(컴포넌트·JSX에서만 쓰는 이름)·_로 시작하는 이름은 안 쓰는 걸로 치지 않음(인자 포함)
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' }],
      // 구독 훅의 "id 없으면 비우고 끝" 같은 의도된 초기화가 대부분이라 경고로만(새 코드에선 피할 것)
      'react-hooks/set-state-in-effect': 'warn',
      // 개발 중 빠른 새로고침(HMR)에만 영향 — 컴포넌트 파일에서 상수·훅을 같이 내보내는 곳이 있음
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    files: ['functions/**/*.js'],
    languageOptions: {
      globals: globals.node,
      sourceType: 'commonjs',
    },
  },
])
