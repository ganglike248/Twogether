# Twogether (우리두리) - 프로젝트 컨텍스트

## 기본 정보
- **앱 이름**: 우리두리 (한글 UI), Twogether (영어/코드)
- **현재 버전**: v0.4.17 | 배포: https://twogether-206fb.web.app | GitHub: master 브랜치

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

### Firebase Storage rules 소유권 검증 (Cloud Functions custom claims 적용됨)
`functions/index.js`의 `onCoupleCreate`/`onCoupleUpdate`가 커플 생성·합류 시 멤버의 Firebase Auth
custom claims(`coupleIds`)를 설정. `storage.rules`의 `hasCoupleIdAccess()`가 이 claim으로 실제
rules 레벨 소유권 검증을 수행 (Firestore 직접 쿼리 없이도 가능).  
`storageService.js`의 `validateCoupleIdAccess()`(클라이언트 사전 검증) + `refreshAuthTokenWithClaims()`
(ID 토큰 강제 갱신 후 claim 확인)가 앞단 방어선이고, 최종 방어는 storage.rules.  
⚠️ **이 함수들은 2026-07-09(v0.4.14)에 처음 배포됨** (`firebase-functions` v6 API 불일치로 그 전엔 배포 자체가
실패하던 상태 — `require('firebase-functions/v1')`로 수정). 트리거는 커플 "생성"/"멤버 추가" 시점에만
발동하므로 **이미 생성돼 있던 기존 커플들은 custom claims가 없어 Storage 접근이 막힐 수 있음** —
기존 커플 전체에 claims를 채워주는 백필 스크립트/callable function 필요 (아직 미실행).  
write에는 `size < 10MB && image/*` 조건 적용 중.

### Firebase Storage + Workbox
`firebasestorage.googleapis.com`을 Workbox runtimeCaching에 넣으면 서비스 워커가 CORS 없이 fetch → opaque 응답 → 이미지 로딩 실패 (특히 iOS). **현재 의도적으로 캐싱에서 제외**되어 있음.

### 웹 푸시 알림 (FCM) — 서비스워커 통합 필수 (v0.4.17~)
`vite-plugin-pwa`를 **`injectManifest` 전략**으로 사용 중 (`vite.config.js`). `generateSW`로 되돌리면 안 됨 —
FCM 웹 푸시는 보통 별도 `firebase-messaging-sw.js`를 등록하는데, Workbox SW와 scope(`/`)가 겹쳐 서로 덮어써서
오프라인 캐싱이 깨지므로, `src/sw.js` 하나에 Workbox 프리캐싱 + FCM 백그라운드 처리를 **반드시 함께** 둔다.
`package.json`의 `workbox-precaching/routing/strategies/expiration`은 `src/sw.js`가 직접 import하므로 devDependencies에 명시 필요.

**Cloud Function은 `notification` 필드가 아니라 `data`-only로 발송** (`functions/index.js`의 `onEventCreate`).
`notification` 필드를 쓰면 브라우저 자동 표시 + `src/sw.js`의 `onBackgroundMessage` 수동 표시가 겹쳐서
**모바일에서 알림이 2번 뜨는 버그**가 실제로 발생했음 — data-only 유지 필수.

**포그라운드(활성 탭) 상태에서는 시스템 알림이 자동으로 안 뜸** — `Layout.jsx`에서
`notificationService.subscribeForegroundMessages()`를 구독해 `toast`로 대체 표시. 이 구독을 빼먹으면
탭이 활성 상태일 때는 알림이 전혀 안 보임 (실제로 한 번 빠뜨렸던 버그 — 유틸 함수만 만들고 어디서도 안 부름).

**FCM 토큰은 로그인 계정이 아니라 브라우저/기기 단위로 고정됨.** 같은 브라우저로 여러 계정을 번갈아 테스트하면
FCM은 동일 토큰을 반환하므로, 예전 계정 문서에 다른 계정의 토큰이 남아있는 채로 두 계정 모두 알림을 받는
버그가 실제로 발생했음(성공 2건으로 로그에 찍힘). `functions/index.js`의 `registerFcmToken`(callable)이
등록 시 그 토큰을 가진 **다른 모든 계정 문서에서 먼저 제거**한 뒤 현재 로그인 계정에만 연결함 —
`notificationService.enableNotifications()`는 직접 Firestore를 쓰지 않고 반드시 이 콜러블을 거침
(`disableNotifications()`는 본인 문서 `arrayRemove`만 하므로 클라이언트 직접 처리 유지, 문제없음).

