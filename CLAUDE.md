# Twogether (우리두리) - 프로젝트 컨텍스트

## 프로젝트 개요
커플용 기념일/캘린더/여행/버킷리스트 관리 앱.
기존 krhj-1111 Firebase 앱(특정 커플 전용, 인증 없음)을 누구나 가입해 쓸 수 있는 서비스로 전면 리뉴얼한 것.

- **앱 이름**: 우리두리 (한글 UI), Twogether (영어/코드)
- **현재 버전**: v0.2.1
- **GitHub**: https://github.com/ganglike248/Twogether.git (브랜치: master)
- **로컬 경로**: e:/programing/Pro/project/Twogether

---

## 기술 스택
- React 18 + **Vite 5.4.21** (Vite 8은 Node.js 20.15.1과 호환 안 됨 → v5 고정)
- Firebase 12.x: Auth (이메일/비밀번호), Firestore, Storage
- react-router-dom v7, @fullcalendar/* v6, date-fns v4
- korean-lunar-calendar, react-toastify, react-icons

---

## Firebase 설정
- **프로젝트 ID**: twogether-206fb
- **Firebase CLI**: 연결됨 (`.firebaserc` 설정 완료)
- **환경변수 파일**: `.env` (커밋 안 됨, 아래 목록 참고)

```
VITE_FIREBASE_API_KEY=AIzaSyBg6XPtLxwHqCvOiA3CIDby-xN6SBDA9IQ
VITE_FIREBASE_AUTH_DOMAIN=twogether-206fb.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=twogether-206fb
VITE_FIREBASE_STORAGE_BUCKET=twogether-206fb.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=645572622912
VITE_FIREBASE_APP_ID=1:645572622912:web:e929be5f78c87791cffda5
VITE_FIREBASE_MEASUREMENT_ID=G-J8YBVEL6Y7

# 마이그레이션용 (구 krhj-1111 프로젝트 읽기 전용)
VITE_OLD_FIREBASE_API_KEY=AIzaSyD4ENKkZXgOgp23zLhrODykO9WCgNpAARA
VITE_OLD_FIREBASE_PROJECT_ID=krhj-1111
VITE_OLD_FIREBASE_MESSAGING_SENDER_ID=131143146124
VITE_OLD_FIREBASE_APP_ID=1:131143146124:web:aa61ea7be032e8e343f9a9
```

---

## 배포된 Firebase 리소스 (v0.2.1 기준, 모두 완료)
- **Firestore 보안 규칙** (`firestore.rules`): coupleId 기반 접근 제어
- **Firestore 복합 인덱스** (`firestore.indexes.json`): 3개
  1. events: coupleId ASC + start DESC
  2. trips: coupleId ASC + startDate DESC
  3. edit_logs: eventId ASC + timestamp DESC
- **Storage 보안 규칙** (`storage.rules`): events/{coupleId}/{eventId}/{filename}, 10MB/image/* 제한

---

## 전체 파일 구조

```
src/
├── App.jsx                          # 전체 라우팅 + AuthProvider
├── firebase.js                      # Firebase 초기화 (VITE_ 환경변수)
├── main.jsx
├── contexts/
│   └── AuthContext.jsx              # user, userDoc, coupleDoc, coupleId, loading 전역 제공
├── services/
│   ├── authService.js               # signUpWithEmail, signInWithEmail, signOut, createCouple, joinCouple
│   ├── eventService.js              # 이벤트 CRUD + edit_logs (모두 coupleId 포함)
│   ├── tripService.js               # 여행 CRUD (coupleId 기반)
│   └── migrationService.js          # krhj-1111 → twogether-206fb 데이터 복사
├── hooks/
│   ├── useCalendar.js               # useCalendar(coupleId) → 이벤트 실시간 구독
│   ├── useMemory.js                 # useMemory(coupleId, filter) → 갤러리용
│   └── useTrip.js                   # useTrips(coupleId), useTripSchedules(tripId)
├── components/
│   ├── Auth/
│   │   ├── LoginPage.jsx + .css     # 로그인/회원가입 탭 전환
│   │   ├── CoupleSetupPage.jsx + .css  # 커플 생성(초대코드) / 코드 입력 합류
│   │   └── ProtectedRoute.jsx       # 인증 가드 (3단계 리다이렉트)
│   ├── Migration/
│   │   └── MigrationPage.jsx + .css # 기존 데이터 이전 UI
│   ├── common/
│   │   ├── AppHeader.jsx + .css     # D+day, coupleDoc.anniversaryDate 동적 읽기
│   │   ├── Layout.jsx + .css
│   │   ├── Navigation.css/.js       # 하단 탭 네비게이션 (.js인데 JSX 포함 → vite.config.js 처리)
│   │   └── ScrollToTop.js
│   ├── Home/
│   │   └── Home.jsx + .css          # D-day, 여행카드, 다음일정, 1년전오늘, 버킷진행률
│   ├── Calendar/
│   │   ├── Calendar.jsx + .css
│   │   ├── DayModal.js              # .js인데 JSX 포함
│   │   ├── EventModal.js            # .js인데 JSX 포함 — 이미지 업로드 미구현
│   │   └── EventForm.js             # 현재 비어있음 (EventModal에 통합됨)
│   ├── Memory/
│   │   ├── MemoryList.js + .css     # 추억 갤러리 (페이지네이션, 필터)
│   │   ├── MemoryCard.js + .css     # 이미지 미표시 상태
│   │   └── MemoryDetail.js + .css   # 상세 보기 (이미지 섹션 없음)
│   ├── BucketList/
│   │   └── BucketListPage.jsx
│   ├── Travel/
│   │   └── TravelPlanPage.js        # .js인데 JSX 포함
│   └── EditLog/
│       └── EditLogModal.js + .css
└── utils/
    ├── koreanHolidays.js, dataUtils.js, numberFormat.js
```

---

## 라우팅 (App.jsx)
```
/login          → LoginPage (공개)
/couple-setup   → CoupleSetupPage (로그인 후, 커플 연결 전)
/migration      → MigrationPage (커플 연결 후, migrationDone=false인 동안)
/               → Home (ProtectedRoute)
/calendar       → Calendar (ProtectedRoute)
/memories       → MemoryList (ProtectedRoute)
/bucket         → BucketListPage (ProtectedRoute)
/travel         → TravelPlanPage (ProtectedRoute)
/travel/:tripId → TravelPlanPage (ProtectedRoute)
*               → / 리다이렉트
```

## ProtectedRoute 로직 (순서 중요)
1. `loading` 중 → 스피너
2. `user` 없음 → `/login`
3. `userDoc.coupleId` 없음 → `/couple-setup`
4. `coupleDoc.migrationDone === false` → `/migration`
5. 모두 통과 → children 렌더

---

## Firestore 컬렉션 구조

### 신규 추가 컬렉션
```
users/{uid}
  uid, email, displayName, coupleId, createdAt

couples/{coupleId}
  members: [uid1, uid2]
  inviteCode: "AB12CD"        ← 6자리 영숫자
  anniversaryDate: "2024-11-11"
  migrationDone: boolean
  createdAt, createdBy
```

### 기존 컬렉션 (모두 coupleId 필드 추가됨)
```
events          → coupleId 필드 추가
trips           → coupleId 필드 추가
tripSchedules   → tripId로 부모 trips 통해 접근 제어
travelTimes     → tripId로 부모 trips 통해 접근 제어
bucketlists     → coupleId 필드 추가
edit_logs       → coupleId 필드 추가
```

---

## vite.config.js 설정 (중요)
```js
// .js 파일에 JSX가 포함된 기존 컴포넌트들 처리용
esbuild: {
  loader: 'jsx',
  include: /src\/.*\.[jt]sx?$/,
  exclude: [],
},
optimizeDeps: {
  esbuildOptions: {
    loader: { '.js': 'jsx' },
  },
},
```
→ Navigation.js, DayModal.js, EventModal.js, TravelPlanPage.js, MemoryList.js 등이 .js 확장자인데 JSX를 사용하기 때문에 이 설정 없으면 빌드 오류 발생.

---

## 버전 관리 규칙 (필수)
- 커밋마다 `package.json` version 필드 + `version.txt` 동시 업데이트
- 버전 기준: 출시 가능 상태 = 1.0.0, 현재는 0.x.x 개발 중
- 이미 완료된 버전: v0.2.0, v0.2.1

---

## 지금까지 완료된 작업 (2026-04-07 기준)

### 리뉴얼 전체 구현 (이전 세션)
- [x] AuthContext.jsx: user/userDoc/coupleDoc/coupleId/loading 전역 상태
- [x] authService.js: 회원가입, 로그인, 로그아웃, 커플 생성(inviteCode), 커플 합류
- [x] LoginPage.jsx: 이메일/비밀번호 로그인+회원가입 탭
- [x] CoupleSetupPage.jsx: 새 커플 시작(기념일 입력 + 초대코드 표시) / 코드 입력
- [x] ProtectedRoute.jsx: 3단계 인증 가드
- [x] MigrationPage.jsx: krhj-1111 → twogether-206fb 데이터 이전 UI
- [x] migrationService.js: 컬렉션별 배치 복사 (400개 청크, 멱등성 보장)
- [x] AppHeader.jsx: 하드코딩 날짜 제거 → coupleDoc.anniversaryDate 동적 읽기
- [x] Home.jsx: coupleId/coupleDoc 기반, 모든 날짜 동적
- [x] Calendar.jsx: coupleId 필터 추가
- [x] BucketListPage.jsx: coupleId 필터+필드 추가
- [x] TravelPlanPage.js: coupleId 전달
- [x] useCalendar.js, useMemory.js, useTrip.js: coupleId 파라미터 추가
- [x] eventService.js, tripService.js: coupleId 필드 포함
- [x] App.jsx: 전체 라우팅 + AuthProvider

### Firebase 설정 완료 (v0.2.1)
- [x] firebase.json, .firebaserc 설정
- [x] firestore.rules 배포 (coupleId 기반 보안 규칙)
- [x] firestore.indexes.json 배포 (복합 인덱스 3개)
- [x] storage.rules 배포 (이미지 업로드 제한)
- [x] Firebase Storage 활성화 (Console에서 수동 완료)

### 버그 수정 (v0.2.0~v0.2.1)
- [x] migrationService.js: `require()` → `getApps()` (ESM 환경 호환)
- [x] MemoryList.js: fetchMemories useCallback에 coupleId 의존성 추가, coupleId 변경 시 페이지네이션 초기화

---

## 다음에 해야 할 작업 (우선순위 순)

### 1순위: 이미지 업로드 기능
현재 상태: Firestore events에 `imageUrls: []` 필드는 있으나, 이미지 선택/업로드 UI가 없음.
Storage 규칙은 배포 완료 (`events/{coupleId}/{eventId}/{filename}`).

구현 필요 항목:
- `src/services/storageService.js` 신규 생성
  - `uploadEventImage(coupleId, eventId, file)` → Storage 업로드 후 downloadURL 반환
  - `deleteEventImage(imageUrl)` → Storage에서 이미지 삭제
- `EventModal.js` 수정
  - 이미지 선택 버튼 (input type=file, multiple, accept=image/*)
  - 선택한 이미지 미리보기
  - 저장 시 Storage 업로드 → imageUrls 배열에 URL 추가
  - 기존 이미지 삭제 기능
- `firebase.js` 수정
  - `getStorage` import 및 `export const storage = getStorage(app)` 추가
- `MemoryCard.js` 수정
  - imageUrls[0] 있으면 썸네일 표시
- `MemoryDetail.js` 수정
  - 이미지 갤러리 (스와이프 또는 그리드) 표시

### 2순위: 로그아웃 버튼
- AppHeader.jsx 또는 Navigation에 로그아웃 버튼 추가
- authService.js의 `signOut()` 호출

### 3순위: 프로필 설정 페이지
- 닉네임 변경 (users/{uid}.displayName 업데이트)
- 기념일 수정 (couples/{coupleId}.anniversaryDate 업데이트)

### 4순위: Firebase Hosting 배포
- firebase.json에 hosting 섹션 추가
- `npm run build` 후 `firebase deploy --only hosting`

### 5순위: 소셜 로그인 (장기)
- 구글 소셜 로그인 (Firebase Auth Google provider)
- 카카오 로그인 (REST API 방식, Firebase Auth custom token)

---

## 알려진 이슈 / 주의사항
- `EventForm.js`는 현재 비어있음 (1줄). EventModal.js에 폼이 통합되어 있음.
- Navigation.js, DayModal.js, EventModal.js, TravelPlanPage.js 등은 `.js` 확장자인데 JSX 포함 → vite.config.js esbuild 설정으로 처리됨. 수정 시 주의.
- Storage 보안 규칙에서 coupleId 멤버십 검증 미구현 (인증 여부만 확인). 추후 강화 가능.
- edit_logs 조회 시 coupleId 필터 없음 → 이벤트 ID 기반으로만 조회함. 보안 강화 시 추가 필요.
- `getEventTypeName`, `getEventTypeIcon` 함수에 아직 사람 이름('경락', '효정')이 하드코딩. 향후 userDoc.displayName으로 동적 처리 필요.
