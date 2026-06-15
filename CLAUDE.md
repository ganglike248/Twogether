# Twogether (우리두리) - 프로젝트 컨텍스트

## 기본 정보
- **앱 이름**: 우리두리 (한글 UI), Twogether (영어/코드)
- **현재 버전**: v0.3.21 | 배포: https://twogether-206fb.web.app | GitHub: master 브랜치

## 버전 관리 규칙 (필수)
커밋마다 `package.json` version 필드 + `version.txt` **동시** 업데이트

## 핵심 트랩 & 주의사항

### Vite 버전 고정
**Vite 5.4.21 고정** — Node.js 20.15.1이 Vite 8과 호환 안 됨. 절대 업그레이드 금지.

### .js 파일에 JSX 포함
`Navigation.js`, `DayModal.js`, `EventModal.js`, `TravelPlanPage.js`, `MemoryList.js` 등이 `.js` 확장자지만 JSX를 사용함. `vite.config.js`의 esbuild 설정으로 처리 중 — 새 `.js` JSX 파일 추가 시 별도 설정 불필요하나, 이 설정을 지우면 전체 빌드 깨짐.

### Firebase Storage rules 배포
`firebase.json`에 `"bucket": "twogether-206fb.firebasestorage.app"` **명시 필수**.  
미명시 시 rules가 기본 `*.appspot.com` 버킷에 배포되어 앱에서 403 에러 발생.

### Firebase Storage rules 소유권 제한
Storage Rules는 Firestore를 직접 쿼리할 수 없어 coupleId 소유권 검증 불가.  
`storageService.js`의 `validateCoupleIdAccess()`가 유일한 소유권 방어선.  
write에는 `size < 10MB && image/*` 조건 적용 중. (완전한 rules 검증은 Auth custom claims + Cloud Functions 필요)

### Firebase Storage + Workbox
`firebasestorage.googleapis.com`을 Workbox runtimeCaching에 넣으면 서비스 워커가 CORS 없이 fetch → opaque 응답 → 이미지 로딩 실패 (특히 iOS). **현재 의도적으로 캐싱에서 제외**되어 있음.

### EventForm.js / MemoryForm.js
두 파일 모두 삭제됨 — 로직이 각각 `EventModal.js`, `MemoryList.js`에 통합됨.

### BucketListPage
`onSnapshot` 사용 (실시간 구독) — 파트너 변경 사항이 즉시 반영됨.

### 색상 설정 시스템
이벤트 타입별 색상(`boyfriend`/`girlfriend`/`personal`)은 Firestore `couples/{coupleId}` 문서의 `eventTypeColors` 필드에 저장됨. CSS 변수(`--color-boyfriend`, `--color-girlfriend`, `--color-personal`)로 앱 전체에 적용.  
파스텔 팔레트 30색 — `src/services/colorService.js`의 `DEFAULT_COLOR_PALETTE` 참고.

### 개인 일정 (personal_events)
소유자(userId)만 접근 가능한 비공개 일정. `coupleId` 없이 `userId` 기반으로 Firestore 규칙 적용.  
캘린더에서 [전체] / [개인] / [커플] 탭으로 필터링.  
MemoryList에도 [개인] 필터 탭으로 표시됨 (과거 일정만, start <= 오늘).  
Home의 "다음 일정"과 "이번 달 일정"에도 개인 일정 포함.  
`useCalendar(coupleId, userId)` — userId 두 번째 파라미터 필수. `extendedProps.isPersonal = true`로 구분.

**useCalendar.js 필터 패턴 주의**: 두 `useEffect`가 각각 `setEvents`를 functional update로 호출.
- 커플 이벤트 구독: `prev.filter(e => e.extendedProps?.isPersonal)` → 개인 이벤트 보존 + 커플 교체
- 개인 이벤트 구독: `prev.filter(e => !e.extendedProps?.isPersonal)` → 커플 이벤트 보존 + 개인 교체
필터 방향을 반대로 쓰면 한쪽 이벤트가 손실되므로 주의.