VAPID 키는 `.env`의 `VITE_FIREBASE_VAPID_KEY` (Firebase Console → 프로젝트 설정 → Cloud Messaging →
Web Push certificates에서 발급 — 콘솔 UI 개편으로 좌측 탭에 안 보일 수 있어 직접 URL
`https://console.firebase.google.com/project/{projectId}/settings/cloudmessaging`로 접근해야 할 수 있음).

관련 파일: `src/sw.js`(신규), `src/services/notificationService.js`(신규),
`src/firebase.js`(`app`/`functionsInstance` export 추가), `src/components/Settings/SettingsPage.jsx`(알림 켜기 토글),
`src/components/common/Layout.jsx`(포그라운드 토스트 구독), `functions/index.js`(`onEventCreate`, `registerFcmToken`).

**알림 로드맵** (A/B 분류는 즉시성 트리거 vs 예약 함수):
- ✅ A1 파트너 일정 추가 알림 — 완료 (v0.4.17)
- 🔲 B2 기념일 D-day 마일스톤 알림 — 다음 우선순위, `koreanHolidays.js`의 커플기념일 계산 로직 재사용 가능
- 🔲 B1 내일 일정 리마인드, A2/A3 여행 후보·버킷리스트 완료 알림
- 🔲 B4 생리 주기 예측 알림 — 민감 정보라 별도 논의 후 opt-in으로 신중히 진행 (사용자 요청으로 보류 중)
- iOS 네이티브 푸시(APNs)는 Apple Developer Program 가입 전까지 보류 — Capacitor `@capacitor/push-notifications` 미설치 상태

### EventForm.js / MemoryForm.js
두 파일 모두 삭제됨 — 로직이 각각 `EventModal.js`, `MemoryList.js`에 통합됨.

### BucketListPage
`onSnapshot` 사용 (실시간 구독) — 파트너 변경 사항이 즉시 반영됨.

### 여행 이벤트 (trips & events)
`tripService.createTrip()`이 trips + events 컬렉션에 동시 저장 (`eventType: 'travel'`).  
`useCalendarData.js`의 events 구독에서 **travel eventType을 필터링해야 함** — 그렇지 않으면 calendar에서 같은 여행이 2번 표시됨.  
현재 `snapshot.docs.filter(doc => doc.data().eventType !== 'travel')`로 처리 중.  
trips 컬렉션에서만 여행 이벤트를 FullCalendar 형식으로 변환하여 표시.

### 색상 설정 시스템
이벤트 타입별 색상(`boyfriend`/`girlfriend`/`personal`)은 Firestore `couples/{coupleId}` 문서의 `eventTypeColors` 필드에 저장됨. CSS 변수(`--color-boyfriend`, `--color-girlfriend`, `--color-personal`)로 앱 전체에 적용.  
파스텔 팔레트 30색 — `src/services/colorService.js`의 `DEFAULT_COLOR_PALETTE` 참고.

### 개인 일정 (personal_events)
소유자(userId)만 접근 가능한 비공개 일정. `coupleId` 없이 `userId` 기반으로 Firestore 규칙 적용.  
캘린더에서 [전체] / [개인] / [커플] 탭으로 필터링.  
MemoryList에도 [개인] 필터 탭으로 표시됨 (과거 일정만, start <= 오늘).
오늘 날짜 문자열 계산: `toISOString()` 금지 — UTC 변환으로 KST에서 하루 밀리고, 이벤트 저장 형식(`'YYYY-MM-DDT00:00:00'`)과 문자열 비교 시 같은 날짜도 제외됨. `src/utils/dataUtils.js`의 `getLocalDateStr()` 공용 유틸 사용 (MemoryList, koreanHolidays 등에서 재사용).  
Home의 "다음 일정"과 "이번 달 일정"에도 개인 일정 포함.  
Home.jsx도 `useCalendarData` 사용 — Calendar.jsx와 동일한 훅이지만 Home은 `{ includeCycles: false }` 옵션으로 호출해 불필요한 cycles 구독을 끔. `extendedProps.isPersonal = true` + `extendedProps.eventType === 'personal'`로 구분.

