# Twogether (우리두리) - 프로젝트 컨텍스트

## 기본 정보
- **앱 이름**: 우리두리 (한글 UI), Twogether (영어/코드)
- **현재 버전**: v0.4.36 | 배포: https://twogether-206fb.web.app | GitHub: master 브랜치

## 버전 관리 규칙 (필수)
커밋마다 `package.json` version 필드 + `version.txt` **동시** 업데이트

## 핵심 트랩 & 주의사항

### Vite 버전 고정
**Vite 5.4.21 고정** — Node.js 20.15.1이 Vite 8과 호환 안 됨. 절대 업그레이드 금지.

### eslint 스캔 범위 (v0.4.26~)
`eslint.config.js`의 `globalIgnores`에 `dist` 외에 `android`/`ios`/`scripts`도 반드시 포함되어야 함 —
`android/app/src/main/assets/public`, `ios/App/App/public`(둘 다 `npx cap sync`가 만드는 `dist` 복사본)과
`android/app/build/**`는 git에는 없지만(각 플랫폼 자체 `.gitignore`로 제외) 로컬 디스크엔 남아있어서,
이 제외 설정이 없으면 네이티브 빌드를 한 번만 해도 `npm run lint`가 번들된 vendor JS까지 스캔해 수천 개
가짜 문제를 쏟아냄(실측: 1885~3121개 → 93개로 감소). `scripts/`(1회성 시드 스크립트, 그 자체도 gitignore
대상)도 같은 이유로 제외. `functions/**/*.js`는 별도 override로 `globals.node` + `sourceType: 'commonjs'`
지정 — 루트 설정의 `globals.browser`만 쓰면 `require`/`exports`가 전부 `no-undef`로 잡힘.

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
발동하므로 **이미 생성돼 있던 기존 커플들은 custom claims가 없어 Storage 접근이 막힐 수 있음** — 실제로
v0.4.22에서 사진 첨부 봉인 편지 작성 중 `이 커플에 접근할 권한이 없습니다 (custom claims 검증 실패)` 에러로
재현됨. **백필용 콜러블 `functions/index.js`의 `ensureCoupleClaims`로 해결** — 로그인 계정의
`users/{uid}.coupleId` 기준으로 custom claims를 다시 채움. 관리자가 전체 커플을 순회하는 배치 스크립트
대신, `storageService.js`의 `refreshAuthTokenWithClaims()`가 1차 claim 검증 실패 시 이 콜러블을 자동
호출해 자가 복구 후 재검증하는 방식(접근한 사용자 단위로 그때그때 해결, 아직 접근 안 한 기존 커플은
여전히 claim이 없는 상태로 남아있다가 다음에 Storage를 쓸 때 복구됨 — 문제없음).  
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

**브라우저 알림 권한(`Notification.permission`)은 JS로 되돌릴 수 없음** (한번 'granted'면 영원히 'granted').
그래서 설정 UI의 "알림 받기" 토글 표시는 권한이 아니라 `notificationService.shouldReceiveNotifications()`
(권한 허용 + 사용자가 명시적으로 끈 적 없음, 로컬스토리지 `twogether_fcm_disabled` 플래그 기반)로 판단함 —
**기본값은 켜짐**. 실제 FCM 토큰의 Firestore 등록 여부는 별개로 `isDeviceSubscribed(userDoc)`로 확인하며,
`Home.jsx`가 진입 시마다 권한은 있는데 토큰이 등록 안 된 경우(기능 추가 전 가입한 기존 사용자 등) 조용히
백필 등록함. `enableNotifications`/`disableNotifications`의 각 비동기 단계에는 타임아웃 가드가 걸려있음 —
안 걸면 `navigator.serviceWorker.ready`가 응답 없이 멈춰 토글이 영구 로딩 상태로 고착되는 버그가 실제로 있었음.

**`src/sw.js`에 `self.skipWaiting()` + `activate` 시 `self.clients.claim()` 필수.** 없으면 재배포를 반복하는
동안 새 버전이 "대기" 상태로만 쌓이고 활성화가 안 돼 `navigator.serviceWorker.ready`가 멈추는 문제가 실제로
있었음. 클라이언트도 `navigator.serviceWorker.getRegistration()`으로 이미 활성 등록이 있으면 그걸 우선 쓰고
없을 때만 `.ready`를 기다리는 이중 안전장치(`getActiveServiceWorkerRegistration`)가 `notificationService.js`에 있음.

**알림 종류별 on/off 설정**: `SettingsPage` → `/notification-settings`(`NotificationSettingsPage.jsx`, v0.4.22부터
모달이 아니라 전용 페이지 — 알림 종류가 계속 늘어날 걸 대비해 소제목(카테고리)별로 섹션을 나눔)에서
전체 켜기/끄기 아래에 종류별 토글(`NOTIFICATION_TYPES` 배열, `users/{uid}.notificationPrefs.<key>`)이 있음.
서버(`sendPushToUser`)가 발송 직전 이 값을 확인하고, 필드가 없으면(한 번도 설정 안 만짐) 타입별 `defaultOn`을
따름 — **`eventCreate` 기본 켜짐, `eventUpdate`는 기본 꺼짐**(변경마다 알림 오면 피로하다는 사용자 피드백으로
결정). **`coupleConnect`(커플 연결 알림)는 설정 목록 자체에 없음** — 최초 1회뿐이고 항상 필요해서
`sendPushToUser` 호출 시 `type` 인자를 아예 안 넘겨 무조건 발송함. 새 알림 종류 추가 시 `NOTIFICATION_TYPES`에
`category`(소제목 그룹명, 예: `'일정'`/`'D-day'`/`'봉인 편지'`) 포함해서 항목만 추가하면 설정 UI에 자동 반영
(같은 `category` 문자열끼리 자동으로 같은 섹션에 묶임 — `groupByCategory()` 참고).

VAPID 키는 `.env`의 `VITE_FIREBASE_VAPID_KEY` (Firebase Console → 프로젝트 설정 → Cloud Messaging →
Web Push certificates에서 발급 — 콘솔 UI 개편으로 좌측 탭에 안 보일 수 있어 직접 URL
`https://console.firebase.google.com/project/{projectId}/settings/cloudmessaging`로 접근해야 할 수 있음).

**알림 권한 "프라이밍" 화면 (v0.4.20~)**: 브라우저 알림 팝업은 설명 없이 뜨고 한 번 차단하면 영구히
되돌릴 수 없어서, 실제 팝업 전에 `NotificationPrimingModal`이 알림 종류를 먼저 설명하고 "알림 받기"를
눌러야 그때 `Notification.requestPermission()`을 호출함. `CoupleSetupPage.jsx`(신규 가입) + `Home.jsx`
(기존 가입자) 양쪽에 마운트하되, 로컬스토리지 `twogether_notification_priming_shown` 플래그로 앱 전체에서
**딱 한 번만** 표시(둘 중 먼저 도달하는 화면에서 뜸). `Home.jsx`의 기존 "권한 있는데 토큰만 미등록" 백필
로직과는 분리됨 — 그건 이미 브라우저 팝업을 거친 뒤라 재설명 없이 조용히 처리, 권한 자체가 없는 경우만
이 모달이 담당.

관련 파일: `src/sw.js`, `src/services/notificationService.js`, `src/components/common/NotificationPrimingModal.jsx`(권한 프라이밍),
`src/firebase.js`(`app`/`functionsInstance` export), `src/components/Settings/NotificationSettingsPage.jsx`(종류별 토글, v0.4.22부터 페이지),
`src/components/Home/Home.jsx` + `src/components/Auth/CoupleSetupPage.jsx`(프라이밍 모달 마운트/백필),
`src/components/common/Layout.jsx`(포그라운드 토스트 구독),
`functions/index.js`(`sendPushToUser`/`getPartnerUid` 공용 헬퍼, `onEventCreate`, `onEventUpdate`,
`onCoupleUpdate` 확장, `registerFcmToken`, `ensureCoupleClaims`, `sendMorningReminders`, `sendEveningReminders`,
`onSealedMessageCreate`, `onSealedMessageUpdate`, `checkSealedMessages`).

**Android 웹 푸시 상태바 아이콘이 색칠된 네모로만 보이는 문제 (v0.4.22 발견)**: Android는 웹 푸시
`badge` 옵션을 알파 채널만 보고 단색으로 마스킹해서 상태바에 그림 — `sw.js`에서 `badge`로 불투명 배경의
`app-icon.png`를 그대로 쓰면 실루엣 없이 색칠된 네모만 보임. `public/badge-icon.png`(투명 배경 + 흰색
로고 실루엣, `favicon.svg`의 메인 path를 sharp로 래스터라이즈해서 생성)를 별도로 만들어 `badge`는 이걸,
`icon`(알림 본문에 표시되는 큰 아이콘)은 기존 `app-icon.png`를 유지하도록 분리함. 새 알림 관련 아이콘을
추가할 때는 반드시 투명 배경 단색 실루엣으로 준비할 것 — 불투명 PNG를 `badge`에 쓰면 같은 문제 재발.

**예약 알림 (v0.4.19~)**: 발송 시각은 전체 사용자 공통 고정(개인화 없음) — `sendMorningReminders`(매일
09:00 KST, `functions.pubsub.schedule('0 9 * * *').timeZone('Asia/Seoul')`)가 여행 시작 D-3/D-1 +
기념일(100일 단위/매년 기념일/`COUPLE_DAYS` 이벤트데이)을 **당일 + 하루 전(D-1)** 두 번 체크,
`sendEveningReminders`(매일 21:00 KST)가 내일 일정(커플 공유 + 개인 일정 합산, 1건으로 발송)을 체크함.
**`functions/index.js`의 `COUPLE_DAYS`는 `src/utils/koreanHolidays.js`의 것과 별도로 복사된 목록** —
Cloud Functions가 별도 Node 패키지라 클라이언트 소스를 직접 import 못 해서 그렇고, 캘린더 쪽 이벤트데이
목록을 바꾸면 **여기도 수동으로 같이 갱신해야 함**(자동 동기화 없음). 이벤트데이별로 어울리는 문구
(`suggestion` 필드, 예: 발렌타인데이 → "연인에게 초콜릿을 전해보는 건 어때요?")를 본문에 사용하고,
100일/매년 기념일은 공통 문구("축하해요, 오늘 하루도 예쁘게 보내요")를 씀. 기념일 계산은 커플 전체
컬렉션을 매번 스캔해야 함(각 커플의 `anniversaryDate` 기준 개별 계산이라 쿼리로 필터링 불가) — 현재
규모에서는 문제없지만 커플 수가 매우 커지면 최적화 필요.

