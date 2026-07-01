# Twogether (우리두리) - 프로젝트 컨텍스트

## 기본 정보
- **앱 이름**: 우리두리 (한글 UI), Twogether (영어/코드)
- **현재 버전**: v0.4.4 | 배포: https://twogether-206fb.web.app | GitHub: master 브랜치

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
MemoryList의 `todayStr` 계산: `toISOString()` 금지 — UTC 변환으로 KST에서 하루 밀리고, 이벤트 저장 형식(`'YYYY-MM-DDT00:00:00'`)과 문자열 비교 시 같은 날짜도 제외됨. 반드시 `getFullYear/getMonth/getDate()`로 로컬 날짜 포맷 사용.  
Home의 "다음 일정"과 "이번 달 일정"에도 개인 일정 포함.  
`useCalendar(coupleId, userId)` — userId 두 번째 파라미터 필수. `extendedProps.isPersonal = true`로 구분.

**useCalendar.js 필터 패턴 주의**: 두 `useEffect`가 각각 `setEvents`를 functional update로 호출.
- 커플 이벤트 구독: `prev.filter(e => e.extendedProps?.isPersonal)` → 개인 이벤트 보존 + 커플 교체
- 개인 이벤트 구독: `prev.filter(e => !e.extendedProps?.isPersonal)` → 커플 이벤트 보존 + 개인 교체
필터 방향을 반대로 쓰면 한쪽 이벤트가 손실되므로 주의.

**useCalendar.js vs useCalendarData.js 개인 이벤트 구별 기준 차이**:
- `useCalendar.js`(Home 전용): `extendedProps.isPersonal` 플래그로 구별
- `useCalendarData.js`(Calendar 전용): `extendedProps.eventType !== 'personal'`로 구별
두 훅이 서로 다른 필드를 기준으로 필터링함. 수정 시 혼용 금지.

**useCalendar.js 세 번째 인자 `myRole`**: 레거시 `isCouple` boolean 필드 폴백 처리용.
`data.eventType`이 존재하는 신규 이벤트에서는 `myRole`이 실제로 사용되지 않음.
시그니처: `useCalendar(coupleId, userId, myRole)` — `myRole`은 있어도 없어도 신규 데이터에 영향 없음.

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
  useCalendarData.js     → Calendar.jsx 전용 (커플 이벤트 + 개인 이벤트 + 여행 + cycles 통합).
                           여행 이벤트 end를 FullCalendar allDay exclusive 방식에 맞게 +1일 조정함 (useCalendar에는 없음 — Home은 여행 이벤트를 표시하지 않으므로 문제 없음).
                           isLoading: 4개 구독(events/trips/cycles/personal) 각각 개별 loaded 플래그로 추적 — 모두 첫 응답 받아야 false. 커플 이벤트 snapshot 교체 시 functional update로 trips/personal 보존.
  useCalendar.js         → Home.jsx 전용 이벤트 훅 (coupleId, userId, myRole) — userId 필수, 필터 패턴 주의(위 참고). myRole은 레거시 폴백 전용(위 참고)
  useCalendarEvents.js   → 이벤트 변환/특별일 계산 유틸
  useCalendarNavigation.js → Calendar.jsx 전용 — 월별 슬라이드 터치/스와이프(dragX 기반) 네비게이션
  useColorSync.js        → CSS 변수로 이벤트 색상 동기화 (파트너 포함)
  useTrip.js             → 여행 구독 (useTrips, useTripSchedules)
  useHeroImage.js        → 홈 사진 파일 선택/미리보기
  useDoubleClickPrevention.js → 더블 탭/클릭 방지
  useAnalytics.js        → analyticsService.js 래퍼 훅 — Google Analytics 커스텀 이벤트 + 페이지뷰 추적
  useModalBackButton.js  → 모달 뒤로가기 처리 — 열릴 때 pushState, 뒤로가기 시 onClose 호출, 일반 닫기 시 history.back() 정리. 모듈 레벨 LIFO 스택으로 스택 모달(DayModal→EventModal)도 순서대로 처리.
                           같은 컴포넌트에서 2번 호출 가능 (예: Sidebar — 사이드바 자체 + 로그아웃 확인 모달 각각 등록). LIFO 순으로 로그아웃 모달 → 사이드바 순 닫힘이 보장됨.
  
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
- **EventTypeColorSelector** (`src/components/Profile/EventTypeColorSelector.jsx`) — 이벤트 타입별 색상 선택 UI. `colorService.js`의 파스텔 30색 팔레트 + 커스텀 색상 직접 입력. `EventTypeColorSettingsModal`에서 사용
- **BaseModal** (`src/components/BucketList/BaseModal.jsx`) — 버킷리스트 전용 재사용 모달 베이스. `isOpen/onClose/title/icon/children` props. `CategoryManagerModal` 등에서 상속하여 사용
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

## 남은 작업
- 이벤트 이미지 업로드: EventModal.js 파일선택 UI → `storageService.uploadEventImage()` (미구현) → imageUrls 저장 → MemoryCard/Detail 표시 (MemoryDetail.js는 imageUrls 필드를 받지만 렌더링 미구현)
- 소셜 로그인 (Google/Kakao, 장기)
- useCalendar.js + useCalendarData.js 중복 onSnapshot 구독 통합 (Home↔Calendar 이동 시 과금)
- 배란일 음수 가드: v0.3.38에서 수정 완료
- MemoryList 검색 시 페이지네이션 미동작: 검색어 입력 중 `fetchMoreMemories` 스킵 → 전체 로드 후 클라이언트 필터 방식 (대량 데이터 시 성능 이슈)

### EventModal 개인 일정 localStorage 동작 (의도적 설계)
`localStorage('twogether_personal_default')`: 저장 시(`handleSubmit`) 마지막으로 선택한 개인/공유 여부를 저장하고, 새 일정 생성 시(`event=null`) 해당 값으로 초기화함.
CLAUDE.md 이전 버전의 "이전 입력값 잔류 버그" 기록은 오류 — **의도적인 UX 설계**. 수정 대상 아님.

## 작업 규칙
1. 기능 하나 완성 후 커밋 허락 받고 다음 작업 — 여러 요청이어도 한 번에 몰아서 하지 말 것
2. 작업 완료 후 변경 파일·추가 기능·부작용 설명. 커밋은 내가 요청할 때만
3. 하나의 파일에 모든 것 구현 금지 — 기능별 모듈화
4. 요청이 불명확할 때 추론해서 실행하지 말고 선택지 제시 후 확인
5. 내가 제시한 문제가 실제로 그렇게 동작하는지 확인 후 수정(내가 문제가 있다고 말해서 무작정 수정 금지)
6. 커밋할 때에는 항상 모든 파일을 포함(add .)
7. 내가 "마무리"라고 하면, 메모리 업데이트 + 빌드 + 배포 + 커밋 + 푸시까지 실행