**useCalendarData.js 구독 구조 주의**: 커플 이벤트, 여행, 생리 기록, 개인 이벤트를 각각 독립 상태(`coupleEvents`, `tripEvents`, `cycles`, `personalEvents`)로 관리하고 렌더링 시 `useMemo`로 병합함. 예전 functional update 기반 `setEvents(prev => ...)` 패턴으로 되돌리지 말 것.
세 번째 인자로 구독 옵션을 받을 수 있음. 예: Home은 생리 기록이 필요 없으므로 `useCalendarData(coupleId, userId, { includeCycles: false })`로 불필요한 `cycles` 구독을 줄임.

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

### Sentry 에러 추적
`src/main.jsx`에서 `VITE_SENTRY_DSN` 환경변수 존재 시 `Sentry.init()` 실행 (browserTracingIntegration, 프로덕션 샘플링 10%).  
`src/components/common/ErrorBoundary.jsx`가 `Sentry.withProfiler()`로 래핑되어 React 렌더링 에러를 자동으로 `captureException`.  
`VITE_SENTRY_DSN`이 없는 프로덕션 빌드에서는 콘솔 경고만 출력됨 (에러 추적 비활성화).

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
/privacy           → PrivacyPage (로그인 불필요 — 앱스토어 심사 제출 URL)
/terms             → TermsPage (로그인 불필요 — 이용약관, PrivacyPage와 동일 패턴)
/account-deletion  → AccountDeletionPage (로그인 불필요 — 계정/데이터 삭제 요청 안내, Google Play 계정 삭제 URL 요건 충족용)
```

## Firestore 데이터 스키마
```
users/{uid}             → uid, email, displayName, coupleId
couples/{coupleId}      → members:[uid1,uid2], inviteCode, anniversaryDate, heroImageUrl,
                          eventTypeColors:{boyfriend,girlfriend,personal},
                          customCategories:[{id,name,color}],  (버킷리스트 카테고리 커스텀)
                          cycleSettings:{enabled,cycleLength,periodLength,icon,label,color,showFertile,showOvulation}
                          ※ 읽기: 멤버(isCoupleMe)만 가능. 초대 코드 조회는 inviteCodes 컬렉션 사용
inviteCodes/{code}      → coupleId, creatorUid, joined(bool), createdAt
                          ※ 인증된 누구나 읽기 가능. joined=true이면 코드 재사용 불가
events                  → coupleId, title, start, end, eventType(couple|boyfriend|girlfriend|travel), ...
                          ※ 'personal' 타입 없음 — personal_events 컬렉션 사용
personal_events         → userId, title, start, end, description, sharedToCoupleEventId(optional)
trips                   → coupleId, title, destination, startDate, endDate, status, calendarEventId(events 컬렉션 연동 ID)
tripSchedules           → tripId, day(숫자), schedules:[{id,time,title,place,memo,completed}]
                          ※ tripId + day 복합 upsert 방식 (saveTripSchedule)
travelTimes             → tripId, day, fromScheduleId, toScheduleId, travelTime
                          ※ subscribeTravelTimes(tripId, day)로 실시간 구독
bucketlists             → coupleId, title, category, completed, completedAt
cycles                  → coupleId, createdBy, startDate, periodLength  (생리 주기 기록)
edit_logs               → eventId, coupleId, action, changes, userId, timestamp  (eventId 기반 조회)
```

## 주요 서비스 & 훅
```
services/
  colorService.js        → 이벤트 타입 색상 팔레트 & 유틸 (DEFAULT_COLOR_PALETTE, DEFAULT_EVENT_TYPE_COLORS)
  categoryColorService.js→ 버킷리스트 카테고리 색상 & 기본값
  cycleService.js        → 생리 주기 Firestore CRUD
  analyticsService.js    → Google Analytics 커스텀 이벤트 로깅
  storageService.js      → Firebase Storage (hero 이미지 업로드/삭제; 이벤트 이미지는 미구현)
  eventService.js        → 커플/여행 이벤트 CRUD + edit_log. convertEventType(writeBatch, 원자적 컬렉션 이동)
  tripService.js         → 여행 CRUD. createTrip은 writeBatch(trips + events 동시 커밋). calendarEventId로 연동
  authService.js         → 회원가입/로그인, createCouple(inviteCodes 동시 생성), joinCouple(inviteCodes 조회)