**알림 로드맵** (A/B 분류는 즉시성 트리거 vs 예약 함수):
- ✅ 커플 연결 완료, A1 파트너 일정 추가, 2 일정 날짜/시간 변경, 3 여행 D-day, B2 기념일 D-day(+이벤트데이),
  B1 내일 일정 리마인드 — 전부 완료 (v0.4.17~v0.4.19)
- ✅ 봉인 편지 도착(`sealedMessageArrived`)/공개(`sealedMessageUnlocked`) — 완료 (v0.4.22, 아래 "봉인 편지함" 섹션 참고)
- iOS 네이티브 푸시(APNs)는 Apple Developer Program 가입 전까지 보류 — Capacitor `@capacitor/push-notifications` 미설치 상태
- 생리 주기 예측 알림, 여행 후보/버킷리스트 완료 알림, 버킷리스트 추가, 일정 삭제, 여행 체크리스트 완료,
  홈 화면 사진 변경 알림은 **구현 안 하기로 결정** (2026-07-10~11)

### Firebase Hosting 캐시 헤더 (v0.4.18~)
`firebase.json`에 헤더 설정이 없으면 Firebase Hosting 기본값(`max-age=3600`)이 SPA 라우트(`/`, `/calendar` 등
`**` 리라이트로 index.html을 서빙하는 모든 경로)에 그대로 적용됨. 서비스워커는 최신으로 갱신됐는데 `index.html`/JS
번들만 최대 1시간 캐시된 예전 버전을 계속 서빙하는 불일치가 실제로 발생했음(재배포를 반복하는 세션에서 발견).  
`hosting.headers`에 `source: "**"` → `Cache-Control: no-cache`를 **먼저** 두고, `source: "/assets/**"` →
`max-age=31536000, immutable`을 뒤에 둬서 해시 파일만 오버라이드함. **주의**: `source: "/index.html"`처럼
리터럴 경로만 지정하면 안 됨 — SPA 리라이트로 실제 요청은 `/`, `/calendar` 등으로 오기 때문에 매칭이 안 됨
(처음엔 이렇게 잘못 설정했다가 다시 고침).

### Firestore 보안 규칙 — list 쿼리는 where절만으로 규칙 통과가 증명돼야 함 (v0.4.36~)
`events`/`personal_events`처럼 규칙이 `resource.data.coupleId`(또는 `userId`) 같은 문서 필드를 참조하는
컬렉션에 **새 쿼리(`query()`+`getDocs`/`onSnapshot`)를 추가할 때, `where()` 절에 그 필드를 반드시 동등
비교로 포함시킬 것.** Firestore는 list(다건 조회) 요청을 허용하기 전에 "결과에 포함될 모든 문서가 규칙을
통과한다"는 걸 **쿼리의 where절만 보고 사전에 증명**할 수 있어야 하는데, 규칙이 참조하는 필드가 쿼리
필터에 없으면 그 문서를 실제로 읽어보지 않고도(!) list 자체를 통째로 `Missing or insufficient permissions`로
거부함 — 단건 `get()`/`doc(id)` 조회는 이 제약이 없어서 정상 동작하니 "단건은 되는데 목록만 안 됨"이 이
증상의 특징. 실제로 반복 일정의 `recurrence.seriesId`로만 필터링한 쿼리가 이렇게 거부당해서 재현됨 —
`where('coupleId','==',coupleId)`(개인 일정은 `userId`)를 추가해서 해결(`recurrenceService.js`의
`fetchSeriesInstances` 참고). `useCalendarData.js`의 기존 구독들이 이미 이 패턴(항상 `coupleId`/`userId`
필터 포함)을 따르고 있었던 것도 같은 이유. 이 필드들이 순수 동등 비교(`==`)라면 별도 복합 인덱스도
필요 없음(Firestore가 동등 비교끼리는 자동으로 병합 처리 — 인덱스가 필요한 건 range 비교나 orderBy가
섞일 때뿐).

### Firestore 오프라인 캐시 staleness — AuthContext 리다이렉트 가드 (v0.4.18~)
`src/firebase.js`의 `persistentLocalCache`는 origin(localhost vs 배포 도메인)별로 IndexedDB에 독립 저장됨.
같은 브라우저로 여러 계정을 번갈아 로그인하며 테스트하면 `users/{uid}.coupleId` 같은 캐시가 꼬여서, 실제로는
멀쩡한 계정인데 `ProtectedRoute`가 `/couple-setup`으로 잘못 리다이렉트하는 문제가 실제로 있었음(서버 데이터는
항상 정상이었음 — 순수 클라이언트 캐시 문제, 시크릿 모드로 접속하면 정상 동작하는 것으로 확인).  
`AuthContext.jsx`의 `users`/`couples` 구독은 `onSnapshot` 시작 **전에** `getDocFromServer()`로 한 번 강제
확인함 — 리다이렉트를 좌우하는 첫 값이 항상 서버 최신값이 되도록 함(오프라인이면 catch해서 기존처럼 캐시 폴백).
트레이드오프로 로그인마다 서버 왕복 한 번이 늘어나 약간(수백 ms) 로딩이 느려짐 — 잘못된 리다이렉트를 막는 게
더 중요하다고 판단해 감수함. **여러 계정을 같은 브라우저로 번갈아 테스트하지 말 것** — 시크릿 창을 계정별로
쓰거나 브라우저를 나눠서 테스트할 것.

### 로그아웃 리다이렉트 — history.back() 레이스 (v0.4.18~)
`Sidebar.jsx`의 로그아웃 확인 모달은 `useModalBackButton`(뒤로가기 히스토리 pushState)을 쓰는데, 모달이
닫히며 발생하는 `history.back()`과 로그아웃 후 `/login` 이동 타이밍이 겹치면 엉뚱한 이전 페이지로 튕기는
문제가 있었음. `signOut()`을 **먼저 `await`한 뒤** `navigate('/login', { replace: true })`를 명시적으로
호출하도록 수정 — `ProtectedRoute`의 리다이렉트에만 수동적으로 의존하지 않음. `CoupleSetupPage.jsx`의
로그아웃 버튼도 동일 패턴으로 통일.

### 봉인 편지함 (Sealed Messages, v0.4.22~)
로드맵 1번 항목 완료. 파트너에게 편지를 써서 봉인해두는 기능 — 예약 공개(정해진 시각에 자동)와
즉시 공개(작성자가 언제든 "지금 공개")가 배타적이지 않고 하나로 합쳐져 있음. 진입점은 하단 네비게이션이
아니라 **Home 화면 카드**(`/letters`로 이동) — 다른 로드맵 항목들과 동일한 원칙.

**데이터 모델 — 내용 숨김은 반드시 서브문서 분리로**: Firestore 규칙은 문서 단위로만 read를 막을 수 있어서,
같은 문서에 `content`와 `isUnlocked`를 같이 두면 클라이언트가 "봉인 중"이어도 문서 자체는 읽을 수 있어
내용이 새는 허점이 생김. 그래서 `sealedMessages/{id}`(제목/예정시각/봉인상태 — 커플 둘 다 항상 읽기 가능)와
`sealedMessages/{id}/private/content`(실제 내용+이미지 URL — `isUnlocked==true` 이거나 `authorUid==본인`일 때만
read 허용)로 분리함. `firestore.rules` 참고. 편지 삭제 시 이 순서를 반드시 지킬 것: **`private/content`
서브문서 → Storage 이미지 → 상위 문서** 순으로 지워야 함(`sealedMessageService.js`의 `deleteSealedMessage`) —
`private/content`의 delete 규칙이 `get()`으로 상위 문서를 조회해 작성자를 확인하는 구조라, 상위 문서를 먼저
지우면 그 뒤엔 권한 검증 자체가 불가능해짐.

**사진 첨부는 이 기능만을 위한 스코프 한정 구현** — 범용 "이벤트 이미지 업로드"(남은 작업 참고, 아직 미구현)를
기다리지 않고 `storageService.js`에 `uploadSealedMessageImage`/`deleteSealedMessageImage`를 별도로 추가함
(경로: `sealedMessages/{coupleId}/{messageId}`). `storage.rules`에서 이 경로는 `create/update`와 `delete`를
분리된 규칙으로 씀 — Storage 규칙에서 `request.resource`는 delete 요청엔 `null`이라, `size`/`contentType`을
검증하는 조건을 `delete`에도 걸면(예: 기존 `couples/{coupleId}/hero`처럼 `allow write` 하나로 합쳐두면)
삭제 자체가 막혀버림. 새 Storage 업로드 경로를 추가할 때 참고할 것.

**예약 시각은 자유 입력이 아니라 15분 단위(0/15/30/45분)로만 선택 가능** — `UnlockTimePicker.jsx`(날짜 +
시 + 분 select, 분은 4개 옵션만). 이유: 자동 공개 스케줄 함수가 15분 간격으로만 돌기 때문에, 그 외의
분(예: 34분)으로 예약해도 최대 14분까지 밀려서 열림 — 애초에 스케줄과 맞는 시각만 고를 수 있게 선택지
자체를 제한함. 작성 모달(`SealedMessageComposeModal`)과 상세 모달의 "예약 시각 수정"(`SealedMessageDetailModal`,
작성자·미공개 상태에서만) 양쪽에서 공용으로 씀. 과거 시각을 고르면 버튼이 비활성화되고 경고 문구로 바뀜.