### ProfilePage / CoupleInfoPage 역할 분리
- `ProfilePage` (`/profile`): 닉네임, 홈 화면 사진, 비밀번호 변경
- `CoupleInfoPage` (`/couple-info`): 연애 시작일(anniversaryDate), 파트너 정보 표시, 초대코드
anniversaryDate를 ProfilePage에서 저장하는 로직은 제거됨 — 절대 다시 추가하지 말 것.

### iOS 입력 관련 주의사항
iOS Safari에서 `font-size < 16px` 입력창 포커스 시 뷰포트 자동 확대 발생.  
`src/index.css`의 `input, textarea, select` font-size를 **1rem 이상** 유지 필수 — 줄이면 iOS에서 zoom 버그 재발.  
CSS grid 내 `input[type="date"]`는 `min-width: 0` 없으면 셀 넘침 → 겹침 발생 (EventModal.css의 `.date-input-group`에 적용됨).

### 코드 스플리팅 & 성능 구조
`src/App.jsx`: 11개 페이지 컴포넌트 모두 `React.lazy()` + `<Suspense>` 처리 — 방문 시에만 해당 청크 로드.  
`vite.config.js`: `manualChunks`로 vendor 분리 (fullcalendar/framer-motion/firebase/react/date-fns).  
초기 번들 1,474kB → 104kB (93% 감소). fullcalendar 228kB는 /calendar 방문 시에만 로드.  
`PageLoader` 컴포넌트: `index.html`에 정의된 `preloader-spin` 키프레임 재사용 (JS 로드 전부터 동작).

### Firestore 오프라인 퍼시스턴스
`src/firebase.js`: `initializeFirestore` + `persistentLocalCache` + `persistentMultipleTabManager` 적용.  
재방문 시 IndexedDB에서 즉시 데이터 반환 → 빈 화면 없이 로딩.  
Safari 프라이빗 모드 등 IndexedDB 미지원 환경: try-catch로 `getFirestore()` in-memory 폴백.

## AuthContext API
`user, userDoc, coupleDoc, coupleId, partnerDoc, myRole, getMemberName, loading` 전역 제공.
- `members[0]` = boyfriend (커플 생성자), `members[1]` = girlfriend (합류자)
- `myRole` = `'boyfriend'` | `'girlfriend'` | `null` — 현재 유저의 역할
- `getMemberName('boyfriend'|'girlfriend'|'couple')` → 실제 displayName 반환
- `getMemberName('personal')` → `'데이트'` 반환 (personal 타입은 UI에서 직접 `'개인'` 처리 필요)

## ProtectedRoute 순서
loading → user 없음(`/login`) → coupleId 없음(`/couple-setup`) → 통과

## 라우트 목록
```
/                  → Home
/calendar          → Calendar (개인/커플/전체 탭)
/memories          → MemoryList
/bucket            → BucketListPage
/travel            → TravelPlanPage
/travel/:tripId    → TravelPlanPage (상세)
/profile           → ProfilePage
/couple-info       → CoupleInfoPage
/settings          → SettingsPage (이벤트 색상 설정 등)
/home-image-settings → HomeImageSettingsPage
```

## Firestore 데이터 스키마
```
users/{uid}          → uid, email, displayName, coupleId
couples/{coupleId}   → members:[uid1,uid2], inviteCode, anniversaryDate, heroImageUrl, eventTypeColors:{boyfriend,girlfriend,personal}
events               → coupleId, title, start, end, eventType, ...
personal_events      → userId, title, start, end, description, sharedToCoupleEventId(optional)
trips                → coupleId, startDate, ...
bucketlists          → coupleId, ...
cycles               → coupleId, createdBy, ...  (생리 주기 기록)
edit_logs            → eventId 기반 조회 (coupleId 필터 없음)
```