hooks/
  useCalendarData.js     → Home.jsx + Calendar.jsx 공용 (커플 이벤트 + 개인 이벤트 + 여행 + cycles 통합).
                           여행 이벤트 end를 FullCalendar allDay exclusive 방식에 맞게 +1일 조정함.
                           isLoading: 활성화된 구독(events/trips/cycles/personal) 각각 개별 loaded 플래그로 추적 — 모두 첫 응답 받아야 false.
                           옵션으로 필요 없는 구독을 끌 수 있음(includeCoupleEvents/includeTrips/includeCycles/includePersonalEvents).
  useCalendarEvents.js   → 이벤트 변환/특별일 계산 유틸
  useCalendarNavigation.js → Calendar.jsx 전용 — 월별 슬라이드 터치/스와이프(dragX 기반) 네비게이션
  useColorSync.js        → CSS 변수로 이벤트 색상 동기화 (파트너 포함)
  useTrip.js             → 여행 구독 (useTrips, useTripSchedules)
  useTravelChecklist.js  → trips/{tripId}/checklists/main 실시간 구독 래퍼
  useTravelDecisions.js  → trips/{tripId}/travelDecisions 실시간 구독 래퍼
  useHeroImage.js        → 홈 사진 파일 선택/미리보기
  useDoubleClickPrevention.js → 더블 탭/클릭 방지
  useAnalytics.js        → analyticsService.js 래퍼 훅 — Google Analytics 커스텀 이벤트 + 페이지뷰 추적
  useModalBackButton.js  → 모달 뒤로가기 처리 — 열릴 때 pushState, 뒤로가기 시 onClose 호출, 일반 닫기 시 history.back() 정리. 모듈 레벨 LIFO 스택으로 스택 모달(DayModal→EventModal)도 순서대로 처리.
                           같은 컴포넌트에서 2번 호출 가능 (예: Sidebar — 사이드바 자체 + 로그아웃 확인 모달 각각 등록). LIFO 순으로 로그아웃 모달 → 사이드바 순 닫힘이 보장됨.
  
  ※ usePersonalEvents.js 파일은 존재하지 않음 — 개인 이벤트 구독은 useCalendarData 내부에 통합

utils/
  dataUtils.js           → 날짜 변환/포맷 유틸. calcDday(anniversaryDate) — D+day 계산 공통 함수
  koreanHolidays.js      → 한국 공휴일 + 음력 명절 + 커플기념일 계산
  numberFormat.js        → 숫자 포맷
  appLinkUtils.js        → URL을 플랫폼별 앱 딥링크로 변환 (YouTube/Google Maps/Naver/Kakao/Yanolja 등). getAppLink(url), handleOpenLink(e, url)