**자동 공개 스케줄 + 지연 보정 (`checkSealedMessages`)**: 처리 체인(스케줄러 dispatch → 함수 콜드스타트 →
Firestore 조회/쓰기 → `onSealedMessageUpdate` 트리거(별도 함수, 또 콜드스타트 가능) → FCM 발송 → 기기 전달)이
실측상 2분 안팎 걸림. 그래서 스케줄 자체를 정각(0/15/30/45분)이 아니라 **2분 앞(58/13/28/43분,
`'58,13,28,43 * * * *'` — Firebase는 `every 15 minutes` 같은 AppEngine 문법 대신 raw unix-cron 문자열도
그대로 받음)**으로 당기고, 조회 조건도 `unlockAt <= now`가 아니라 `unlockAt <= now + 2분`(lookahead)으로
미리 내다봄 — `SEALED_MESSAGE_LOOKAHEAD_MINUTES` 상수. **완벽한 정각 보장은 아님**: 처리 체인이 평소보다
빨리 끝나면(웜 상태 등) 반대로 실제 사용자가 고른 시각보다 살짝 일찍 열릴 수 있음 — 평균 지연을 줄이는
근사 보정이라는 점을 사용자에게 이미 안내함(작성 모달의 "최대 5분 정도 오차" 문구). 수동 공개(`unlockSealedMessageNow`)는
이 스케줄과 무관 — 클라이언트가 직접 `isUnlocked`를 바꾸고 `onSealedMessageUpdate` 트리거가 바로 알림 발송.

**알림 2종**: `onSealedMessageCreate`(도착 — 수신자에게 "봉인했어요")와 `onSealedMessageUpdate`(공개 — `isUnlocked`가
false→true로 바뀔 때만, 수동/자동 공개 둘 다 이 트리거 하나로 처리)로 분리. `NOTIFICATION_TYPES`에
`sealedMessageArrived`/`sealedMessageUnlocked` 둘 다 `category: '봉인 편지'`, 기본 켜짐으로 등록됨.

**목록 정렬(`SealedMessagesPage`)**: 봉인 중인 편지가 항상 위, 공개된 편지는 항상 아래. 봉인 중인 것끼리는
늦게 열리는 순(예약 시각 없는 무기한 봉인은 맨 위 — "가장 오래 기다려야 하는" 것으로 취급), 공개된 것끼리는
최근 공개순. 작성자 구분은 새 색상 체계를 만들지 않고 **기존 커플 색상 시스템(`--color-boyfriend`/
`--color-girlfriend`)을 재사용** — 카드 왼쪽 테두리 + 이름 옆 배지 색으로 표시, 대비를 위해 `useColorSync`가
미리 계산해둔 `--color-{role}-font` 대비색 변수를 배지 글자색에 사용함. 본인이 쓴 편지는 이름 대신 "나"만
표시(자기 닉네임을 다시 보여줄 필요 없음).

**사진 표시 비율 고정**: 상세 모달의 `sm-detail-image`는 `width:100%` + `max-height` 고정(px) 조합을 쓰면
기기 화면 너비에 따라 실제 잘리는 가로세로 비율이 달라짐(넓은 화면일수록 파노라마처럼, 좁은 화면일수록
정사각형에 가깝게) — `aspect-ratio: 4/3`로 고정해서 화면 크기와 무관하게 항상 같은 비율로 잘리도록 함.

**Home 카드 요약**: `Home.jsx`가 `sealedMessages`를 구독해서(`subscribeSealedMessages`) 카드에 표시.
"다음 여행" 카드와 동일한 구조(`trip-section-row`/`trip-section-info`/`trip-section-title`/`trip-section-sub`/
`trip-section-badge`)를 그대로 재사용 — 처음엔 별도 스타일(`stat-icon`+큰 숫자)로 만들었다가 다른 홈 카드들과
톤이 안 맞는다는 피드백을 받고 기존 패턴 재사용으로 교체함(새 UI 패턴을 만들기 전에 같은 컨텍스트의 기존
패턴을 먼저 찾아볼 것). 카운트/날짜 숫자는 `--color-primary`로 포인트를 주되, "통"처럼 숫자가 아닌 조사/단위
글자는 강조에서 제외(숫자만 `<span>`으로 감쌀 것). 표시 대상은 `recipientUid===나 && !isUnlocked`인 것만
(본인이 쓴 편지는 이미 내용을 알아서 "기대감" 요소가 아니므로 카운트에서 제외).

관련 파일: `src/services/sealedMessageService.js`(CRUD), `src/components/SealedMessages/`(`SealedMessagesPage.jsx`,
`SealedMessageComposeModal.jsx`, `SealedMessageDetailModal.jsx`, `UnlockTimePicker.jsx`,
`sealed-message-modal.css`, `SealedMessagesPage.css`), `firestore.rules`/`storage.rules`/`firestore.indexes.json`
(`sealedMessages` 관련 블록), `functions/index.js`(`onSealedMessageCreate`/`onSealedMessageUpdate`/`checkSealedMessages`).

### 안드로이드/iOS 네이티브 안정화 (v0.4.23~v0.4.26)
Play Store/App Store 실기기 테스트 중 발견된 Capacitor 네이티브 레이어 특유의 버그들. 웹(PWA)에서는
재현 안 되고 네이티브 빌드에서만 나타나므로, 재현/검증은 브라우저가 아니라 실기기·에뮬레이터·시뮬레이터로
할 것. 빌드/배포 핸즈온 절차는 이 문서와 별개로 루트 `devNote.txt`에 따로 정리돼 있음(버전 올리기, AAB
빌드, 인앱 업데이트 방식 전환, 네이티브 푸시 콘솔 설정 체크리스트 등) — 네이티브 빌드 착수 전 참고할 것.

**하드웨어/제스처 뒤로가기 시 앱이 그냥 종료되던 문제**: 탭 전환·사이드바 메뉴 이동이 대부분
`navigate(..., { replace: true })`라 웹뷰 히스토리에 갈 곳이 없어서, 안드로이드 하드웨어/제스처
뒤로가기가 기본 동작(앱 종료)으로 빠졌음. `@capacitor/app` 설치 + `useAndroidBackButton.js`
(+`AndroidBackButtonHandler.jsx`)로 직접 처리: 갈 히스토리 있으면 그쪽으로(모달 닫기 포함) → 없고
홈이 아니면 홈으로 → 이미 홈이면 한 번 더 눌러야 종료(토스트 안내).

**iOS safe-area 이중 계산 + elastic bounce**: `capacitor.config.ts`의 `ios.contentInset`이 `'always'`였을
때 iOS 네이티브가 safe-area만큼 웹뷰를 한 번 밀고, CSS의 `env(safe-area-inset-*)`가 또 밀어서 상단
헤더 위/하단 탭바 아래에 이중 여백이 생김 — `'never'`로 바꿔 safe-area 처리를 CSS 쪽에만 맡김.
최상단/최하단으로 당겼을 때 헤더·탭바 뒤로 여백이 드러나는 elastic bounce는 스크롤을 `.main-content`
안에 가두는 방식으로 먼저 시도했으나 중첩 모달의 `position:fixed` 터치 판정이 어긋나는 부작용이 있어
롤백 — 대신 `html`/`body`에 `overscroll-behavior-y: none`으로 bounce 자체를 끔.

**Firebase Auth `onAuthStateChanged`가 iOS(WKWebView)에서 무응답으로 멈추던 문제**: 기본 퍼시스턴스
(IndexedDB)가 콜백을 영영 안 불러서 로그인 확인 화면에서 무한 로딩되던 버그. iOS만
`browserLocalPersistence`(localStorage 기반)로 명시 지정해서 해결, 안드로이드/웹은 기존 `getAuth()`
기본 동작 유지. `firebase.js` 참고.

**바닥에 붙는 모달(bottom-sheet)들이 안드로이드 제스처 내비바와 겹치던 문제 (v0.4.26~)**: 하단
내비게이션바(`Navigation.css`)는 처음부터 `env(safe-area-inset-bottom)`을 반영했지만, `align-items:
flex-end`로 화면 바닥에 붙는 모달 12개(BucketList/ChecklistModal/ScheduleModal/WheelModal/
SealedMessage/TripModal/DecisionModal/AddOptionModal/EditOptionModal/CycleSettingsModal/
EventTypeColorSettingsModal/NotificationPrimingModal)의 footer/actions 요소는 이 처리가 빠져 있어서
버튼이 제스처 내비바 뒤로 깔렸음. 각 footer 요소에 `padding-bottom`(또는 `padding` calc)으로 safe-area
여백을 추가해 해결. `EventModal`/`ChangePasswordModal` 등 화면 중앙에 뜨는 모달은 애초에 바닥에 안 붙어서
대상 아님 — 새 바닥-고정 모달 추가 시 이 패턴 그대로 적용할 것.  
⚠ **DayModal은 원래 이 13개에 포함돼 있었으나 v0.4.28(`4f2d532`, 색상 리팩터링)에서 bottom-sheet →
화면 중앙 카드(`align-items: center`)로 바뀌면서 대상에서 빠짐.** 그때 footer의 safe-area 패딩을 같이
지웠어야 했는데 남겨둬서, 화면 바닥에 안 붙는 카드인데도 제스처 내비바 여백만큼 패딩이 계속 붙어 "일정
추가" 버튼 아래에 불필요한 빈 공간이 생기는 버그가 실기기에서만(웹은 대부분 inset=0) 재현됨 — v0.4.31에서
수정. **모달의 위치(`align-items: flex-end` ↔ `center`)를 바꿀 때는 이 safe-area 패딩도 같이
추가/제거할 것** — 잊으면 이런 종류의 버그가 재발함.

