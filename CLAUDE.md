# Twogether (우리두리)

- 앱 이름: 우리두리(UI) / Twogether(코드). 배포: https://twogether-206fb.web.app, GitHub `master`
- 상세 이력(버그 경위·검증 과정)은 `docs/claude-history.md` — 여기엔 지금 지켜야 할 규칙만 둠
- 커밋마다 `package.json` version + `version.txt` 동시 갱신

## 작업 규칙
1. 기능 하나 끝내고 커밋 허락 받은 뒤 다음 작업. 커밋은 요청할 때만, 항상 `git add .`
2. 불명확하면 추론해서 실행하지 말고 선택지 제시. 사용자가 말한 문제도 실제로 재현되는지 확인 후 수정
3. 기능별 모듈화(한 파일에 몰아넣지 말 것)
4. **검증은 작업 마지막에 빌드 한 번만.** 중간 lint/빌드/스크린샷 금지(요청 시 예외)
5. **답변은 짧게 핵심만**(변경 파일·결과·확인할 점). 자세한 설명은 사용자가 물어볼 때
6. 오픈엔디드 비주얼 요청은 코드 전에 임시 Artifact 시안으로 방향 비교 → 승인 후 구현, 작은 라운드로 다듬음
7. **"마무리"**: 확인 없이 순서대로 — 메모리 업데이트 → 버전 올리기(package.json/version.txt + `android/app/build.gradle`
   versionCode+1/versionName + `ios/App/App.xcodeproj/project.pbxproj` MARKETING_VERSION/CURRENT_PROJECT_VERSION+1, Debug·Release
   2곳) → `npm run build` + `npx cap sync` → `npx firebase-tools deploy --only hosting` → 커밋 + 푸시 → 직전 `release:` 커밋 이후
   사용자 관점 업데이트 노트(`-` 목록, 스토어에 붙여넣을 톤, 내부 리팩터링 제외)
8. **"배포"**: 확인 없이 빌드 + cap sync + Hosting 배포 + 버전 확인 + 커밋 + 푸시. 네이티브 반영 필요하면 네이티브 버전도 올림
   (앱은 dist를 번들하므로 웹 변경도 다음 AAB/Archive부터 반영)
- "마무리"·"배포" 전에 `release-check` 스킬(`node .claude/skills/release-check/check.mjs`)로 버전·배포 순서·금지 패턴·삭제된 CSS 변수 점검
- **`npm test`**(Vitest 단위 테스트, 1초 — 반복 일정·지역 찾기·기념일·지도 집계·오프라인 저장·서버 기념일 문구). 순수 함수를 고치면 같이 실행.
  서버 예약 알림의 날짜·문구 계산은 `functions/reminderText.js`(Firebase 의존 없음, COUPLE_DAYS 일치도 테스트로 확인)
- 같은 때 **`npm run smoke`**(화면 자동 점검, 1~2분)도 실행 — 에뮬레이터(데모 프로젝트)+테스트 계정으로 주요 화면 26곳(저장·오프라인 저장·Esc·키보드 포함)을 열어 오류 화면·처리 안 된 오류·**빨간 오류 토스트**까지 확인.
  운영 데이터 무관. 새 화면·라우트를 만들면 `scripts/smoke/smoke.mjs`의 `CHECKS`에 한 줄 추가. 설정은 루트 `firebase.smoke.json`
- AAB(Play)/Archive(App Store) 빌드·업로드는 항상 사용자 수동(keystore·Apple 계정 없음)