```

## 추가 구현 기능 (주요 컴포넌트)
- **WheelModal** (`src/components/Wheel/WheelModal.jsx`) — 돌림판 슬롯머신. 버킷리스트 연동 + 직접 항목 추가. Home에서 버튼으로 열림
- **OnboardingSlides / TutorialSlides** (`src/components/Onboarding/`) — 최초 로그인 시 온보딩, 커플 연결 후 튜토리얼 자동 표시
- **EditLogModal** — 일정 편집 이력 조회. `edit_logs` 컬렉션 기반
- **TravelTimeInput** (`src/components/Travel/Schedule/TravelTimeInput.js`) — 여행 일정 간 이동 시간 기록
- **ScheduleModal** (`src/components/Travel/Schedule/ScheduleModal.js`) — 여행 일정 추가/편집 모달
- **CycleSettingsModal** (`src/components/Profile/CycleSettingsModal.jsx`) — 생리 주기 설정 (사이클 길이, 아이콘, 색상, 가임기 표시)
- **EventTypeColorSelector** (`src/components/Profile/EventTypeColorSelector.jsx`) — 이벤트 타입별 색상 선택 UI. `colorService.js`의 파스텔 30색 팔레트 + 커스텀 색상 직접 입력. `EventTypeColorSettingsModal`에서 사용
- **BaseModal** (`src/components/BucketList/BaseModal.jsx`) — 버킷리스트 전용 재사용 모달 베이스. `isOpen/onClose/title/icon/children` props. `CategoryManagerModal` 등에서 상속하여 사용
- **PrivacyPage** (`src/components/Privacy/PrivacyPage.jsx`) — 개인정보처리방침 페이지. 로그인 없이 접근 가능(`/privacy`). 앱스토어 심사 제출 URL: `https://twogether-206fb.web.app/privacy`
- **AccountDeletionPage** (`src/components/Privacy/AccountDeletionPage.jsx`) — 계정/데이터 삭제 요청 안내 페이지. 로그인 없이 접근 가능(`/account-deletion`). 인앱 자동 탈퇴 기능이 없어 이메일(business9498@gmail.com) 요청 방식만 안내. Google Play Console "삭제된 계정 URL" 등록용: `https://twogether-206fb.web.app/account-deletion`
- **TravelDecisionsTab** (`src/components/Travel/Decisions/`) — 여행 탭의 "선택 사항" 기능. 숙소/식당/액티비티 등 후보를 비교·평가·확정하는 플로우.
  - `travelDecisions` subcollection (`trips/{tripId}/travelDecisions`): `status('deciding'|'decided')`, `decidedOption`, `options[{id,title,price,images[],url,scores[{userId,score}],totalScore}]`
  - `DecisionCategoryList`: 카테고리별 그룹 렌더. `TravelDecisionsTab`에서 deciding/decided를 분리해 렌더링 — decided는 구분선(`tdt-decided-divider`) 아래 맨 하단에 표시
  - `DecisionCard`: 개별 후보 카드. `decision.status === 'decided'`면 확정 섹션(확정하기/확정됨 배지) 숨김
  - `DecisionTopPick`: 점수 합계 기준 상위 후보 미리보기 (검토 중 상태에서만 표시)
  - 확정 시: 상단에 "확정됨" 배너(이미지·점수·합계 표시), 후보 목록은 기본 접힘. "변경하기"는 텍스트 링크
  - `undecideDecision()` — `travelDecisionService.js`에 추가됨 (status→'deciding', decidedOption→null)

## 주요 서비스 패턴 주의사항

### travelChecklistService — serverTimestamp() 배열 금지 (v0.4.4~)
`trips/{tripId}/checklists/main` 문서의 `items[]` 배열 안에 `serverTimestamp()`를 사용하면 Firestore가 쓰기를 거부함.  
배열 항목 내부 타임스탬프는 반드시 `Date.now()` 사용. 문서 최상위 `updatedAt`은 `serverTimestamp()` 유지.

### ScheduleItem 위치 딥링크 패턴 (v0.4.4~)
- Android: `intent://search?query=...#Intent;scheme=naver;package=com.nhn.android.nmap;S.browser_fallback_url=...;end` — 앱/폴백 브라우저 자동 처리
- iOS: `nmap://search?query=...&appname=twogether-206fb.web.app` + `visibilitychange` 이벤트로 앱 열림 감지, 1.5초 후 미열림 시 웹 폴백
- `setTimeout` + `window.location.href` 조합 금지 — 앱 설치 여부와 무관하게 항상 웹 탭이 추가로 열림

### BucketListPage 구독 구조 (v0.3.35~)
`bucketlists` 컬렉션은 `coupleId` 기준으로만 구독 (카테고리 필터 없음).  
카테고리 필터는 `pendingList` / `completedList` useMemo에서 `tabFilters` 적용 — Firestore 재구독 없이 클라이언트에서 처리.

### TripDetail 이동 시간 구독 (v0.3.35~)
`getTravelTimes` (getDocs 일회성) 대신 `subscribeTravelTimes` (onSnapshot) 사용.  
의존성 배열 `[trip.id, activeDay]` — daySchedules 변경과 무관하게 실시간 업데이트.