**안드로이드 스플래시 배경색이 기기별로 다르게 보이던 문제 (v0.4.26~)**: `targetSdkVersion 36`(Android
12+)부터는 OS 자체 SplashScreen API가 있는데, 실제로 요구하는 속성은 `windowSplashScreenBackground`이고
기존에 쓰던 `android:background`는 이 API가 읽지 않음. 이 속성이 프로젝트 최초 생성 시점(2026-07-01)부터
계속 미설정 상태였고, Android는 이럴 때 제조사 스킨(삼성 One UI 다이나믹 컬러 등)이 자체 기본값으로
폴백하기 때문에 기기에 따라 의도한 핑크(`#fce4ec`)가 아니라 다른 색(라벤더 등 시스템 테마색)으로 보일 수
있었음 — 실제로 실기기에서 재현 보고됨. `styles.xml`의 `AppTheme.NoActionBarLaunch`에
`windowSplashScreenBackground` 명시로 해결. legacy `android:background`만으로는 API 31+ 네이티브
스플래시가 인식 못한다는 점 기억할 것.

### EventModal 'X' 닫기 → CalendarHeader '수정기록' 오클릭 (v0.4.32~)
`EventModal`(일정 추가/수정)의 'X'를 실기기에서 탭하면, 모달이 닫히며 드러나는 `CalendarHeader`의
'수정기록' 버튼까지 같이 눌리는 문제가 실제로 재현됨. 코드상 두 요소가 겹칠 수 없는 구조(`.modal-overlay`가
`position:fixed`+`z-index:1000`으로 전체를 덮고, `CalendarHeader`는 z-index 없음, `.modal-close`의
onClick도 `onClose()` 한 번만 호출 — 중복 호출 경로 없음)라 JS 로직 버그는 아니고, 실기기에서의 터치
드리프트/습관성 더블탭으로 추정(에뮬레이터에서는 재현 안 됨, 둘 다 화면 우상단이라 위치가 가까움).
원인과 무관하게 증상을 막도록 `Calendar.jsx`에서 `EventModal`이 닫힌 시각을 `eventModalClosedAtRef`에
기록하고, `onShowEditLog`가 그로부터 0.5초 이내면 클릭을 무시하도록 방어적으로 처리함. 비슷하게 모달
위/아래로 겹치는 다른 버튼(예: FloatingActionMenu, 캘린더 탭)에서도 같은 증상이 보고되면 동일 패턴 적용할 것.

### 반복 일정 (Recurring Events, v0.4.35~)
캘린더 일정(커플/개인 둘 다)에 매일/매주/매월/매년 반복 설정 추가. 별도 관리 화면 없이 **기존
`EventModal`에 반복 섹션을 추가**하는 방식(디데이 다중 관리와 동일한 원칙 — 새 UI 패턴 대신 기존 폼 확장).

**데이터 모델 — 사전 생성(expand) + 상한, 가상 확장(virtual) 안 씀**: 반복 규칙만 저장하고 렌더링 시점에
occurrence를 계산하는 방식은 캘린더 렌더링뿐 아니라 D-day 카드/오늘·다음 일정/MemoryList 검색/edit_logs/FCM
등 이벤트를 "문서 하나짜리 독립 개체"로 다루는 기존 인프라 전체를 다시 손봐야 해서 채택 안 함. 대신 등록
시점에 실제 발생 날짜만큼 `events`/`personal_events`에 **개별 문서를 그대로 생성**함(각 인스턴스가 보통
일정과 완전히 동일하게 취급됨) — 이 방식이라 위 기존 인프라를 거의 그대로 재사용함.
"계속(무기한)" 옵션은 없음 — 종료 조건(날짜까지/횟수)이 항상 필수이고, 총 발생 개수가
**50개(`RECURRENCE_MAX_OCCURRENCES`)를 넘으면 저장 자체를 막고** "일정의 수가 너무 많습니다. 반복되는
기간 등을 조절해주세요" 에러를 띄움(사용자 확정 사양). 50개면 Firestore 배치 쓰기 한도(500)에 여유 있게
들어가 한 번의 `writeBatch`로 시리즈 생성이 끝남 — 별도 청크 분할/재시도 로직 불필요.
- `eventSeries/{seriesId}`: 규칙 원본 기록(`freq/interval/byWeekday/endType/until/count` 등) + 알림
  트리거 앵커 역할. **재생성 로직이 이 문서를 다시 읽어서 판단하지 않음** — 항상 호출 시점에 전달받은
  rule을 신뢰하는 동기적 구조라 문서 필드가 살짝 낡아도(예: `until`이 근사치) 기능에 영향 없음.
- `events`/`personal_events`의 각 인스턴스 문서: `recurrence: { seriesId, isException, freq, interval,
  byWeekday, endType, until, count }` 필드 추가(규칙 스냅샷을 인스턴스마다 중복 저장 — EventModal이 특정
  인스턴스를 열 때 시리즈 문서를 또 조회하지 않고 그 인스턴스 자체의 값으로 바로 폼을 채우기 위함).
  `isException: true`면 "이 일정만 수정/삭제"로 시리즈에서 분리된 인스턴스 — 이후로는 완전히 일반 일정과
  동일하게 취급(반복 UI 자체가 다시 안 뜸, 재전환/재편입 불가).

**수정/삭제 범위 선택(구글 캘린더 패턴)**: 반복 중인(예외 아닌) 인스턴스를 열어 저장/삭제하면
`RecurrenceScopeModal`이 "이 일정만 / 이후 모두 / 전체" 중 골라야만 진행됨(신규 생성 시엔 안 뜸 — 아직
아무것도 안 만들어졌으니 물어볼 필요가 없음). 서비스 로직은 `src/services/recurrenceService.js`:
- `이 일정만`: 그 문서 하나만 수정/삭제, `isException: true`로 마킹.
- `이후 모두`: **클릭한 인스턴스 자신의 날짜**를 기준으로 그 이후(예외 아닌) 인스턴스를 지우고 새 규칙으로
  재생성. 그 이전은 그대로.
- `전체`: 클릭한 인스턴스 날짜를 기준으로 그 이전은 내용(제목/설명/유형)만 갱신(날짜는 안 건드림), 그
  날짜부터는 지우고 재생성 + `eventSeries` 문서 갱신.
  ⚠ **재생성 기준점은 반드시 "클릭한 인스턴스 자신의 날짜"를 써야 함 — "오늘"이나 "시리즈 최초 시작일"을
  기준점으로 쓰면 안 됨.** 클릭한 인스턴스는 애초에 규칙대로 생성됐던 지점이라 요일/일자 위상(phase)이
  항상 규칙과 맞지만, "오늘" 같은 임의 날짜를 기준점으로 새로 돌리면 매월/매년 반복에서 "매월 1일"이
  "매월 25일"처럼 위상이 밀려버리는 위상 버그가 생김(구현 중 실제로 발견하고 수정함 — 매주 반복만
  요일 집합만 보므로 우연히 안 걸림). "전체"에서 재생성 대상 개수가 0개가 되는 경우(예: 종료일을
  실수로 클릭 인스턴스보다 이전으로 수정)도 저장 자체를 막음 — 안 막으면 기존 미래 인스턴스가 대체 없이
  통째로 삭제돼버림.

**"전체" 수정은 진짜 첫 인스턴스에서만 노출 (v0.4.36~)**: 위 재생성 기준점 설계 때문에, 중간 인스턴스에서
"전체 수정"을 고르면 실제로는 그 인스턴스 날짜부터만 재계산되고 과거는 안 건드리는데 — "전체"라는 이름과
실제 동작이 안 맞아 헷갈린다는 피드백으로, **수정 시에는 열려 있는 인스턴스가 시리즈의 진짜 첫 인스턴스일
때만 `RecurrenceScopeModal`에 "전체" 버튼을 보여줌**(그 외엔 "이 일정만"/"이후 모두" 둘만). 각 인스턴스
문서의 `recurrence.isFirst`(생성 시 `dates[0]`에만 `true`)로 판별 — `updateRecurringEvent`가 'future'/'all'
범위로 재생성할 때도, 재생성 대상보다 앞선(cutDateStr 이전) 문서가 하나도 안 남아있을 때만 새로 만드는
첫 문서에 이 플래그를 이어줌(그래야 진짜 첫 인스턴스를 "이후 모두"로 고쳐도 isFirst가 유지됨). **삭제는
이 제한이 없음** — 삭제의 "전체"는 값이 있는 인스턴스를 어디서 클릭하든 항상 "예외 아닌 인스턴스 싹 다
삭제"로 의미가 명확해서 그대로 항상 노출함(`deleteRecurringEvent`의 'all' scope 로직 자체는 원래도 이미
`cutDateStr=null`로 전부 지우는 방식이라 변경 없음 — UI 노출 조건만 바뀜). 범위 선택 모달의 "이후 모두"
버튼에는 `OO월 OO일부터 적용돼요/삭제돼요` 캡션을 붙여 어느 날짜 기준인지 명시함.
⚠ 진짜 첫 인스턴스를 "이 일정만"으로 시리즈에서 분리하거나 개별 삭제하면, 그 시리즈는 이후 "전체 수정"
자체가 불가능해짐(남은 인스턴스 중 `isFirst`가 없어짐) — 알려진 제약으로 남겨둠(드문 케이스).

**디데이(`isDday`)와 상호 배타** — 반복 일정은 `isDday`를 항상 `false`로 강제(폼에서 두 토글이 서로를
비활성화). 디데이는 특정 하루 기준 카운트다운 개념이라 반복이면 의미가 깨짐(로드맵 "디데이 다중 관리"
결정 참고).

**개인↔커플 전환 미지원**: 이미 반복 중인 인스턴스를 편집할 때는 "나만 보기" 토글이 비활성화됨 — 시리즈
전체를 `events`↔`personal_events` 컬렉션 사이로 옮기는 로직은 범위가 커서 1단계에서 제외(새 반복 일정을
"생성"할 때는 평소처럼 개인/커플 자유 선택 가능, 문제는 기존 시리즈의 사후 전환만).