## 환경 트랩
- **Vite 5.4.21 고정**(Node 20.15.1) — 업그레이드 금지
- `eslint.config.js` globalIgnores에 `dist`/`android`/`ios`/`scripts` 필수(네이티브 빌드 산출물 스캔 방지). `functions/**`는 node/commonjs override
- `.js` 파일에도 JSX 있음(`vite.config.js` esbuild 설정) — 이 설정 지우면 빌드 깨짐
- iOS: 입력창 font-size **1rem 이상**(미만이면 포커스 시 확대). grid 안 `input[type=date]`는 `min-width:0`
- 날짜 문자열은 `toISOString()` 금지(KST 하루 밀림) → `getLocalDateStr()`(`utils/dataUtils.js`)
- Firestore 오프라인 캐시는 origin별 IndexedDB — 여러 계정을 같은 브라우저로 번갈아 테스트하지 말 것(시크릿 창 분리).
  `AuthContext`는 users/couples 구독 전에 서버에서 첫 값을 확인함(유지) — 단 3초 넘으면 캐시로 진행(`serverFirst`, 약한 신호에서 첫 화면 지연 방지)
- **화면에서 기다리는 쓰기는 `services/offlineWrite.js`의 `safeSetDoc/safeUpdateDoc/safeDeleteDoc/safeAddDoc/commitBatch`** — 오프라인·8초 지연이면
  기다리지 않고 "연결되면 저장돼요"(대기열에 남음). 그냥 `await setDoc`을 쓰면 오프라인에서 버튼이 멈춤. 트랜잭션은 오프라인이면 바로 실패하므로 대상 아님.
  오프라인 띠·안내는 `common/OfflineBanner`. 실시간 구독은 반드시 오류 콜백(`reportSubscribeError`, `services/subscribeError.js`)으로 로딩을 끝낼 것. 여행 하위 데이터(일정표·후보·체크리스트) 구독은 `subscribeWithPermissionRetry`로 — 방금 만든 여행은 서버 반영 전 '권한 없음'이 한 번 날 수 있음

## Firebase
- `firebase.json`에 `"bucket": "twogether-206fb.firebasestorage.app"` 명시 필수(없으면 rules가 appspot 버킷에 배포돼 403)
- Storage 규칙은 custom claims(`coupleIds`)로 소유권 검증. claims는 `onCoupleCreate/Update`가 설정, 없으면
  `storageService.refreshAuthTokenWithClaims()`가 콜러블 `ensureCoupleClaims`로 자가 복구. write는 `size<10MB && image/*`
- Storage 규칙은 create/update와 delete를 **분리**(delete엔 `request.resource`가 null이라 size/type 조건이 있으면 삭제가 막힘)
- Workbox runtimeCaching에 `firebasestorage.googleapis.com` 넣지 말 것(opaque 응답 → iOS 이미지 실패)
- 사진 업로드는 `storageService`가 올리기 직전 `shrinkImageForUpload`(`utils/imageUtils.js`, 긴 변 1600px·JPEG)로 줄임 — 새 업로드 경로도 같은 함수 사용.
  봉인 편지 사진은 `sealedMessages/{coupleId}/{messageId}_{임의값}`(주소는 private/content에만), 삭제는 내용 문서의 imageUrl로(예전 고정 경로도 같이 시도).
  글꼴은 `index.html` preconnect+link(CSS @import 금지), sw.js가 Google Fonts를 기기에 저장
- Hosting 헤더: `source:"**"` no-cache를 **먼저**, `/assets/**` immutable을 뒤에(리터럴 `/index.html`은 SPA 리라이트에 안 걸림). 보안 헤더는 nosniff·Referrer-Policy·Permissions-Policy만 — **X-Frame-Options·CSP frame-ancestors 금지**(웹 구글 로그인이 Firebase `/__/auth/iframe`을 iframe으로 씀)
- Firestore list 쿼리는 규칙이 참조하는 필드(`coupleId`/`userId`)를 **where 동등 조건에 반드시 포함**(없으면 목록 전체 거부, 단건 get은 됨)
- 모든 update 규칙은 소유권 필드 불변(`request.resource.data.X == resource.data.X`). 커플 합류는 반드시 콜러블
  `joinCoupleWithInviteCode`(서버가 코드 검증·교차 합류 처리). `inviteCodes`는 list/update 금지
