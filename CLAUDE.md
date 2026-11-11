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
- AAB(Play)/Archive(App Store) 빌드·업로드는 항상 사용자 수동(keystore·Apple 계정 없음)

## 환경 트랩
- **Vite 5.4.21 고정**(Node 20.15.1) — 업그레이드 금지
- `eslint.config.js` globalIgnores에 `dist`/`android`/`ios`/`scripts` 필수(네이티브 빌드 산출물 스캔 방지). `functions/**`는 node/commonjs override
- `.js` 파일에도 JSX 있음(`vite.config.js` esbuild 설정) — 이 설정 지우면 빌드 깨짐
- iOS: 입력창 font-size **1rem 이상**(미만이면 포커스 시 확대). grid 안 `input[type=date]`는 `min-width:0`
- 날짜 문자열은 `toISOString()` 금지(KST 하루 밀림) → `getLocalDateStr()`(`utils/dataUtils.js`)
- Firestore 오프라인 캐시는 origin별 IndexedDB — 여러 계정을 같은 브라우저로 번갈아 테스트하지 말 것(시크릿 창 분리).
  `AuthContext`는 users/couples 구독 전에 `getDocFromServer()`로 첫 값을 서버에서 확인함(유지)

## Firebase
- `firebase.json`에 `"bucket": "twogether-206fb.firebasestorage.app"` 명시 필수(없으면 rules가 appspot 버킷에 배포돼 403)
- Storage 규칙은 custom claims(`coupleIds`)로 소유권 검증. claims는 `onCoupleCreate/Update`가 설정, 없으면
  `storageService.refreshAuthTokenWithClaims()`가 콜러블 `ensureCoupleClaims`로 자가 복구. write는 `size<10MB && image/*`
- Storage 규칙은 create/update와 delete를 **분리**(delete엔 `request.resource`가 null이라 size/type 조건이 있으면 삭제가 막힘)
- Workbox runtimeCaching에 `firebasestorage.googleapis.com` 넣지 말 것(opaque 응답 → iOS 이미지 실패)
- Hosting 헤더: `source:"**"` no-cache를 **먼저**, `/assets/**` immutable을 뒤에(리터럴 `/index.html`은 SPA 리라이트에 안 걸림)
- Firestore list 쿼리는 규칙이 참조하는 필드(`coupleId`/`userId`)를 **where 동등 조건에 반드시 포함**(없으면 목록 전체 거부, 단건 get은 됨)
- 모든 update 규칙은 소유권 필드 불변(`request.resource.data.X == resource.data.X`). 커플 합류는 반드시 콜러블
  `joinCoupleWithInviteCode`(서버가 코드 검증·교차 합류 처리). `inviteCodes`는 list/update 금지
- ⚠ 미해결: `users/{uid}` write 규칙이 본인 문서 전체를 허용해 `coupleId`를 임의로 바꿀 수 있음(커플 문서 멤버 검사로 유출은 막힘) — 조일 것
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
- `badge` 아이콘은 투명 배경 단색(`public/badge-icon.png`)
- 예약 알림: `sendMorningReminders`(09:00 KST, 여행·기념일·디데이 D-3/D-1), `sendEveningReminders`(21:00, 내일 일정).
  `functions/index.js`의 `COUPLE_DAYS`는 `utils/koreanHolidays.js` 복사본 — 바꾸면 둘 다 수정
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
- 파일 저장은 `services/fileSave.js`의 `saveTextFile`만(네이티브는 filesystem+share, 웹뷰는 `<a download>` 무시)

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
링크 자동 채우기 카드는 모달 열 때마다 접힌 채로 시작(`useLinkFillCollapsed`, 기억 안 함). 상세 화면 하단 FAB 공간 `padding-bottom: calc(56px + 2rem)`. 이동 시간은 `subscribeTravelTimes`

**데이터 백업**(`/data-backup`): 같은 커플만, 없는 문서만 추가(원래 ID로 set, 비교는 `getDocsFromServer`), 사진은 링크만. 복원 문서 `restoredAt`/
`restoredUnlock`로 알림 스킵 → **Functions를 Hosting보다 먼저 배포**. 교체 모드·새 커플 이사는 사용자가 거절함(재제안 금지)