**기존 단일 일정을 반복으로 "전환" 불가**: 반복 설정 UI는 신규 생성 시, 또는 이미 반복 중인(예외 아닌)
인스턴스를 편집할 때만 노출됨. 평범한 기존 일정이나 이미 분리된 예외 인스턴스를 나중에 반복으로 바꾸는
기능은 없음(1단계 스코프 제외 — 필요성이 확인되면 후속 추가 검토).

**알림/수정기록도 인스턴스 단위가 아니라 시리즈 단위로 요약**: `functions/index.js`의 `onEventCreate`/
`onEventUpdate`는 `recurrence.seriesId`가 있는 문서(=반복 인스턴스)를 감지하면 알림을 스킵함(안 그러면
시리즈 생성 시 인스턴스 수만큼 알림이 한꺼번에 옴). 대신 새 트리거 `onEventSeriesCreate`(`eventSeries`
컬렉션의 `onCreate`)가 시리즈당 1건만 "OO님이 반복 일정을 등록했어요" 발송(개인 일정은 애초에 파트너에게
안 보이므로 스킵, 알림 타입은 기존 `eventCreate`를 재사용 — `NOTIFICATION_TYPES`에 새 항목 추가 안 함).
`edit_logs`도 인스턴스 생성/재생성마다 찍으면 수정기록이 스팸이 되므로, 시리즈 생성/이후모두/전체
수정·삭제는 `action: 'recurrence_created'|'recurrence_updated'|'recurrence_deleted'`로 시리즈당 1건만
기록(`eventId`에 `seriesId`를 씀). "이 일정만" 수정/삭제는 이제 완전히 일반 이벤트라 기존과 동일하게
`action: 'updated'|'deleted'`로 인스턴스별 기록.

**여행(travel) 이벤트는 반복 대상 아님** — `trips` 컬렉션과 이중 연동된 특수 구조라 스코프 제외.

**날짜 계산은 로컬 시각 기준 통일** — `src/utils/recurrenceRules.js`의 날짜 생성 로직은 `toISOString()`을
전혀 안 쓰고 `${dateStr}T00:00:00`(로컬 자정 파싱) + date-fns 가감(로컬 getter/setter 기반) +
`getLocalDateStr()`(로컬 포맷)로 통일함 — date-fns의 `addDays`/`addMonths` 등이 내부적으로
`getDate()`/`setDate()` 같은 **로컬** getter/setter를 쓰기 때문에, 만약 UTC로 파싱한 날짜와 섞어 쓰면
KST가 아닌 타임존(예: 서버가 UTC로 도는 환경)에서 하루 밀리는 버그가 생김 — 구현 중에 이 조합 실수를
초기에 발견하고 로컬 통일로 수정함.

관련 파일: `src/utils/recurrenceRules.js`(순수 날짜 생성 로직, Firebase 의존 없음), `src/services/
recurrenceService.js`(Firestore CRUD), `src/components/Calendar/RecurrenceFields.jsx`(규칙 입력 UI),
`src/components/Calendar/RecurrenceScopeModal.jsx`(범위 선택), `src/components/Calendar/EventModal.js`
(반복 토글/제출 플로우), `firestore.rules`(`eventSeries` 블록), `functions/index.js`(`onEventSeriesCreate`,
`onEventCreate`/`onEventUpdate`의 인스턴스 스킵 분기).

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
/letters           → SealedMessagesPage (봉인 편지함)
/notification-settings → NotificationSettingsPage (알림 설정, v0.4.22부터 모달 아닌 별도 페이지)
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
sealedMessages           → coupleId, authorUid, recipientUid, title, unlockAt(Timestamp|null),
                          isUnlocked, unlockedAt, createdAt
                          ※ 내용은 이 문서에 없음 — sealedMessages/{id}/private/content 서브문서에
                          {content, imageUrl} 분리 저장 (봉인 중엔 서버 규칙으로 실제로 읽기 차단됨)
```

## 주요 서비스 & 훅
```
services/
  colorService.js        → 이벤트 타입 색상 팔레트 & 유틸 (DEFAULT_COLOR_PALETTE, DEFAULT_EVENT_TYPE_COLORS)
  categoryColorService.js→ 버킷리스트 카테고리 색상 & 기본값
  cycleService.js        → 생리 주기 Firestore CRUD
  analyticsService.js    → Google Analytics 커스텀 이벤트 로깅
  storageService.js      → Firebase Storage (hero 이미지, 봉인 편지 첨부 이미지 업로드/삭제; 범용 이벤트 이미지는 미구현)
  eventService.js        → 커플/여행 이벤트 CRUD + edit_log. convertEventType(writeBatch, 원자적 컬렉션 이동)
  tripService.js         → 여행 CRUD. createTrip은 writeBatch(trips + events 동시 커밋). calendarEventId로 연동
  authService.js         → 회원가입/로그인, createCouple(inviteCodes 동시 생성), joinCouple(inviteCodes 조회)
  notificationService.js → 웹 푸시 알림 권한/토큰 관리 (enableNotifications/disableNotifications/
                           shouldReceiveNotifications/isDeviceSubscribed/subscribeForegroundMessages). 상세는
                           "웹 푸시 알림 (FCM)" 트랩 섹션 참고
  sealedMessageService.js→ 봉인 편지함 CRUD (createSealedMessage/subscribeSealedMessages/getSealedMessageContent/
                           updateUnlockAt/unlockSealedMessageNow/deleteSealedMessage). 상세는 "봉인 편지함" 섹션 참고

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
- **SealedMessagesPage** (`src/components/SealedMessages/`) — 봉인 편지함(`/letters`). 로드맵 1번 항목, v0.4.22 완료. 상세는 "봉인 편지함" 트랩 섹션 참고
- **NotificationSettingsPage** (`src/components/Settings/NotificationSettingsPage.jsx`) — 알림 설정(`/notification-settings`). v0.4.22부터 모달 아닌 별도 페이지로 전환, 카테고리별 소제목 섹션
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

### ScheduleItem 위치 딥링크 패턴 (v0.4.4~, 안드로이드 네이티브 앱 분기 v0.4.29~)
- **PWA(안드로이드 브라우저)**: `intent://search?query=...#Intent;scheme=nmap;package=com.nhn.android.nmap;S.browser_fallback_url=...;end` —
  Chrome이 `Intent.parseUri(url, URI_INTENT_SCHEME)`로 이 문법을 직접 해석해 앱 실행/폴백을 처리해줌.
  `scheme` 값은 네이버 공식 문서 기준 `nmap`이어야 함 — 예전엔 `naver`로 오타가 있었고, 이러면 앱 인텐트
  필터와 안 맞아 항상 `browser_fallback_url`(웹)로만 열렸을 가능성이 있음 (v0.4.29에서 수정).
- **iOS / 안드로이드 네이티브 앱(Capacitor) 둘 다**: `nmap://search?query=...&appname=twogether-206fb.web.app`
  커스텀 스킴 직접 호출 + `visibilitychange` 이벤트로 앱 열림 감지, 1.5초 후 미열림 시 웹 폴백.
  ⚠ **안드로이드 네이티브 앱에서는 `intent://` 문법을 쓰면 안 됨** — PWA에서는 동작해도 네이티브 앱에서는
  조용히 아무 반응도 없는 버그였음(실제로 재현/발견됨, v0.4.29에서 수정). 원인: Capacitor Android WebView는
  순수 `android.webkit.WebView`라 `intent://` 문법(Chrome 전용 파싱)을 모르고, `BridgeWebViewClient`가
  `shouldOverrideUrlLoading`에서 이 문자열을 그대로 `bridge.launchIntent()`에 넘기면
  (`node_modules/@capacitor/android/.../Bridge.java`의 `launchIntent()`) scheme이 `"intent"`인 리터럴 URI로
  취급해 `new Intent(ACTION_VIEW, uri)`를 실행 → 매칭되는 앱이 없어 `ActivityNotFoundException` → 빈
  catch 블록으로 조용히 무시됨(폴백조차 안 일어남). 반면 일반 커스텀 스킴(`nmap://...`)은 Capacitor가
  표준 암시적 인텐트로 정상 처리하므로(iOS도 `UIApplication.shared.open()`이 동일하게 처리), 안드로이드
  네이티브 앱은 `Capacitor.isNativePlatform()`으로 감지해 iOS와 같은 커스텀 스킴 경로를 타도록 분기함.
  **새로운 딥링크(카카오맵 등)를 추가할 때도 네이티브 앱 대상이면 `intent://` 대신 이 패턴을 따를 것.**
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

### 구글 로그인 (v0.4.30~)
이메일/비밀번호에 이어 두 번째 로그인 수단. 웹(PWA) + 안드로이드 + iOS 네이티브 앱 전부 지원.

**왜 플러그인이 필요한가**: 안드로이드/iOS WebView 안에서는 구글 정책상 OAuth 팝업(`signInWithPopup`)이
막혀 있어서 (임베디드 웹뷰에서의 OAuth를 구글이 보안상 차단), 네이티브 앱에서는 `@capacitor-firebase/authentication`
플러그인으로 각 플랫폼 네이티브 Google Sign-In SDK를 띄워야 함. 웹(PWA)은 그대로 `firebase/auth`의
`signInWithPopup`/`GoogleAuthProvider` 사용.