- `users` 규칙: coupleId는 그대로이거나 "방금 나 혼자 만든 커플"로만 변경 가능, `couples` 생성은 `members == [본인]`만(v1.0.33, 보고서 `docs/security/`)
- `inviteCodes` 생성은 만든 사람 본인 + 같은 배치의 혼자 커플(`getAfter`로 `members==[본인]`·`inviteCode==코드`), 합류 함수도 커플의 `inviteCode`·만든 사람 멤버 여부 재확인.
  `users` 삭제는 커플이 없을 때만(구글 충돌 정리용). 로그아웃은 `authService.signOut`이 이 기기 알림 토큰을 먼저 지움(AUDIT 묶음 1, v1.1.6)
- Functions 코드: `require('firebase-functions/v1')`, `{ FieldValue, Timestamp }`는 `require('firebase-admin/firestore')`(에뮬레이터 호환)
- 에뮬레이터 검증: `npx firebase-tools emulators:exec --project demo-xxx --only auth,firestore,functions[,storage]`(설정 파일은 프로젝트 안).
  화면 E2E는 `src/firebase.js`의 `VITE_USE_EMULATORS=true`+`VITE_FIREBASE_PROJECT_ID=demo-twogether`, 시드에 `users.nicknameConfirmed:true`와
  로컬스토리지 `twogether_notification_priming_shown` 미리 설정. Playwright는 `~/.npm/_npx/*/node_modules/playwright`
- 에러를 화면에 보여줄 땐 `getFriendlyErrorMessage()`(`utils/errorMessages.js`) 거칠 것(raw 메시지 노출 금지)

## 웹 푸시(FCM)
- `vite-plugin-pwa` **injectManifest** 유지 — `src/sw.js` 하나에 Workbox + FCM 백그라운드(별도 firebase-messaging-sw 금지). sw에 `skipWaiting` + `clients.claim` 필수
- 서버 발송은 **data-only**(notification 필드 쓰면 모바일 2번 표시). 포그라운드는 `Layout`의 `subscribeForegroundMessages` → toast
- FCM 토큰은 기기 단위 → 등록은 반드시 콜러블 `registerFcmToken`(다른 계정에서 같은 토큰 제거)
- 알림 토글 표시는 권한이 아니라 `shouldReceiveNotifications()`(권한 + `twogether_fcm_disabled`), 기본 켜짐. 각 비동기 단계 타임아웃 가드 유지
- 종류별 설정: `NOTIFICATION_TYPES`(`category`로 섹션 자동 묶음, `users.notificationPrefs`), `eventUpdate`만 기본 꺼짐. 커플 연결 알림은 type 없이 항상 발송
- `badge` 아이콘은 투명 배경 단색(`public/badge-icon.png`). 아이콘은 역할별 파일: `app-icon.png`(512, 매니페스트), `app-icon-192.png`(192·알림), `apple-touch-icon.png`(180), `favicon-32.png` — 원본은 `assets/logo.png`
- 예약 알림: `sendMorningReminders`(09:00 KST, 여행·기념일·디데이 D-3/D-1), `sendEveningReminders`(21:00, 내일 일정 + 말일이면 `sendRecapNotifications` 월간 요약, 12/31은 랩업 1건만, type `recap`).
  기념일 알림 문구는 `MILESTONE_DAY_BODY`/`MILESTONE_YEAR_BODY`(B안). `functions/index.js`의 `COUPLE_DAYS`는 `utils/koreanHolidays.js` 복사본 — 바꾸면 둘 다 수정
- 권한 프라이밍 `NotificationPrimingModal`은 앱 전체 1회(`twogether_notification_priming_shown`), CoupleSetup/Home에 마운트