## 주요 서비스 & 훅
```
services/
  colorService.js        → 이벤트 타입 색상 팔레트 & 유틸 (DEFAULT_COLOR_PALETTE, DEFAULT_EVENT_TYPE_COLORS)
  categoryColorService.js→ 버킷리스트 카테고리 색상 & 기본값
  cycleService.js        → 생리 주기 Firestore CRUD
  analyticsService.js    → Google Analytics 커스텀 이벤트 로깅
  storageService.js      → Firebase Storage (hero 이미지 업로드/삭제; 이벤트 이미지는 미구현)

hooks/
  useCalendarData.js     → Calendar.jsx 전용 (커플 이벤트 + 개인 이벤트 + 여행 + cycles 통합)
  useCalendar.js         → Home.jsx 전용 이벤트 훅 (coupleId, userId) — userId 필수, 필터 패턴 주의(위 참고)
  useCalendarEvents.js   → 이벤트 변환/특별일 계산 유틸
  useCalendarNavigation.js → 캘린더 슬라이드 네비게이션
  useColorSync.js        → CSS 변수로 이벤트 색상 동기화 (파트너 포함)
  useTrip.js             → 여행 구독 (useTrips, useTripSchedules)
  useHeroImage.js        → 홈 사진 파일 선택/미리보기
  useDoubleClickPrevention.js → 더블 탭/클릭 방지
  useAnalytics.js        → Google Analytics 페이지뷰 추적
  
  ※ usePersonalEvents.js 파일은 존재하지 않음 — 개인 이벤트 구독은 useCalendar/useCalendarData 내부에 통합

utils/
  dataUtils.js           → 날짜 변환/포맷 유틸. calcDday(anniversaryDate) — D+day 계산 공통 함수
  koreanHolidays.js      → 한국 공휴일 + 음력 명절 + 커플기념일 계산
  numberFormat.js        → 숫자 포맷
```

## 추가 구현 기능 (주요 컴포넌트)
- **WheelModal** (`src/components/Wheel/WheelModal.jsx`) — 돌림판 슬롯머신. 버킷리스트 연동 + 직접 항목 추가. Home에서 버튼으로 열림
- **OnboardingSlides / TutorialSlides** (`src/components/Onboarding/`) — 최초 로그인 시 온보딩, 커플 연결 후 튜토리얼 자동 표시
- **EditLogModal** — 일정 편집 이력 조회. `edit_logs` 컬렉션 기반
- **TravelTimeInput** (`src/components/Travel/TravelTimeInput.jsx`) — 여행 일정 간 이동 시간 기록
- **CycleSettingsModal** (`src/components/Profile/CycleSettingsModal.jsx`) — 생리 주기 설정 (사이클 길이, 아이콘, 색상, 가임기 표시)

## 남은 작업
- 이벤트 이미지 업로드: EventModal.js 파일선택 UI → `storageService.uploadEventImage()` (미구현) → imageUrls 저장 → MemoryCard/Detail 표시
- 소셜 로그인 (Google/Kakao, 장기)

## 작업 규칙
1. 기능 하나 완성 후 커밋 허락 받고 다음 작업 — 여러 요청이어도 한 번에 몰아서 하지 말 것
2. 작업 완료 후 변경 파일·추가 기능·부작용 설명. 커밋은 내가 요청할 때만
3. 하나의 파일에 모든 것 구현 금지 — 기능별 모듈화
4. 요청이 불명확할 때 추론해서 실행하지 말고 선택지 제시 후 확인
5. 내가 제시한 문제가 실제로 그렇게 동작하는지 확인 후 수정(내가 문제가 있다고 말해서 무작정 수정 금지)
6. 커밋할 때에는 항상 모든 파일을 포함(add .)
7. 내가 "마무리"라고 하면, 메모리 업데이트 + 빌드 + 배포 + 커밋 + 푸시까지 실행