**세션은 항상 JS SDK 하나로 통일 (`skipNativeAuth: true`)**: 이 플러그인은 기본값(`skipNativeAuth: false`)이면
네이티브 레이어에도 별도로 로그인시키는데, Firestore/Storage/Functions 등 앱 전체가 참조하는 `auth.currentUser`는
`firebase/auth`(JS SDK) 세션뿐이라 그 "네이티브 레이어 로그인"은 쓸모가 없고 오히려 이중 로그인/이중 충돌
가능성만 생김. `capacitor.config.ts`에서 전역 `skipNativeAuth: true`로 고정 — 네이티브 SDK는 계정 선택
UI(idToken 발급)만 담당하고, `authService.js`가 그 idToken을 `GoogleAuthProvider.credential()` +
`signInWithCredential(auth, ...)`로 JS SDK에 수동으로 로그인시킴 (공식 문서
[firebase-js-sdk.md](https://github.com/capawesome-team/capacitor-firebase/blob/main/packages/authentication/docs/firebase-js-sdk.md) 패턴).

**기존 이메일 가입자와의 연동 (자동 병합 아님, 명시적 액션 필요)**:
- **로그인 화면에서 충돌 시**: 이미 이메일/비밀번호로 가입된 이메일로 구글 로그인을 시도하면 Firebase가
  `auth/account-exists-with-different-credential`을 던짐(계정을 자동으로 합쳐주지 않음) — `signInWithGoogle()`이
  이 에러에서 `GoogleAuthProvider.credentialFromError()`로 보류 중인 credential을 추출해 커스텀 에러로
  다시 던지고, `LoginPage.jsx`가 "비밀번호 입력하면 연동해드릴게요" 인라인 폼을 띄움 → 비밀번호 확인되면
  `linkPendingGoogleCredential()`이 이메일 로그인 + `linkWithCredential()`을 한 번에 처리. 새 계정이
  따로 생기지 않고 기존 uid/coupleId/데이터 그대로 유지됨.
- **설정 화면에서 미리 연동**: `ProfilePage.jsx`의 "연결된 계정" 섹션에서 로그인된 상태로 "연동하기" 누르면
  `linkGoogleAccount()`(웹은 `linkWithPopup`, 네이티브는 `linkWithCredential`)로 현재 계정에 구글을 추가.

**"실수로 새 계정이 생기는" 케이스와 자동 정리 (`ProfilePage.jsx`의 구글 충돌 모달)**: 로그인 화면의 충돌
감지는 구글 계정 이메일이 기존 가입 이메일과 **완전히 같을 때만** 작동함 — 가입할 때 쓴 이메일과 평소
쓰는 구글 계정 이메일이 다르면(흔한 경우) 충돌이 감지되지 않고 조용히 새 orphan 계정이 생겨버림. 이
상태에서 원래(진짜) 계정에 그 구글 계정을 연동하려 하면 Firebase가 `auth/credential-already-in-use`를
던짐(다른 uid에 이미 연동돼 있어서) — `ProfilePage.jsx`의 `handleLinkGoogle`이 이 코드를 잡아 충돌 정리
모달을 띄움:
- `inspectConflictingGoogleAccount()`가 **메인 로그인 세션은 건드리지 않고** 별도의 임시 Firebase 앱
  인스턴스(`initializeApp(app.options, 'google-conflict-...')`)로 상대 계정에 잠깐 로그인해 정보(이메일,
  `coupleId` 존재 여부)만 조회하고 즉시 `deleteApp()`으로 폐기함. 메인 `auth`로 직접 로그인해버리면
  `AuthContext`가 전역 구독 중인 `auth.currentUser`가 바뀌어 화면 전체가 엉뚱한 계정 기준으로 렌더링되는
  부작용이 생기기 때문 — 반드시 분리된 앱 인스턴스를 써야 함.
- 현재 계정의 `coupleId`와 상대 계정의 `coupleId` 유무 조합으로 자동 판정(`conflictResolution`):
  둘 중 하나만 비어있으면(가장 흔한 케이스) 그 계정만 삭제 대상으로 자동 지정 — 사용자는 확인만 하면 됨.
  **둘 다 커플 데이터가 있으면 이 화면에서 삭제 자체를 차단**하고 문의 안내만 표시(사용자 명시적 결정,
  2026-08-05 — orphan 여부를 소프트웨어가 확신할 수 없는 상황에서 실수로 진짜 데이터를 지우는 것을
  원천 차단). 둘 다 비어있으면(진짜 tie) 사용자에게 "구글 계정 유지" / "이메일 계정 유지" 선택지를 보여줌.
  ⚠ 이 판정은 `coupleId` 유무만 봄 — `personal_events`처럼 coupleId 없이도 존재 가능한 개인 데이터는
  검사하지 않는 단순화된 기준(사용자와 합의된 범위).
- 실제 삭제는 항상 "정말 진행하시겠습니까? 되돌릴 수 없습니다" 재확인 단계를 한 번 더 거침.
  `deleteEmptyConflictingAccount()`(상대 계정 삭제, 위와 같은 임시 앱 패턴 재사용 + 삭제 직전 `coupleId`
  재확인)와 `deleteCurrentAccountAndSwitchToGoogle()`(현재 계정 삭제 후 메인 세션에서 구글 계정으로
  전환 로그인) 두 함수로 나뉨 — 후자는 지금 로그인 중인 계정 자체를 지우는 쪽이라 더 신중하게 다룸.
- **Firebase는 마지막 남은 로그인 수단 해제(unlink)도 서버에서 막지 않음** — 해제 자체는 항상 성공하고,
  그 세션이 끝난 뒤부터 그 계정 재로그인이 안 될 뿐. "연동 해제" 버튼도 이걸 막지 않고 확인 모달만 띄움
  (처음엔 "Firebase가 막아준다"고 잘못 가정해서 버튼 자체를 비활성화했었는데, 검증 후 수정 — orphan
  계정 정리에는 오히려 이 동작이 정확히 필요함).

**네이티브 빌드 시 반드시 필요한 수동 단계**: twogether-206fb 프로젝트는 이미 완료됨(2026-08-05) — 아래는
재현/신규 프로젝트용 체크리스트로 남겨둠.
1. Firebase Console → Authentication → Sign-in method → **Google 제공자 켜기** (콘솔 토글, 코드로 불가)
2. 안드로이드: Firebase Console 프로젝트 설정에 **SHA-1 인증서 지문 등록** 필요 — 디버그 키스토어와
   릴리즈 키스토어(Play Console 서명 키) 둘 다. 등록 안 하면 로그인 시도 시 `DEVELOPER_ERROR`.
   디버그/릴리즈 SHA-1 모두 등록 완료(2026-08-06, v0.4.31). Google Play App Signing을 쓰는 경우
   **로컬 업로드 키스토어 SHA-1과 별개로, Play Console → 설정 → 앱 무결성의 "앱 서명 키 인증서" SHA-1도
   반드시 같이 등록**해야 함 — 스토어에서 실제로 다운로드되는 빌드는 이 키로 재서명되기 때문(둘 다
   등록해두면 로컬 릴리즈 빌드/스토어 배포 빌드 모두 커버됨).
3. 위 두 단계 완료 후 **`google-services.json`(android/app/)과 `GoogleService-Info.plist`(ios/App/App/)를
   다시 받아서 교체** — 재발급 전 파일은 `oauth_client` 항목이 비어있어서 그대로 두면 로그인 자체가 실패함.
4. iOS: 새로 받은 `GoogleService-Info.plist`의 `REVERSED_CLIENT_ID` 값을 `Info.plist`의
   `CFBundleURLTypes` → `CFBundleURLSchemes`에 URL Scheme으로 추가해야 함(공식 setup-google.md 필수 단계,
   Xcode GUI로 하는 게 보통이지만 값을 알면 `Info.plist` 직접 편집도 가능 — 이 프로젝트는 이렇게 처리함).
   OAuth 클라이언트가 재발급되어 이 값이 바뀌면 여기도 같이 갱신해야 함.
5. iOS는 Mac+Xcode에서 실제 기기/시뮬레이터로 최종 확인 필요(이 프로젝트의 다른 iOS 네이티브 기능과 동일한 제약).

**검증 방식**: 안드로이드 에뮬레이터는 여전히 이 환경에 없어서(devNote.txt 참고) 코드 정확성만
`./gradlew :app:compileDebugJavaWithJavac`(안드로이드 전체 컴파일)로 검증. **iOS 시뮬레이터는 이
Mac에 Xcode(26.6)와 함께 있어서 실제 실행 가능** — `npm run build && npx cap sync ios && npx cap run ios`로
부팅된 시뮬레이터에 바로 설치/실행됨(시뮬레이터는 코드 서명이 필요 없어 Apple Developer Team 설정 없이도
됨, Archive/App Store 배포 시에만 Team 서명 필요). `xcodebuild -project ios/App/App.xcodeproj -scheme App
-destination 'generic/platform=iOS Simulator' build`(빌드만, GoogleSignIn 프레임워크 링크 포함)도 여전히
빠른 컴파일 검증용으로 유효.

**⚠ Android 실기기(특히 Play Store에서 받은 배포 빌드)에서 로그인 버튼이 "연결하는 중..."에 멈춰
무응답인 버그 (2026-08-10 재발견, v0.4.32에서 수정)**: SHA-1/OAuth 클라이언트 설정이 전부 정상이어도
발생함 — `@capacitor-firebase/authentication`의 Android 구현이 기본값(`useCredentialManager: true`)으로
최신 `androidx.credentials.CredentialManager` API를 쓰는데, 일부 실기기(제조사 스킨, Credential Manager
백엔드가 제대로 안 붙은 기기 등)에서 성공/실패 콜백이 아예 안 오고 그대로 멈추는 문제가 실제로 재현됨.
에뮬레이터는 Play services/계정 설정이 항상 깔끔해서 재현 안 됨. `authService.js`의
`getNativeGoogleCredential()`에서 `signInWithGoogle({ useCredentialManager: false })`로 레거시
`GoogleSignInClient`(표준 `startActivityForResult` 팝업) 플로우를 강제해 회피 + 20초 타임아웃 가드
(`withTimeout`) 추가로 혹시 모를 무응답에도 버튼이 영구히 멈추지 않도록 방어. `linkGoogleAccount()`도
같은 함수를 재사용하므로 동일하게 적용됨.

관련 파일: `src/services/authService.js`(`signInWithGoogle`/`linkPendingGoogleCredential`/`linkGoogleAccount`/
`unlinkGoogleAccount`/`inspectConflictingGoogleAccount`/`deleteEmptyConflictingAccount`/
`deleteCurrentAccountAndSwitchToGoogle`), `src/components/Auth/LoginPage.jsx`(구글 버튼 + 계정 충돌 인라인 폼),
`src/components/Profile/ProfilePage.jsx`("연결된 계정" 섹션 + 구글 충돌 정리 모달), `capacitor.config.ts`
(`FirebaseAuthentication` 플러그인 설정, iOS SPM symlink), `android/variables.gradle`(`rgcfaIncludeGoogle`),
`ios/App/App/AppDelegate.swift`(`Auth.auth().canHandle(url)` — `@capacitor-firebase/messaging`과 같이
쓸 때 공식 문서가 요구하는 처리, 없으면 네이티브 구글 로그인 콜백이 씹혀서 로그인이 멈춤).

## 남은 작업
- 이벤트 이미지 업로드: EventModal.js 파일선택 UI → `storageService.uploadEventImage()` (미구현) → imageUrls 저장 → MemoryCard/Detail 표시 (MemoryDetail.js는 imageUrls 필드를 받지만 렌더링 미구현)
  ※ 봉인 편지함(v0.4.22)은 이 기능을 기다리지 않고 `uploadSealedMessageImage`로 스코프 한정 구현함 — 이 범용 기능이 나중에 추가돼도 봉인 편지 쪽은 그대로 유지, 통합 불필요
- 소셜 로그인 — 구글은 완료(v0.4.30, 아래 "구글 로그인" 트랩 섹션 참고). 카카오는 Firebase Auth
  기본 제공자가 아니라 별도 백엔드(Custom Token 발급용 Cloud Function 또는 Identity Platform
  OIDC) 구축이 필요해 범위가 훨씬 큼 — 아직 미착수, 장기 과제로 유지

## 향후 기능 로드맵 (2026-07-11 논의, 아직 구현 시작 안 함)
사용자와 여러 라운드에 걸쳐 브레인스토밍 후 확정한 6개 기능. 구현 순서는 아래 번호 순(의존성 고려해 정렬됨).
착수 전 이 섹션을 먼저 읽고 시작할 것 — 각 항목의 설계 결정은 이미 논의를 거쳐 확정된 것이므로 재논의 없이
그대로 구현하면 됨(사용자가 명시적으로 바꾸자고 하지 않는 한).

### 1. 봉인 편지함 (타임캡슐 + 깜짝 이벤트 통합) — ✅ 완료 (v0.4.22)
파트너에게 편지를 써서 봉인해두는 기능. 실제 구현 상세(데이터 모델, 규칙, 스케줄 보정, UI 패턴 등)는
위쪽 "### 봉인 편지함 (Sealed Messages, v0.4.22~)" 트랩 섹션 참고 — 착수 전 설계로 여기 남겨뒀던 항목들
(예약/즉시 공개 병행, 봉인 상태는 항상 공개·내용만 숨김, 사진 첨부, 정밀 알림 스케줄)은 설계한 그대로
전부 구현됨.

### 2. 디데이 다중 관리 — ✅ 완료 (v0.4.33)
별도 관리 화면을 만들지 않고 **기존 일정 생성 폼(EventModal)에 "디데이로 표시" 체크박스**만 추가하는 방식으로
확정(사용자 제안, 채택). 체크하면 이벤트 문서에 `isDday: true` 필드 저장(커플/개인 일정 둘 다 지정 가능).
홈 화면에서 `isDday===true`인 이벤트들을 모아 D-day 카드로 나열 — 과거 날짜면 D+N, 미래 날짜면 D-N.
알림도 착수분에 함께 구현됨: `sendMorningReminders`에 여행 D-day와 동일한 D-3/D-1 패턴 추가
(`ddayReminder` 알림 타입, `NOTIFICATION_TYPES`에 카테고리 `D-day`로 등록, 기본 켜짐).

### 3. 그날의 우리 — ✅ 완료 (v0.4.33, 기존 기능 확장 — 신규 아니었음)
**`Home.jsx`에 이미 존재하던 기능**(`yearAgoEvents`, 정확히 1년 전 ±3일, 최대 2개 표시)을 확장. 확장한 것:
- **1~3년 전** 오늘 ±3일을 모두 확인 — 연차별 최대 2개 후보를 라운드로빈으로 채워 넣어, 매칭 있는 연차는
  최소 1개씩 반드시 노출(단순히 앞에서부터 N개만 자르면 1년 전 기록이 많은 커플은 2/3년 전이 통째로
  밀려날 수 있어서 이렇게 함), 전체 최대 4개
- `personal_events` 포함 여부는 착수 전엔 "확장 대상"으로 적어뒀었지만, 실제로 확인해보니
  `useCalendarData`가 반환하는 `events`에 이미 personal_events가 병합돼 있어서 **별도 작업 없이 이미
  충족돼 있었음**(코드 재확인 후 진행 — 문서만 보고 무작정 다시 만들지 않을 것)
- 카드 디자인은 이후 "필름 다이어리" 홈 리뉴얼(아래 섹션)로 통합되면서, 별도 강조 대신 다른 홈 카드와
  동일한 스타일로 다시 통일됨(사용자가 "너무 튄다"고 판단해 취소)

**알림은 추가 안 함**(착수 전 결정 그대로 유지) — 일정을 자주 등록하는 커플은 1년 후 거의 매일 매칭이
발생해서 매일 오는 알림이 되어버림. 사진은 이벤트 이미지 업로드 기능(아직 미구현)이 선행돼야 표시 가능 —
지금은 제목+날짜 텍스트만.

### 4. 일상 결정 기능 (여행 "선택 사항" 기능의 일반화)
`trips/{tripId}/travelDecisions` 서브컬렉션 구조를 최상위 컬렉션으로 일반화(`tripId` 선택적)해서 여행 아닌
일상 결정("저녁 메뉴", "이번 주말 뭐하지")에도 쓸 수 있게 확장. **카테고리는 1회성이 아니라 영구히 재사용되는
개체** — 카테고리 안에서 "새로 정하기"로 반복 라운드 진행 가능하고, 과거 결정 히스토리도 카테고리별로 계속
남음(사용자가 명시적으로 요구한 부분, 빠뜨리지 말 것).

UI: 하단 네비게이션에 탭 추가하지 않고(이미 5개라 복잡해짐), **Home에 진입 카드/버튼** → `/decisions` 신규
페이지. 기존 `DecisionCard`/`DecisionCategoryList`/`DecisionModal` 등 컴포넌트를 최대한 재사용.

### 5. 우리 지도
핀만 찍는 방식이 아니라 **지역을 색칠하는 방식(choropleth)**으로 확정. 국내 여행부터 시작(해외는 추후
확장 여지만 열어둠). 지역 기록 단위를 여행마다 선택 가능하게:
- 자주 가는 지역 → **시/군/구 단위**로 세밀하게
- 어쩌다 가는 지역 → **시/도 단위**로만 크게
- 지도는 시/도가 기본으로 색칠되고, 시/군/구 단위로 기록된 지역은 그 안에서 더 세밀하게 표시(드릴다운)
- 지도 위 핀 클릭 시 "언제 갔는지" 표시 + 해당 여행(`/travel/:tripId`)으로 이동

기술 과제(착수 전 조사 필요):
- 대한민국 시/도(17개)·시/군/구 단위 SVG 또는 GeoJSON 지도 리소스 소싱
- `trips`에 구조화된 지역 필드 추가 필요 — 지금 `destination`은 자유 텍스트라 그대로는 색칠 불가.
  예: `region: { level: 'province'|'district', code: '...' }` 신설, 여행 생성 시 지역 선택 UI 추가

### 6. 위치 기반 추억 알림 — 로드맵에서 제외됨 (사용자 판단으로 폐기)
GPS 상시 추적이 필요하고, 여행이 아니면 같은 지역을 재방문할 동기가 적어 실효성이 낮다고 판단해 제외.
**다시 제안하지 말 것.**

### 7. 우리두리 랩업 + 월간 요약
연말 랩업(풍성한 형태) + 매월 마지막 날 저녁의 월간 요약(가벼운 형태), 두 가지를 함께 만듦.

**연말 랩업**: 인스타 스토리처럼 옆으로 스와이프하는 카드 여러 장. 카드 내용 예시 — 올해 함께한 일정 수,
새로 다녀온 지역 수(5번 지도 데이터 활용), 버킷리스트 달성 개수, 올해 맞은 디데이 마일스톤(2번 데이터
활용), "그날의 우리" 하이라이트(3번 데이터 활용). 이미지로 저장/공유 가능. 1월 초 자동 알림 트리거 +
"지난 랩업 다시보기"로 히스토리 접근 가능.

**월간 요약**: 매월 마지막 날 저녁, 그 달의 기록을 훨씬 가벼운 형태(카드 1~2장, 예: "이번 달 일정 O개,
새로 간 곳 O곳")로 알림. 연말 랩업의 축소판이 아니라 별도의 가벼운 요약.

기술 과제: "매월 마지막 날"은 표준 crontab으로 직접 표현 불가 — 매일 도는 체크(또는 기존
`sendEveningReminders`)에서 "내일이 1일인지"로 판별하는 방식 필요.

**7번은 1~5의 데이터가 쌓인 뒤 착수하는 게 자연스러움(특히 지도 데이터에 의존)** — 구현 순서 마지막.

### 전체 구현 순서
1(봉인 편지함) → 2(디데이) → 3(그날의 우리 확장) → 4(일상 결정) → 5(우리 지도) → 7(랩업+월간 요약).
1~4는 기존 인프라(알림 스케줄, Decisions UI, 이벤트 생성 폼) 재사용 위주라 상대적으로 가볍고, 5는 새 지도
리소스 소싱 + 지역 데이터 구조화가 필요한 첫 무거운 작업, 7은 마지막.
**1~3번(봉인 편지함/디데이/그날의 우리) 완료 (v0.4.22, v0.4.33) — 다음은 4번(일상 결정 기능)부터 시작.**
※ v0.4.23~v0.4.26 사이 실작업은 이 로드맵 항목이 아니라 Play Store/App Store 출시 준비 과정에서 발견된
네이티브 앱 안정화(웹+네이티브 푸시 통합, 인앱 업데이트, 안드로이드 뒤로가기/제스처 내비바 대응, iOS
safe-area 등 — 위 "안드로이드/iOS 네이티브 안정화" 섹션 참고)에 우선순위가 밀려 진행됨. v0.4.27~v0.4.32
사이도 구글 로그인 등 로드맵 외 작업(위 "구글 로그인" 섹션 참고) 위주로 진행되다가, v0.4.33에서 2·3번을
한 번에 마무리하면서 홈 화면 자체도 크게 리뉴얼함(아래 "홈 화면 리뉴얼" 섹션 참고).

### 홈 화면 리뉴얼 (필름 다이어리 톤 + 오늘/우리 이야기 탭, v0.4.33~)
계기: 홈 카드가 8개 넘게 세로로 쭉 이어져서 스크롤이 길고 눈에 안 들어온다는 피드백. 여러 레이아웃 패턴
(벤토 그리드/가로 캐러셀/아코디언/탭 분리)과 전혀 다른 톤앤매너 4종(필름 다이어리/모노 레저/미드나잇
글로우/투게더 블록)을 실제 코드를 건드리기 전에 임시 Artifact로 만들어 비교한 뒤 "탭 분리" + "필름
다이어리" 조합으로 확정. **착수 전 이렇게 임시 mockup으로 방향을 먼저 비교하고 승인받는 흐름 자체가
이 사용자의 작업 방식**이니 비슷한 오픈엔디드 비주얼 요청이 오면 같은 흐름을 따를 것.

**오늘 / 우리 이야기 탭 분리**: 시간에 민감한 카드(다음 여행/오늘 일정/다음 일정/디데이)는 "오늘"에,
발견형 카드(그날의 우리/봉인 편지함/버킷리스트+돌림판)는 "우리 이야기"에 배치해 한 화면에 보이는 카드
수를 절반 가까이 줄임. `Calendar.jsx`의 `.calendar-tabs`(3개 이상 개별 필터 버튼, 좌측 정렬)와는 용도가
달라 재사용하지 않고 `.home-tabbar`/`.home-tab`을 새로 만듦 — 정확히 2개짜리 세그먼트라 폭 100%로 나눠
채우는 형태가 더 맞아서. 탭 전환에 `framer-motion`(이미 프로젝트 의존성, `WheelModal.jsx`에서만 쓰이던 걸
재사용, 새 라이브러리 설치 없음)으로 콘텐츠 슬라이드+페이드(`AnimatePresence mode="wait"`) 및 밑줄
`layoutId` 공유 애니메이션을 적용함.

**필름 다이어리 톤**: 히어로 사진을 흰 여백(폴라로이드 프레임, `hero-photo-col`에 패딩+회전) + 워시테이프로
감쌈. 카드 배경은 살짝 따뜻한 종이색(`#fffdf9`)으로 남겨뒀지만 **테두리는 점선으로 갔다가 실선으로
원복됨**(사용자 피드백) — 점선/실선을 다시 바꿀 일 있으면 `.home-card`/`.hero-stat-card`의
`border` 선언만 보면 됨, 탭바 하단 구분선은 "카드"가 아니라서 점선 유지 중. "그날의 우리" 카드는 한때
존재감을 살리려고 별도 그라데이션 배경을 넣었다가 "다른 카드랑 안 어울린다"는 피드백으로 원복됨 — 카드
자체는 항상 다른 홈 카드와 통일된 스타일 유지할 것, 배지 색(호박색 `--memory-bg`/`--memory-text`)만
의미 구분용으로 남아있음.

**마스코트**: `assets/logo.png`(캡시터 아이콘 소스, 두 캐릭터가 하트 풍선을 든 일러스트)에서 균일한 핑크
배경을 Python/Pillow 색상 거리 기반 크로마키로 제거해 만든 투명 컷아웃 → `src/components/images/mascot.png`.
사진 안이 아니라 **왼쪽 아래 모서리에 걸치도록** 배치(`hero-photo-col`이 `overflow:hidden`을 안 써서 —
폴라로이드 흰 프레임 자체가 시각적 경계라 음수 offset으로 밖으로 나가도 안 잘림). 디데이 배지(하트+`+N일`)는
이 자리를 피해 사진 위 텍스트가 아니라 **흰 배경 알약 배지로 상단 왼쪽**에, 색은 `--color-primary`(진한
`--color-primary-dark`는 너무 진하다는 피드백으로 톤다운).

**오늘 일정 카드**: 다음 여행과 다음 일정 사이에 신설. "오늘"이 이벤트의 `[start, end)` 반열린 구간에
걸치는지로 판별(`s < todayEnd && en > todayStart` 방식) — 하루짜리(`end`가 당일 23:59:59)든 여러
날짜짜리(`end`가 다음날 00:00 배타적)든 같은 로직으로 맞음. 이 카드 신설로 **다음 일정**의 조건도
`start >= 내일 시작`으로 좁혀서 오늘 이벤트가 두 카드에 중복 표시되는 걸 막음. 각 항목은 제목 아래
`extendedProps.description` 한 줄(있을 때만, 말줄임 처리)까지 보여줌.

**다음 여행**: 갈 여행이 없으면 예전엔 "다음 여행은 어디로~?" 빈 상태 문구를 보여줬는데, 지금은 **카드
자체를 렌더링 안 함**으로 바뀜.

검증 방법: 로그인 필요한 실제 앱을 이 환경에서 못 띄우는 대신, 실제 `index.css`/컴포넌트 CSS 파일을 그대로
로드한 정적 또는(애니메이션 확인 땐 React/framer-motion을 ESM CDN으로 불러온) 인터랙티브 HTML을 만들어
Playwright(`npx playwright screenshot` 또는 캐시된 `~/.npm/_npx/*/node_modules/playwright`)로 스크린샷
확인하는 방식을 씀.

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
npx capacitor-assets generate --android --ios --iconBackgroundColor '#fce4ec' --iconBackgroundColorDark '#fce4ec' --splashBackgroundColor '#fce4ec' --splashBackgroundColorDark '#2d1a1f'
```
소스: `assets/logo.png` (단일 소스 — Easy Mode)  
출력: `android/app/src/main/res/mipmap-*`(adaptive icon 포함) + `drawable-*/splash.png` + `ios/App/App/Assets.xcassets/`

⚠ 색상 플래그를 빼먹으면 안 됨 — Easy Mode는 CLI 플래그로만 배경색을 받고
capacitor.config.ts의 `assets` 설정값을 자동으로 읽지 않음. 빼먹으면 기본값
(흰색)으로 생성됨.

⚠ `assets/icon-only.png` + `icon-foreground.png` + `icon-background.png` +
`splash.png`/`splash-dark.png` 조합(Custom Mode)으로 되돌리지 말 것 —
과거 `icon-only.png` 하나만 있는 상태로 이 모드가 걸려서 legacy 아이콘만
생성되고 adaptive icon foreground/background와 스플래시는 Capacitor 기본
placeholder(파란 X, 흰 배경)로 방치된 적 있음 (2026-07-23 발견/수정).

sharp 네이티브 모듈이 빌드 안 돼 있으면 위 명령이 에러남 — 이 저장소를
새로 세팅했다면 먼저 `npm rebuild sharp` 실행 (샌드박스 환경에서는
`npm install-scripts approve sharp` 먼저 필요할 수 있음).

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
7. 내가 "마무리"라고 하면, 아래 순서로 확인 없이 바로 실행:
   - 메모리 업데이트
   - **버전 올리기** — `package.json`/`version.txt` 동시 업데이트에 더해, **플랫폼별 누락 없이**
     `android/app/build.gradle`의 `versionCode`(+1)/`versionName`과 `ios/App/App.xcodeproj/project.pbxproj`의
     `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION`(+1, Debug/Release 2곳 모두)까지 전부 같은 버전으로 동시에
     맞춤 — 웹만 배포하고 네이티브 버전 번호는 그대로 방치되는 일이 없도록 항상 세 플랫폼 버전을 동기화함
   - 웹 빌드(`npm run build`) + `npx cap sync`
   - Firebase Hosting 배포
   - 커밋 + 푸시
   ⚠ 이 버전 동기화는 "번호"만 맞추는 것 — Android AAB(Play Console)/iOS Archive(App Store Connect) 실제
   빌드·업로드는 아래 8번과 동일하게 keystore·Apple 계정 접근 권한이 없어 항상 수동 단계로 남음.
8. 내가 "배포해줘"(또는 "배포"만 언급)라고 하면 확인 없이 바로 웹 빌드(`npm run build`) +
   `npx cap sync` + Firebase Hosting 배포(`npx firebase-tools deploy --only hosting`) +
   버전 파일(package.json/version.txt) 확인 + 커밋 + 푸시까지 실행.
   ⚠ Android AAB(Play Console)/iOS Archive(App Store Connect) 업로드는 이 자동 실행 범위에
   포함 안 됨 — keystore 서명 파일·Apple Developer 계정 접근 권한이 없어 애초에 대신 할 수
   없는 수동 단계(Android Studio/Xcode 필요). 네이티브 빌드가 필요한 변경이면
   `android/app/build.gradle`의 versionCode/versionName + `ios/App/App.xcodeproj/project.pbxproj`의
   MARKETING_VERSION/CURRENT_PROJECT_VERSION까지 플랫폼별 누락 없이 올려두고, 나머지(AAB/Archive
   빌드·업로드)는 안내만 함.