## 네이티브(Capacitor)
- 앱 ID `com.wooridoori.twogether`(변경 불가). 빌드: `npm run build` → `npx cap sync` → Android Studio/Xcode. 절차는 `devNote.txt`
- 안드로이드 뒤로가기는 `useAndroidBackButton`(히스토리 → 홈 → 두 번 눌러 종료)
- iOS `contentInset: 'never'` + `html/body overscroll-behavior-y:none`. iOS Auth는 `browserLocalPersistence`
- 바닥에 붙는 모달(`align-items:flex-end`) footer에만 `env(safe-area-inset-bottom)` 패딩 — 위치를 center로 바꾸면 같이 제거
- 스플래시: `styles.xml`에 `windowSplashScreenBackground` 필수. `drawable/splash.png`는 삭제 상태 유지(splash.xml과 충돌)
- 아이콘 재생성: `npx capacitor-assets generate --android --ios --iconBackgroundColor '#fce4ec' --iconBackgroundColorDark '#fce4ec' --splashBackgroundColor '#fce4ec' --splashBackgroundColorDark '#2d1a1f'`
  (소스 `assets/logo.png` 하나, 색 플래그 필수, sharp 오류 시 `npm rebuild sharp`)
- 딥링크: 네이티브 앱에선 `intent://` 금지 → 커스텀 스킴(`nmap://...`) + visibilitychange 폴백. PWA 안드로이드만 intent:// 사용
- R8: release `minifyEnabled`+`shrinkResources`. `proguard-rules.pro`의 `-dontwarn com.facebook.*` 필수, 이름으로 찾는 리소스는
  `res/raw/keep.xml`에 추가. Play의 "축소율 낮음"·"디버그 기호" 경고는 라이브러리 원인이라 보류. 스토어 전 내부 테스트 트랙으로 실기기 확인
- iOS 앱 개인정보 매니페스트 `ios/App/App/PrivacyInfo.xcprivacy`(App 타깃 Resources에 등록): `@capacitor/filesystem`의 FileTimestamp C617.1.
  필수 사유 API를 쓰는 플러그인을 추가하면 그 README의 요구 항목을 여기에 추가
- 파일 저장은 `services/fileSave.js`의 `saveTextFile`/`saveImageFile`(요약 이미지, `recapImage.js`가 Google Fonts `text=` 서브셋으로 폰트 임베드)만(네이티브는 filesystem+share, 웹뷰는 `<a download>` 무시)

## 구글 로그인
- 네이티브는 `@capacitor-firebase/authentication`(`skipNativeAuth: true`) → idToken으로 JS SDK `signInWithCredential`. 세션은 JS SDK 하나
- Android는 `signInWithGoogle({ useCredentialManager: false })` + 20초 타임아웃(일부 기기 무응답 방지). iOS `AppDelegate`의 `Auth.auth().canHandle(url)` 유지
- 이메일 가입자와 충돌: 로그인 화면은 `GoogleConflictForm`(비밀번호로 연동), 계정 화면은 `LinkedAccountsSection` 충돌 정리 —
  상대 계정 조회·삭제는 **임시 Firebase 앱 인스턴스**로(메인 auth 건드리지 말 것), 둘 다 커플 데이터 있으면 삭제 차단
- 콘솔 설정(SHA-1 디버그/릴리즈/Play 앱 서명 키, plist URL scheme)은 완료됨

## 디자인 시스템
- 색 변수(`index.css`): `--color-primary` #FFB6C1(배경·테두리·아이콘, 흰 글씨면 굵게), `--color-primary-dark` #E07A93(글씨용, 차분한 장밋빛),
  `--color-primary-light`, `--color-danger` #FF6B6B(오류·필수·삭제·초과 전용), `--color-text-desc`(소제목·설명).
  `--color-primary-medium` #FF9BAC(hover·테두리 등 보조 강조). **hex 직접 쓰지 말 것, 그라데이션 버튼 금지**(성공 초록 #4caf7d만 예외).
- 일정 색 기본값 couple #ffd6e0 / boyfriend #c7ceea / girlfriend #b5ead7 / trip #e8d7f1은 `index.css`. `useColorSync`는 사용자가
  설정에서 바꾼 색만 html 인라인으로 덮어씀(trip 제외). **컴포넌트 CSS에서 `:root` 변수 정의 금지**(지연 로딩 청크가 전역을 덮음)