### 생리 주기 배란일/가임기 계산 가드
`useCalendarEvents.js`에서 `cycleLength`/`periodLength`는 숫자로 정규화해서 사용.
`cycleLength < 14`이면 배란일 오프셋이 음수가 되므로 배란일 이벤트를 만들지 않음. 가임기도 시작/종료 오프셋이 음수이면 표시하지 않음.

### MemoryList 검색 페이지네이션 (디바운스 + 경쟁 조건 가드)
검색은 Firestore `title` 접두사 매칭 대신, 날짜순 페이지를 읽어 클라이언트에서 제목/내용 부분 문자열 매칭(`matchesSearchTerm`)함.
- 입력 300ms 디바운스(`debouncedSearchTerm`) — 매 키 입력마다 스캔이 실행되지 않도록 함. 디바운스로 "검색 1회당 최대 1번"이 보장되므로, `fetchSharedSearchPage`는 매칭될 때까지 계속 스캔함 (인위적으로 낮은 상한을 걸지 않음 — 사용자가 "더 찾아보기"를 몇 번 눌러야 할지 모르는 UX가 되는 것을 피함). `MAX_RAW_PAGES_PER_SCAN`(500페이지)은 평소엔 닿지 않는 안전장치일 뿐.
- `searchGenerationRef`로 검색어가 바뀐 뒤 늦게 도착한 이전 요청의 응답을 무시함 (경쟁 조건 방지) — 특히 `fetchMoreSearchResults`가 스크롤로 트리거된 상태에서 검색어가 바뀌는 경우 대비.
  **주의**: `fetchMoreSearchResults`의 `finally`에서 `searchIsLoadingMore`를 리셋할 때 generation 체크로 조건부 리셋하면 안 됨 — `finally`는 `try` 안의 `return`에도 항상 실행되므로, generation이 안 맞는(오래된) 요청이 조건부로 리셋을 건너뛰면 그 뒤로 `searchIsLoadingMore`가 영원히 true로 남아 "더 불러오는 중" 스피너가 모든 후속 검색에서 멈추지 않음. 항상 무조건 리셋할 것.
- 개인 일정은 이미 실시간 구독(`personalMemories`)되어 있어 한 번에 필터링하되, 첫 PAGE_SIZE(10)개만 표시 (공유 일정 페이지와 크기 규칙 통일). `personalMemoriesRef`로 참조해서 개인 일정이 변경돼도 검색이 재실행/리셋되지 않도록 함.

## 남은 작업
- 이벤트 이미지 업로드: EventModal.js 파일선택 UI → `storageService.uploadEventImage()` (미구현) → imageUrls 저장 → MemoryCard/Detail 표시 (MemoryDetail.js는 imageUrls 필드를 받지만 렌더링 미구현)
- 소셜 로그인 (Google/Kakao, 장기)

### EventModal 개인 일정 localStorage 동작 (의도적 설계)
`localStorage('twogether_personal_default')`: 저장 시(`handleSubmit`) 마지막으로 선택한 개인/공유 여부를 저장하고, 새 일정 생성 시(`event=null`) 해당 값으로 초기화함.
CLAUDE.md 이전 버전의 "이전 입력값 잔류 버그" 기록은 오류 — **의도적인 UX 설계**. 수정 대상 아님.

## Capacitor 앱 빌드 가이드

### 구조
```
android/   → Android 네이티브 프로젝트 (Android Studio로 열기)
ios/       → iOS 네이티브 프로젝트 (Mac + Xcode 필요)
assets/
  icon-only.png        → 아이콘 소스 (1375×1375 RGBA)
  splash-icon-only.png → 스플래시 아이콘 소스 (동일 파일)
capacitor.config.ts    → 양 플랫폼 공통 설정
```

