# Twogether (우리두리) - 프로젝트 컨텍스트

## 기본 정보
- **앱 이름**: 우리두리 (한글 UI), Twogether (영어/코드)
- **현재 버전**: v0.3.2 (배포됨: https://twogether-206fb.web.app)
- **GitHub**: https://github.com/ganglike248/Twogether.git (브랜치: master)
- **로컬 경로**: e:/programing/Pro/project/Twogether

## 기술 스택
- React 19 + **Vite 5.4.21** (Vite 8은 Node.js 20.15.1과 호환 안 됨 → v5 고정)
- Firebase 12.x: Auth, Firestore, Storage (프로젝트 ID: twogether-206fb)
- react-router-dom v7, @fullcalendar/* v6, date-fns v4
- korean-lunar-calendar, react-toastify, react-icons
- **vite-plugin-pwa v1.2.0** (PWA, 서비스 워커, Workbox)

## 버전 관리 규칙 (필수)
- 커밋마다 `package.json` version 필드 + `version.txt` 동시 업데이트
- 현재: v0.3.2 → 다음: v0.3.3

## 핵심 아키텍처

### vite.config.js (중요)
`.js` 파일에 JSX 포함된 컴포넌트들 처리 (Navigation.js, DayModal.js, EventModal.js, TravelPlanPage.js, MemoryList.js 등)
```js
esbuild: { loader: 'jsx', include: /src\/.*\.[jt]sx?$/ }
optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } }
```
PWA 설정도 여기에 포함 (VitePWA 플러그인, Workbox 캐싱 전략)

### PWA 설정 (vite.config.js)
- 아이콘: `public/app-icon.png` (192×192, 512×512, maskable 모두 동일 파일)
- theme_color: `#fce4ec`, background_color: `#fce4ec`
- Workbox: Firestore → NetworkFirst, Storage → CacheFirst
- `maximumFileSizeToCacheInBytes: 5MB` (app-icon.png가 2.58MB라 상향)
- `devOptions.enabled: false` (개발 중 SW 비활성)

### Safe Area (iOS 노치 대응)
- `index.html`: `viewport-fit=cover`
- `AppHeader.css`: `height: calc(52px + env(safe-area-inset-top))`, `padding-top: env(safe-area-inset-top)`
- `Layout.css`: `padding-top/bottom`에 `env(safe-area-inset-top/bottom)` 반영
- `Navigation.css`: `height: calc(60px + env(safe-area-inset-bottom))`, `padding-bottom: env(safe-area-inset-bottom)`

### AuthContext (contexts/AuthContext.jsx)
전역 제공: `user, userDoc, coupleDoc, coupleId, partnerDoc, getMemberName, loading`
- `members[0]` = boyfriend (커플 생성자), `members[1]` = girlfriend (합류자)
- `getMemberName('boyfriend'|'girlfriend'|'couple')` → 실제 displayName 반환

### ProtectedRoute 순서
1. loading → 스피너
2. user 없음 → /login
3. userDoc.coupleId 없음 → /couple-setup
4. coupleDoc.migrationDone === false → /migration
5. 통과 → children

### Firestore 컬렉션
```
users/{uid}       → uid, email, displayName, coupleId
couples/{coupleId} → members:[uid1,uid2], inviteCode, anniversaryDate, migrationDone, heroImageUrl
events            → coupleId 필드 포함
trips/bucketlists/edit_logs → coupleId 필드 포함
```

### Storage 경로
```
couples/{coupleId}/hero          → 홈 화면 대표 사진
events/{coupleId}/{eventId}/{filename} → 이벤트 이미지 (미구현)
```

### Firebase 배포 현황 (v0.3.2)
- Firestore rules/indexes: 배포 완료
- Storage rules: 배포 완료
  - **주의**: `firebase.json`에 `"bucket": "twogether-206fb.firebasestorage.app"` 명시 필수
  - 미명시 시 rules가 기본 `*.appspot.com` 버킷에 배포되어 앱에서 403 에러 발생
- Hosting: 배포 완료

## 주요 파일 구조
```
src/
├── App.jsx, firebase.js, main.jsx
├── contexts/AuthContext.jsx
├── services/authService.js, eventService.js, tripService.js, storageService.js
├── hooks/useCalendar.js, useMemory.js, useTrip.js
├── utils/koreanHolidays.js, numberFormat.js, dataUtils.js
└── components/
    ├── Auth/LoginPage, CoupleSetupPage, ProtectedRoute
    ├── Migration/MigrationPage
    ├── common/AppHeader, Layout, Navigation, ScrollToTop
    ├── Home/Home
    ├── Calendar/Calendar, DayModal.js, EventModal.js
    ├── Memory/MemoryList.js, MemoryCard.js, MemoryDetail.js, MemoryForm.js
    ├── BucketList/BucketListPage
    ├── Travel/TravelPlanPage.js, TripCard.js, TripDetail.js, TripModal.js, ScheduleItem.js, ScheduleModal.js, TravelTimeInput.js
    ├── Profile/ProfilePage
    └── EditLog/EditLogModal.js

public/
├── favicon.svg    → 브라우저 탭 아이콘 (기존 벡터)
├── app-icon.png   → PWA 아이콘 (커플 캐릭터 이미지, 2.58MB)
└── icons.svg
```

## 라우팅
```
/login → LoginPage  /couple-setup → CoupleSetupPage  /migration → MigrationPage
/ → Home  /calendar → Calendar  /memories → MemoryList
/bucket → BucketListPage  /travel/:tripId? → TravelPlanPage  /profile → ProfilePage
```

## 남은 작업
- 이벤트 이미지 업로드: EventModal.js에 파일선택 UI 추가 → storageService.uploadEventImage() → imageUrls 저장, MemoryCard/Detail에서 표시
- 소셜 로그인 (Google/Kakao, 장기)

## 주의사항 및 참고
- `EventForm.js` 비어있음 (EventModal.js에 폼 통합됨)
- `.js` 확장자 JSX 파일 수정 시 vite.config.js esbuild 설정 필요
- Firestore users 교차 읽기: 커플 멤버십 체인 get()으로 허용 (firestore.rules 배포 완료)
- Storage rules: 인증 여부만 확인, 커플 멤버십 검증은 미구현 (추후 강화 가능)
- edit_logs 조회: coupleId 필터 없이 eventId 기반으로만 조회 (보안 강화 시 coupleId 추가 필요)
- migrationService.js: krhj-1111 → twogether-206fb 데이터 복사, ESM 환경에서 `getApps()` 사용
- BucketListPage: `getDocs` 사용 (실시간 아님) → 파트너 변경사항 즉시 반영 안 됨

## Firebase 환경변수 (.env, 커밋 안 됨)
```
VITE_FIREBASE_API_KEY / AUTH_DOMAIN / PROJECT_ID / STORAGE_BUCKET / MESSAGING_SENDER_ID / APP_ID / MEASUREMENT_ID
# 구 프로젝트 (마이그레이션용 읽기 전용)
VITE_OLD_FIREBASE_API_KEY / PROJECT_ID / MESSAGING_SENDER_ID / APP_ID  (krhj-1111)
```

## Firestore 복합 인덱스 (firestore.indexes.json)
1. events: coupleId ASC + start DESC
2. trips: coupleId ASC + startDate DESC
3. edit_logs: eventId ASC + timestamp DESC