- 폰트: 제목·로고·숫자 `--font-display`(주아), 본문 고운돋움. 화면·모달 제목 목록은 `index.css`의 "제목 폰트 통일" 블록(`#root .클래스`) — 새 제목 클래스도 거기 추가. 고운돋움은 굵기 하나라 강조는 색으로(작은 라벨만 600 허용)
- `#root`는 `height:100dvh; flex column`(바꾸지 말 것). Layout 밖 독립 페이지는 `flex:1 0 auto; min-height:100%`, **100vh 금지**,
  가로 `margin:0 auto` 금지(→ `width:100%` + `align-self:center`). 고정 전체 높이는 `100dvh`, 노치는 safe-area padding
- 메뉴 화면: 루트에 `menu-page` + `<MenuPageHeader title onBack? />`(`common/MenuPage.jsx/.css`). 설정 목록은 `.settings-item`(아이콘 칩+제목+설명)
- 확인 모달: `common/AppModal.css`가 `confirm-modal-*`/`profile-modal-*`/`couple-info-modal-*`를 통일. 단순 확인은 `ConfirmModal` 사용
- 모달 열림 상태는 URL(`?modal=` 또는 경로)에서 파생, `navigate()` 기반. 첫 진입(`location.key==='default'`)이면 닫을 때 replace
- 여러 줄 입력은 `common/AutoGrowTextarea.jsx`
- 지도 경로 계산은 `components/Map/mapGeometry.js`(labelPoint·bounds), 'YYYY-MM-DD'→'11월 14일'은 `utils/dateFormat.js`의 `formatMonthDay`. Analytics는 `analyticsService`가 첫 기록 때 불러옴(firebase.js에서 getAnalytics 금지)
- **접근성**: 누르는 div·카드는 `{...pressable(handler)}`(`utils/pressable.js` — role·탭·Enter/Space), 새 모달 컨테이너는
  `ref={useDialog(open, onClose)} role="dialog" aria-modal="true" tabIndex={-1}`(`hooks/useDialog.js` — 포커스 이동·Esc·맨 위 모달만).
  작은 아이콘 버튼은 보이는 크기는 두고 `::after`로 누르는 영역 44px(index.css 블록)
- **문구 말투는 '~어요'체**(토스트·오류·안내 전부). 개인정보처리방침·이용약관만 격식체
- 홈 카드는 모두 같은 스타일(`.home-card`), 새 UI 패턴 전에 같은 맥락의 기존 패턴 재사용. 버킷 카테고리 색은 파스텔 팔레트(v1.0.38, `categoryColorService` — 예전 원색은 `toPastelCategoryColor`로 표시 시 변환)

## 기능별 규칙
**첫 실행**(`components/Auth/`): `LoginPage` `?step=`(없음/signup/login/reset) → Welcome/EmailAuthForm/PasswordResetForm/GoogleConflictForm.
이메일 존재 여부는 판별 불가(열거 보호) → 가입·로그인 입구 분리, 비밀번호 찾기 문구도 존재 여부 숨김. `CoupleSetupPage` `?step=`
(nickname/choice/invite/join): 닉네임 미확정+커플 없음이면 `NicknameStep`(`confirmNickname`→`nicknameConfirmed`), 닉네임 수정은 replace.
연애 시작일은 필수(코드 생성 전). 초대 공유 `services/inviteShare.js`. "2명 커플이면 홈으로" 리다이렉트는 `!connected && !formLoading`일 때만.
연결 완료 `ConnectedStep`. 커플 없는 사용자용 로그아웃·탈퇴 링크 유지. 초대 링크 자동 입력은 안 함