**커플 해제/탈퇴**(`functions/coupleLifecycle.js`): 해제 즉시 `members:[]` + `formerMembers`(순서 유지) 30일 보관, 해제한 사람만 취소, 둘 다 기록
파일(`services/record/`) 저장 가능, 탈퇴는 최근 로그인 5분 내. ⚠ `personal_events`·개인 eventSeries도 `coupleId`를 가짐 — 커플 삭제 쿼리에서 제외.
`onCoupleUpdate`가 빠진 멤버 claims 제거. AuthContext: 커플 구독 permission-denied 시 `userSubKey` 올려 사용자 문서 재구독(빼지 말 것)

**계정/프로필**: `/profile`은 닉네임·홈 사진만, `/account`는 로그인 정보·비밀번호(이메일 가입자만)·구글 연결·로그아웃(`signOut` await 후 navigate)·탈퇴.
홈 사진 업로드 URL에 `?v=` 캐시버스터. `HomeImageSettingsPage` 재생성 금지, 연애 시작일은 커플 정보에서만

**돌림판**(`Wheel/`, v1.0.38 리디자인): `WheelModal`(흐름·후보 상태) + `WheelSelectStep`(직접 적기·버킷 담기) + `WheelSpinStep`(SVG 원판, CSS transform 회전).
마지막 후보는 로컬스토리지 `twogether_wheel_last`에 기억, 후보 2개 이상일 때만 돌리기, 결과 자동 사라짐 없음, "이건 빼고"로 이번 판에서 제외

**기타**: MemoryList 검색은 300ms 디바운스 + `searchGenerationRef`, `fetchMoreSearchResults`의 finally는 무조건 리셋.
생리주기 기능은 Play 건강 앱 정책으로 제거됨(되살리려면 Play 선언·개인정보처리방침 함께 갱신). `/privacy`·`/terms`·`/account-deletion`은 로그인 불필요

## 구조 참고
- AuthContext: `user, userDoc, coupleDoc, coupleId, partnerDoc, myRole, getMemberName, loading`. `members[0]`=boyfriend(생성자), `[1]`=girlfriend
- ProtectedRoute: loading → 로그인 없음 `/login` → coupleId 없음 `/couple-setup` → 통과
- 라우트: `/` `/calendar/*` `/memories` `/bucket` `/travel(/:tripId)` `/profile` `/couple-info` `/settings` `/account` `/letters`
  `/notification-settings` `/data-backup` `/delete-account` `/login` `/couple-setup` `/privacy` `/terms` `/account-deletion`
- 주요 컬렉션: `users`(coupleId, nicknameConfirmed, firstStepsDismissed, eventTypeColors, notificationPrefs) / `couples`(members, inviteCode,
  anniversaryDate, heroImageUrl, eventTypeColors, customCategories 객체맵) / `inviteCodes` / `events`(createdBy, recurrence) / `personal_events`(userId) /
  `eventSeries` / `trips`(+`travelDecisions`·`checklists` 서브) / `tripSchedules` / `travelTimes` / `bucketlists`(createdBy) / `edit_logs` / `sealedMessages`
- 페이지는 전부 `React.lazy`, vendor는 `manualChunks`로 분리. Sentry는 `VITE_SENTRY_DSN` 있을 때만

## 남은 작업 / 로드맵
- 사용자 메모: `docs/dev.md`
- 이벤트 사진 첨부(`uploadEventImage` 미구현, MemoryDetail 렌더링 미구현)
- 카카오 로그인(별도 백엔드 필요, 장기)
- 로드맵(설계 확정, 재논의 없이 구현): **4. 일상 결정**(travelDecisions를 최상위로 일반화, 카테고리 영구 재사용 + 라운드 반복 + 히스토리,
  Home 진입 카드 → `/decisions`) → **5. 우리 지도**(지역 색칠, 시/도 기본 + 시/군/구 드릴다운, trips에 `region` 필드 필요) →
  **7. 연말 랩업 + 월간 요약**(매월 말일은 "내일이 1일인지"로 판별). 6. 위치 기반 알림은 폐기(재제안 금지)