### 앱 ID / 패키지명
- `com.wooridoori.twogether` — Android `applicationId` + iOS `Bundle Identifier` 동일 사용
- 원래 `com.twogether.app`이었으나 Google Play에서 패키지명 중복으로 거부되어 변경됨 (2026-07-09).
  변경 시 수정 필요한 파일: `android/app/build.gradle`(namespace, applicationId), `capacitor.config.ts`(appId),
  `android/app/src/main/java/{package}/MainActivity.java`(디렉터리 구조 + package 선언 이동),
  `android/app/src/main/res/values/strings.xml`(package_name, custom_url_scheme),
  `ios/App/App.xcodeproj/project.pbxproj`(PRODUCT_BUNDLE_IDENTIFIER, Debug/Release 2곳).
  패키지명은 Play Console에 앱을 만들고 최초 업로드하면 이후 변경 불가하므로 신중히 결정할 것.

### 매번 빌드할 때 순서
```
npm run build          # 1. 웹 앱 빌드 (dist/ 갱신)
npx cap sync           # 2. dist/ → android/ + ios/ 복사 + 플러그인 동기화
```
그 다음 Android Studio 또는 Xcode에서 빌드.

### 아이콘/스플래시 재생성
```
npx capacitor-assets generate --android --ios
```
소스: `assets/icon-only.png`, `assets/splash-icon-only.png`  
출력: `android/app/src/main/res/mipmap-*` + `ios/App/App/Assets.xcassets/`

### Android 빌드 (Windows 가능)
1. Android Studio에서 `android/` 폴더 열기
2. Gradle sync 완료 대기
3. Build → Generate Signed Bundle/APK → Android App Bundle (.aab) 선택
4. keystore 생성 (최초 1회) — **keystore 파일 분실 시 업데이트 불가, 반드시 백업**
5. Google Play Console에 .aab 업로드

### iOS 빌드 (Mac + Xcode 필수)
```bash
# Mac에서 실행
npx cap open ios       # Xcode 프로젝트 열기
```
1. Xcode에서 Signing & Capabilities → Team 설정 (Apple Developer 계정)
2. Bundle Identifier: `com.wooridoori.twogether`
3. Product → Archive → Distribute App → App Store Connect

### 스플래시 스크린 동작 방식
- **Android**: `android/app/src/main/res/drawable/splash.xml` — 핑크 배경 + 앱 아이콘 중앙
- **iOS**: `Base.lproj/LaunchScreen.storyboard` — 핑크 배경(#fce4ec) + AppIcon 중앙
- `@capacitor/splash-screen` 플러그인이 1500ms 후 자동 숨김

### iOS Info.plist 권한
현재 미리 기재된 항목 (이미지 업로드 기능 추가 시 활성화):
- `NSCameraUsageDescription` — 카메라
- `NSPhotoLibraryUsageDescription` — 갤러리

### drawable/splash 충돌 주의
`npx capacitor-assets generate` 실행 시 `drawable/splash.png`가 생성되는데, `drawable/splash.xml`과 이름이 충돌하여 빌드 오류 발생.  
`android/app/src/main/res/drawable/splash.png`는 **삭제 상태 유지** — `npx capacitor-assets generate` 재실행 후 다시 생기면 삭제할 것.  
density별 폴더(`drawable-port-*/splash.png`, `drawable-land-*/splash.png`)는 충돌하지 않으므로 그대로 유지.

### .gitignore 주의
`android/` + `ios/` 폴더는 Git에 포함됨 — 네이티브 설정(colors.xml, Info.plist 등)이 여기에 있음.  
`android/app/build/` 등 빌드 산출물은 `.gitignore`에서 자동 제외됨.

## 작업 규칙
1. 기능 하나 완성 후 커밋 허락 받고 다음 작업 — 여러 요청이어도 한 번에 몰아서 하지 말 것
2. 작업 완료 후 변경 파일·추가 기능·부작용 설명. 커밋은 내가 요청할 때만
3. 하나의 파일에 모든 것 구현 금지 — 기능별 모듈화
4. 요청이 불명확할 때 추론해서 실행하지 말고 선택지 제시 후 확인
5. 내가 제시한 문제가 실제로 그렇게 동작하는지 확인 후 수정(내가 문제가 있다고 말해서 무작정 수정 금지)
6. 커밋할 때에는 항상 모든 파일을 포함(add .)
7. 내가 "마무리"라고 하면, 메모리 업데이트 + 빌드 + 배포 + 커밋 + 푸시까지 실행