**홈**: '오늘'(여행·오늘 일정·다음 일정·디데이) / '우리 이야기'(그날의 우리·편지·버킷·돌림판) 탭. `FirstStepsCard`(할 일 4개 자동 체크,
`users.firstStepsDismissed`, 설정에서 다시 켬), 오늘 탭 비면 `TodayEmptyCard`. 오늘/다음 일정 필터는 `isTrip` 제외. 사진 없는 다음 여행 카드는 미표시.
"그날의 우리"는 1~3년 전 ±3일 라운드로빈 최대 4개, 알림 없음

**캘린더/일정**: `useCalendarData`는 커플·여행·개인을 독립 상태로 두고 useMemo 병합(functional update 패턴 금지), events 구독에서
`eventType==='travel'` 제외(여행은 trips에서). 날짜별 필터는 `getEventDayRange()`(end 배타적). EventModal 닫힘 0.5초 내 '수정기록' 클릭 무시.
`twogether_personal_default` 로컬스토리지 기억은 의도된 동작

**반복 일정**: 인스턴스를 개별 문서로 사전 생성(최대 50, 종료 조건 필수) + `eventSeries`. 범위 선택 "이 일정만(→isException)/이후 모두/전체".
**재생성 기준점은 클릭한 인스턴스 자신의 날짜**(오늘·최초 시작일 금지 — 월/년 위상 밀림). "전체" 수정은 `recurrence.isFirst`인 인스턴스에서만,
삭제 "전체"는 항상. 재생성 0개면 저장 막음. 디데이와 상호 배타, 시리즈 인스턴스는 시작일 입력 비활성, 개인↔커플 전환·기존 일정 반복 전환 불가,
여행 제외. 알림·수정기록은 시리즈 단위(`onEventSeriesCreate`, `recurrence_*`). 날짜 계산은 로컬 기준(`recurrenceRules.js`)

**봉인 편지**: 내용은 `sealedMessages/{id}/private/content` 서브문서(isUnlocked 또는 작성자만 read). 삭제 순서 content → Storage → 상위 문서.
예약 시각 15분 단위(`UnlockTimePicker`), `checkSealedMessages`는 58/13/28/43분 + 2분 lookahead. 알림은 create/update 트리거 2종,
받는 사람이 아직 멤버일 때만. 사진은 `uploadSealedMessageImage` 전용 경로

**여행**: `createTrip`은 trips+events 배치. `deleteTrip`은 일정표·이동시간·`travelDecisions`·`checklists`까지 같이 삭제(서브컬렉션 추가 시 여기도).
배열 필드 수정은 트랜잭션 헬퍼(`mutateItems`/`mutateOptions`/`mutateTripSchedule`), 배열 안 타임스탬프는 `Date.now()`. 그날 첫 일정은
결정론적 ID setDoc. 날짜 이동 `moveTripSchedule`은 새 날 추가 → 원래 날 제거. 후보 확정은 후보 단위(`isOptionDecided`), 후보→일정은 `sourceOptionId`.
링크 자동 채우기 `LinkFillCard`/`useLinkFill`(빈 칸만 채움), 콜러블 `fetchLinkPreview`의 **SSRF 방어 절대 유지**(배포는 functions 별도).
일정 종류 `category`(식사·카페·관광·놀거리·쇼핑·숙소·기타, `Schedule/scheduleCategories.js`, 파스텔 + 불투명 배경, 제목 앞 아이콘만 — 색은 사용자가 고름).
여행 지역(우리 지도 `/map`·`/map/:sido`, `components/Map/`, 경계 경로는 `scripts/map/build_map_paths.py`로 생성, 시작한 여행만 칠함) `trips.regions=[{sido,sgg?}]`: 목록·추천은 `services/regions/`(2026-10 SGIS, 16개 시·도 — 광주·전남 통합), 정리는 반드시 `mergeRegions`, 여행지 글자 자동 추천은 칩을 만지기 전까지만, 일정 주소(시·도로 시작하는 주소만)는 `addTripRegionsFromText`로 자동(트랜잭션, 이미 있으면 안 씀), 장소 이름은 `suggestRegionsFromSchedules` 추천 칩으로만(수정 모달·기록 3단계). 지도에 출처(CC BY 4.0) 표시 필수.
링크 자동 채우기 카드는 모달 열 때마다 접힌 채로 시작(`useLinkFillCollapsed`, 기억 안 함). 상세 화면 하단 FAB 공간 `padding-bottom: calc(56px + 2rem)`. 이동 시간은 `subscribeTravelTimes`

**여행 끝 기록**(`Travel/Review/`, `services/tripReviewService.js`): `/travel/:tripId/review?step=1|2|3`(기분+자유 기록 2000자 → TOP 3 → 지도 확인, Layout 밖).
`trips.review[uid]`는 반드시 필드 경로(`review.<uid>.x`)로만 씀(동시 기록 보호). 규칙도 `review` 안에서 자기 키만 바뀌는지 검사(`reviewOnlyMine`). 지도 지역은 먼저 끝낸 사람이 확정(`regionsConfirmedBy`), 나중 사람은 확인·고치기.
홈 `TripEndCard`는 `REVIEW_FEATURE_START`(2026-11-01) 이후 끝난 여행 중 내가 `doneAt`/`skipped` 안 한 것, 알림은 `sendTripReviewReminders`(종료 다음 날 21시, type `tripReview`).
처음 칠한 시·군·구는 `/map/:sido`에 `state.spark`로 넘겨 반짝임

**데이터 백업**(`/data-backup`): 같은 커플만, 없는 문서만 추가(원래 ID로 set, 비교는 `getDocsFromServer`), 사진은 링크만. 복원 문서 `restoredAt`/
`restoredUnlock`로 알림 스킵 → **Functions를 Hosting보다 먼저 배포**. 교체 모드·새 커플 이사는 사용자가 거절함(재제안 금지)

**커플 해제/탈퇴**(`functions/coupleLifecycle.js`): 해제 즉시 `members:[]` + `formerMembers`(순서 유지) 30일 보관, 해제한 사람만 취소, 둘 다 기록
파일(`services/record/`) 저장 가능, 탈퇴는 최근 로그인 5분 내. ⚠ `personal_events`·개인 eventSeries도 `coupleId`를 가짐 — 커플 삭제 쿼리에서 제외.
`onCoupleUpdate`가 빠진 멤버 claims 제거. AuthContext: 커플 구독 permission-denied 시 `userSubKey` 올려 사용자 문서 재구독(빼지 말 것)

**계정/프로필**: `/profile`은 닉네임·홈 사진만, `/account`는 로그인 정보·비밀번호(이메일 가입자만)·구글 연결·로그아웃(`signOut` await 후 navigate)·탈퇴.
홈 사진 업로드 URL에 `?v=` 캐시버스터. `HomeImageSettingsPage` 재생성 금지, 연애 시작일은 커플 정보에서만

**하고 싶은 것(버킷)**(`BucketList/`, v1.2 개편): 보드 = 한 줄 추가(종류 토글) + [뭐 할까? 골라줘](돌림판) + 추천 카드 + `전체|해보고 싶은 것|자주 할 것`(이름·설명은 `KIND_LABEL/KIND_DESC`) + 카드, '이룬 것'은 필터 4번째 탭.
`kind` 'once'(기본, 예전 문서도)/'repeat'(해도 남고 `doneCount`·`lastDoneAt`·`history[{date,note,by,at}]` 쌓임), once만 `completed`. 공감은 `likes.<uid>` 필드 경로로만.
[언제 할까?]는 선택(계획 있을 때만) → 커플 일정 생성(`bucketId`) + `plannedEventId/Date`, 날짜 지나면 보드·홈 '오늘'에 `BucketCheckCard`. 계산은 `services/bucket/bucketLogic.js`(테스트), 쓰기는 `bucketService.js`(offlineWrite, 기록은 arrayUnion·횟수는 increment).
시트는 `?modal=detail|done|date|plan|categoryManager|wheel&id=`. 요약·랩업은 `expandRepeatForRecap`로 자주 할 것 기록을 '이룬 것'으로 셈

**돌림판**(`Wheel/`, v1.0.38 리디자인): `WheelModal`(흐름·후보 상태) + `WheelSelectStep`(직접 적기·버킷 담기) + `WheelSpinStep`(SVG 원판, CSS transform 회전).
마지막 후보는 로컬스토리지 `twogether_wheel_last`에 기억, 후보 2개 이상일 때만 돌리기, 결과 자동 사라짐 없음, "이건 빼고"로 이번 판에서 제외

**월간 요약/연말 랩업**(`Recap/`, `services/recap/`): 계산은 순수 함수(`monthlyRecap.js`), 커플 일정만(개인 제외), 내용 없는 카드는 null → 생략.
월간은 그달 커플 일정 1개 이상, 연말은 5개 이상. `/recap`(목록, 설정에서 진입) · `/recap/:period`(Layout 밖 스토리). 홈 '우리 이야기' 카드는 월간 말일~다음 달 7일, 랩업 12/31~1/7(`recapWindow.js`). 계산은 `monthlyRecap.js`/`yearRecap.js`

**기타**: MemoryList 검색은 300ms 디바운스 + `searchGenerationRef`, `fetchMoreSearchResults`의 finally는 무조건 리셋.
생리주기 기능은 Play 건강 앱 정책으로 제거됨(되살리려면 Play 선언·개인정보처리방침 함께 갱신). `/privacy`·`/terms`·`/account-deletion`은 로그인 불필요

## 구조 참고
- AuthContext: `user, userDoc, coupleDoc, coupleId, partnerDoc, myRole, getMemberName, loading`. `members[0]`=boyfriend(생성자), `[1]`=girlfriend
- ProtectedRoute: loading → 로그인 없음 `/login` → coupleId 없음 `/couple-setup` → 통과
- 라우트: `/` `/calendar/*` `/memories` `/bucket` `/travel(/:tripId)` `/profile` `/couple-info` `/settings` `/account` `/letters`
  `/notification-settings` `/data-backup` `/map(/:sido)` `/recap(/:period)` `/delete-account` `/login` `/couple-setup` `/privacy` `/terms` `/account-deletion`
- 주요 컬렉션: `users`(coupleId, nicknameConfirmed, firstStepsDismissed, eventTypeColors, notificationPrefs) / `couples`(members, inviteCode,
  anniversaryDate, heroImageUrl, eventTypeColors, customCategories 객체맵) / `inviteCodes` / `events`(createdBy, recurrence) / `personal_events`(userId) /
  `eventSeries` / `trips`(+`travelDecisions`·`checklists` 서브) / `tripSchedules` / `travelTimes` / `bucketlists`(createdBy) / `edit_logs` / `sealedMessages`
- 페이지는 전부 `React.lazy`, vendor는 `manualChunks`로 분리. Sentry는 `VITE_SENTRY_DSN` 있을 때만

## 남은 작업 / 로드맵
- 사용자 메모: `docs/dev.md`(2026-11-18 기준 비어 있음 — 이전 항목 모두 완료/보류)
- 이벤트 사진 첨부(`uploadEventImage` 미구현, MemoryDetail 렌더링 미구현)
- 카카오 로그인(별도 백엔드 필요, 장기)
- 로드맵(설계 확정, 재논의 없이 구현): **4. 일상 결정**(travelDecisions를 최상위로 일반화, 카테고리 영구 재사용 + 라운드 반복 + 히스토리,
  Home 진입 카드 → `/decisions`) . 5. 우리 지도는 v1.1.0~1.1.2 완료, 7. 연말 랩업 + 월간 요약은 v1.0.47 완료.
  6. 위치 기반 알림은 폐기(재제안 금지)
