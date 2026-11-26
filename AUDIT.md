# 우리두리(Twogether) 전체 점검 보고서

- 점검일: 2026-11-26 · 대상: v1.1.5(`60c3e52`) · 코드 수정 없음(이 파일만 새로 만듦)
- 방법: 보안 규칙·서버 함수·주요 화면 코드를 직접 읽고, 점검 명령을 실행했습니다. 아래 항목은 모두 파일:줄 근거가 있고, 실제 기기에서 재현해 보지 않은 것은 **확인 필요**로 표시했습니다.

## 진행 상황

- **묶음 1 완료(v1.1.6)**: S-1, S-2, S-5, B-5(커플 있을 때만 삭제 금지로 조정), P-1, P-9, D-1, D-2, U-6, U-7. S-12는 백업 복원과 충돌해 보류.
- **묶음 2 완료(v1.1.7)**: E-1·E-4(오프라인 띠 + 저장 대기열 안내), B-1(구독 7곳 오류 처리), E-2(첫 화면 서버 확인 3초 제한). E-3은 확인 결과 저장 버튼이 이미 모두 잠겨 있어 추가 작업 없음.
- **묶음 3 완료(v1.1.8)**: P-2(올리기 전 1600px로 줄임 — 4000×3000 시험에서 1MB→356KB), S-3(봉인 편지 사진 경로에 임의값, 예전 편지 사진은 그대로), P-5(글꼴 미리 연결 + 서비스워커 저장), P-7(화면 밖 사진 지연 로딩).
- **새로 발견**
  - **N-1 Medium**: Firestore SDK 12.11 내부 오류 `INTERNAL ASSERTION FAILED (ca9)`가 새 여행 저장 직후 발생(화면 점검에서 재현, 변경 전 코드에서도 동일). 저장은 정상. 오프라인 캐시 관련 SDK 문제로 보고됨([firebase-js-sdk #9267](https://github.com/firebase/firebase-js-sdk/issues/9267)). → Firebase 12.19 이상으로 올린 뒤 점검 재확인 권장.
  - **N-2 Low(수정함)**: 새 여행을 만든 직후 카드의 생성일이 비어 " 생성"으로 보이던 표시([TripCard.js](src/components/Travel/Trip/TripCard.js)) → "방금 만듦".

## 1. 요약

**전체 상태: 양호합니다.** 보안 규칙이 꼼꼼하고(소유권 불변, 합류는 서버만, 편지 내용 분리), 화면 22곳 자동 점검이 모두 통과하며, 안 쓰는 파일이나 `console.log`도 없습니다. 다만 **모바일에서 체감되는 문제**(느린 네트워크·오프라인·큰 이미지)와 **몇 가지 방어 구멍**이 남아 있습니다.

### 가장 시급한 5가지

| # | 항목 | 왜 급한가 | 작업량 |
|---|---|---|---|
| 1 | **로그아웃해도 그 기기로 알림이 계속 옴** (S-1) | 다른 사람이 쓰는 기기에 내 일정·편지 알림 제목이 뜹니다 | S |
| 2 | **앱 아이콘 파일이 2.5MB** (P-1) | 웹 앱 설치·업데이트 때마다, 그리고 알림이 올 때마다 2.5MB를 받습니다 | S |
| 3 | **사진을 줄이지 않고 그대로 올림** (P-2) | 홈 사진·편지 사진이 최대 10MB 원본으로 저장돼 매번 느리게 뜹니다 | M |
| 4 | **오프라인·느린 네트워크에서 저장 버튼이 멈춤** (E-1, E-2) | 지하철 등에서 "저장 중…"으로 굳거나 로딩이 끝나지 않습니다 | M |
| 5 | **초대 코드 합류 검증에 빈틈** (S-2) | 커플 문서 ID를 아는 사람은 혼자 있는 커플에 끼어들 수 있습니다(ID를 알기는 어려움) | S |

### 점검 명령 결과

| 명령 | 결과 |
|---|---|
| `npx eslint src` | 오류 0, 경고 14(모두 '효과 안에서 바로 상태 변경') |
| `npm run build` | 성공. 미리 받기 111개 약 5.6MB(이 중 아이콘 2.5MB가 두 번 등록됨) |
| `npm run smoke` | 22/22 통과 |
| release-check | 버전 동기화 문제 없음 |
| `npm audit --omit=dev` (웹) | 높음 6건 — Firebase 안의 `@grpc/grpc-js` 계열(서버용 코드, 웹 번들에는 안 들어감) |
| `npm audit` (개발 도구 포함) | 심각 2·높음 다수 — `js-yaml`, `uuid`, `esbuild`, `tar` 등 빌드 도구 쪽 |
| `functions` `npm audit --omit=dev` | 18건(심각 1 `proxy-addr`, 높음 7, 보통 10) |
| 타입 검사 | 해당 없음(자바스크립트 프로젝트) |
| 자동 테스트 | 단위 테스트 파일 0개(화면 자동 점검만 있음) |

---

## 2. 보안

| ID | 심각도 | 위치 | 문제 | 개선 방법 | 작업량 |
|---|---|---|---|---|---|
| S-1 | **High** | [AccountPage.jsx:41-44](src/components/Account/AccountPage.jsx#L41), [authService.js:96-98](src/services/authService.js#L96), [notificationService.js:169-176](src/services/notificationService.js#L169) | 로그아웃이 `signOut`만 하고 이 기기의 알림 토큰을 사용자 문서에서 지우지 않습니다. 다른 계정이 이 기기에서 알림을 다시 등록하기 전까지 이전 계정 알림이 계속 옵니다. | 로그아웃 전에 `disableNotifications`의 토큰 제거 부분을 실행(실패해도 로그아웃은 진행). 탈퇴·커플 연결 화면의 로그아웃 2곳도 같이. | S |
| S-2 | **Medium** | [firestore.rules:53](firestore.rules#L53), [functions/index.js:363-389](functions/index.js#L363) | `inviteCodes`는 로그인한 누구나 아무 내용으로 만들 수 있고, 합류 함수는 코드 문서의 `coupleId`만 믿습니다. 혼자 있는 커플의 문서 ID를 아는 사람은 가짜 코드를 만들어 그 커플에 합류할 수 있습니다. ID는 무작위라 알기 어렵지만 방어가 한 겹뿐입니다. | 합류 함수에서 `couple.inviteCode === code`와 `creatorUid ∈ members`를 확인. 규칙에서도 create 때 `creatorUid == 본인`, `coupleId`가 내가 만든 커플인지 검사. | S |
| S-3 | **Medium** | [storage.rules:46-48](storage.rules#L46), [storageService.js:118](src/services/storageService.js#L118) | 봉인 편지 사진 경로가 `sealedMessages/{coupleId}/{messageId}`로 정해져 있고, 같은 커플이면 읽을 수 있습니다. 받는 사람은 편지 ID를 알 수 있어서(목록은 보임) 봉인 중에도 사진을 직접 받아 볼 수 있습니다. 규칙 주석의 "URL을 모른다"는 전제가 성립하지 않습니다. | 경로에 추측 불가능한 값을 넣고 그 값을 `private/content`에만 저장(예: `sealedMessages/{coupleId}/{messageId}/{랜덤}`), 또는 공개 전까지 작성자만 읽게. | M |
| S-4 | **Medium** | `functions/package.json`, `package.json` | 서버 함수 의존성 18건(심각 1), 웹 6건. 대부분 Firebase 안쪽 라이브러리입니다. | `functions`에서 `npm audit fix`(호환 범위), `firebase-admin`·`firebase-functions` 최신 패치. 웹은 Firebase 패치 버전 올리기. 배포 전 `npm run smoke`. | S~M |
| S-5 | **Low** | [firestore.rules:261-263](firestore.rules#L261) | 봉인 편지 수정 규칙에 `coupleId`·`recipientUid`·`authorUid` 불변 조건이 없습니다(다른 컬렉션은 모두 있음). 작성자 본인 데이터라 피해는 작지만 원칙과 다릅니다. | update에 세 필드 불변 조건 추가. | S |
| S-6 | **Low** | [firestore.rules:153-156](firestore.rules#L153) | 여행 문서는 커플 멤버가 어떤 필드든 고칠 수 있어, 상대의 여행 기록(`review.<상대uid>`)도 덮어쓸 수 있습니다. 두 사람 사이라 위험은 낮습니다. | 필요하면 `review`의 다른 사람 키 변경을 규칙으로 막기(`diff().affectedKeys()`). | M |
| S-7 | **Low** | [firebase.json](firebase.json) hosting headers | 보안 헤더가 캐시 설정뿐입니다(CSP, `X-Frame-Options`, `X-Content-Type-Options` 없음). | 우선 `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` 추가. CSP는 Firebase·Google Fonts 도메인을 허용 목록에 넣어 단계적으로. | S |
| S-8 | **Low** | `src/firebase.js`, `functions/index.js` | App Check를 쓰지 않아, 앱 밖 스크립트로도 로그인만 하면 서버 함수·DB를 호출할 수 있습니다. | Firebase App Check(웹 reCAPTCHA, 앱 Play Integrity·App Attest) 도입 검토. | M |
| S-9 | **Low** | [EmailAuthForm.jsx:26](src/components/Auth/EmailAuthForm.jsx#L26) | 이메일 인증이 없고 비밀번호는 6자 이상만 요구합니다. 남의 이메일로 먼저 가입해 둘 수 있습니다. | 가입 후 인증 메일 발송(강제는 아니어도 안내), 비밀번호 8자 이상 권장. | S |
| S-10 | **Low** | [android/app/src/main/AndroidManifest.xml:4](android/app/src/main/AndroidManifest.xml#L4) | `allowBackup="true"`라 기기 백업에 앱 데이터(로그인 상태 포함)가 들어갈 수 있습니다. | `false`로 바꾸거나 백업 제외 규칙 지정. | S |
| S-11 | **Low** | 프로젝트 루트의 `*-firebase-adminsdk-*.json`, `.env` | 관리자 키 파일이 프로젝트 폴더 안에 있습니다. git에는 올라가지 않지만(확인함) 폴더를 통째로 공유·압축하면 같이 나갑니다. | 프로젝트 밖(예: 홈 폴더의 별도 위치)으로 옮기기. | S |
| S-12 | **Low** | [firestore.rules:131-132](firestore.rules#L131) | 수정 기록은 멤버가 임의 내용으로 만들 수 있습니다(작성자 uid 검증 없음). | `userId == request.auth.uid` 조건 추가. | S |

**잘 되어 있는 것:** `.env`·키 파일 git 제외, `dangerouslySetInnerHTML` 없음, 기록 파일 HTML은 `esc()`로 이스케이프([recordHtml.js:42](src/services/record/recordHtml.js#L42)), 초대 코드 목록 조회 차단, 링크 미리보기 SSRF 방어, 콜러블 전부 로그인 확인, 화면 오류는 `getFriendlyErrorMessage` 경유(예외 2곳은 U-6).

---

## 3. 기능 버그·로직

| ID | 심각도 | 위치 | 문제 | 개선 방법 | 작업량 |
|---|---|---|---|---|---|
| B-1 | **Medium** | [tripService.js:75](src/services/tripService.js#L75), [:251](src/services/tripService.js#L251), [:304](src/services/tripService.js#L304), [travelDecisionService.js:162](src/services/travelDecisionService.js#L162), [travelChecklistService.js:56](src/services/travelChecklistService.js#L56), [sealedMessageService.js:56](src/services/sealedMessageService.js#L56), [MemoryList.js:121](src/components/Memory/MemoryList.js#L121) | 실시간 구독 7곳에 오류 처리가 없습니다. 권한 오류나 연결 실패가 나면 [useTrip.js:15-18](src/hooks/useTrip.js#L15)처럼 `loading`이 끝나지 않아 뼈대 화면이 계속 돕니다. | 구독마다 오류 콜백을 넣어 `loading`을 끄고 "불러오지 못했어요 · 다시 시도"를 보여주기. | M |
| B-2 | **Low** (확인 필요) | [EventModal.js:77](src/components/Calendar/EventModal.js#L77), [Calendar.jsx:113](src/components/Calendar/Calendar.jsx#L113) | 날짜가 `Date` 객체로 들어오면 `toISOString()`으로 잘라 하루 밀릴 수 있습니다(프로젝트 규칙 위반). 지금은 문자열로 들어와 문제가 안 보이는 것으로 추정합니다. | `getLocalDateStr()`로 교체. | S |
| B-3 | **Low** | [useCalendarData.js:104-123](src/hooks/useCalendarData.js#L104) | 여행 날짜 변환에도 `toISOString()`이 5곳 있습니다. 여행 날짜가 문자열이라 지금은 안전하지만 같은 위험입니다. | 위와 같이 교체. | S |
| B-4 | **Low** | [functions/index.js:388-405](functions/index.js#L388) | 혼자 만든 커플이 있는 사람이 상대 코드로 합류하면 원래 커플 문서와 그 안의 데이터(혼자 넣은 일정 등)가 그대로 남아 아무도 못 보게 됩니다. | 합류 때 혼자 쓰던 커플의 데이터를 새 커플로 옮기거나, 합류 전에 "혼자 넣은 기록은 옮겨지지 않아요" 안내. | M |
| B-5 | **Low** | [firestore.rules:35](firestore.rules#L35) | 사용자가 자기 `users` 문서를 직접 지울 수 있어, 커플 멤버 목록에 없는 사람이 남을 수 있습니다(앱 화면은 서버 함수로만 탈퇴). | `allow delete: if false`(탈퇴는 서버 함수가 처리). | S |

---

## 4. 엣지 케이스 (모바일에서 특히 중요)

| ID | 심각도 | 위치 | 문제 | 개선 방법 | 작업량 |
|---|---|---|---|---|---|
| E-1 | **High** | [firebase.js:32-34](src/firebase.js#L32)(오프라인 캐시), 저장 예: [TripModal.js:108](src/components/Travel/Trip/TripModal.js#L108) | 오프라인 캐시가 켜져 있어, 연결이 끊긴 상태에서 저장하면 서버 응답을 기다리는 `await`가 끝나지 않습니다. 버튼이 "저장 중…"으로 멈추고 모달이 닫히지 않습니다(데이터는 나중에 올라감). | (1) 앱 전체에 "오프라인이에요" 배너(`navigator.onLine` + online/offline 이벤트). (2) 저장은 일정 시간(예: 4초) 뒤 "연결되면 저장돼요"로 안내하고 모달 닫기. | M |
| E-2 | **Medium** (확인 필요) | [AuthContext.jsx:46-48](src/contexts/AuthContext.jsx#L46) | 앱을 열 때 서버에서 사용자 문서를 먼저 확인합니다. 신호가 약하면 실패가 확정될 때까지 첫 화면이 늦어질 수 있습니다. | 2~3초 제한 시간을 두고 넘으면 캐시로 진행. | S |
| E-3 | **Medium** | `useDoubleClickPrevention` 사용 5개 파일뿐 | 저장 버튼 중복 누름 방지가 화면마다 다릅니다. `loading` 상태가 없는 버튼은 두 번 눌러 중복 저장될 수 있습니다(확인 필요: 버킷 완료, 체크리스트 추가 등). | 저장·삭제 버튼 전부 같은 방식(진행 중 비활성)으로 통일. | M |
| E-4 | **Medium** | 앱 전체 | 오프라인 상태를 알려주는 화면이 없습니다(`navigator.onLine` 사용 0곳). | E-1의 배너로 해결. | — |
| E-5 | **Low** | [TripReviewPage.jsx](src/components/Travel/Review/TripReviewPage.jsx) | 기록 화면을 여는 중 여행이 지워지면 "여행을 찾을 수 없어요"는 나오지만, 일정표가 아직 안 불러와진 순간에는 TOP 3 단계가 "일정표가 없어요"로 잠깐 보입니다. | 일정 로딩 중 표시 추가. | S |

---

## 5. 성능

| ID | 심각도 | 위치 | 문제 | 개선 방법 | 작업량 |
|---|---|---|---|---|---|
| P-1 | **High** | `public/app-icon.png`(2.58MB, 1375×1375), [vite.config.js:15,29-39](vite.config.js#L15), [index.html:5,11](index.html#L5), [sw.js:53](src/sw.js#L53) | 파비콘·홈 화면 아이콘·PWA 아이콘(192/512)·알림 아이콘이 모두 같은 2.5MB 파일입니다. 미리 받기 목록에도 두 번 들어가 있습니다. | 192px·512px·maskable·favicon(32px)·알림용(96px)으로 나눠 만들기(합계 100KB 안팎). | S |
| P-2 | **High** | [imageUtils.js](src/utils/imageUtils.js)(HEIC 변환만), [storageService.js:89,118](src/services/storageService.js#L89), [storage.rules:20](storage.rules#L20) | 사진을 줄이지 않고 원본(최대 10MB)으로 올립니다. 홈 사진은 앱을 열 때마다 원본을 받습니다. | 올리기 전에 캔버스로 긴 변 1600px·JPEG 품질 0.8 정도로 줄이기(홈 사진·편지 사진 공통 함수). | M |
| P-3 | **Medium** | [useCalendarData.js:41-43](src/hooks/useCalendarData.js#L41) | 커플의 **모든 일정**을 기간 제한 없이 실시간 구독합니다. 홈·캘린더를 열 때마다 전부 읽어서, 쓸수록 느려지고 읽기 비용이 늡니다. | 보고 있는 달 앞뒤 몇 달만 구독하고, 달을 넘길 때 범위 이동. 홈은 오늘 이후 + '그날의 우리'용 날짜만. | L |
| P-4 | **Medium** | [Home.jsx:71-72](src/components/Home/Home.jsx#L71), [:115](src/components/Home/Home.jsx#L115), [:127](src/components/Home/Home.jsx#L127) | 홈에서 여행을 두 번 구독하고(캘린더용 + 지도 카드용), 버킷·편지·일정까지 5개 구독이 동시에 열립니다. | 여행 구독 하나로 합치기(`useCalendarData`가 원본 여행 문서도 같이 돌려주게). | S |
| P-5 | **Medium** | [index.css:2](src/index.css#L2) | Google Fonts를 CSS `@import`로 불러옵니다. 첫 화면 그리기를 막고, 앱이 오프라인이면 글꼴이 기본 글꼴로 보입니다. | 주아·고운돋움 woff2를 앱에 넣거나(자체 호스팅), 최소한 `index.html`에 `preconnect` + `<link>`로 옮기기. | S~M |
| P-6 | **Low** | 빌드 결과 | 첫 화면에 Firebase 719KB + React 288KB + 앱 142KB + 프레이머 모션 128KB를 받습니다. 캘린더 묶음 228KB는 캘린더에서만 받습니다. | Firebase Analytics·Messaging을 필요할 때 불러오기, 프레이머 모션을 홈 탭 전환에만 쓰므로 CSS 전환으로 대체 검토. | M |
| P-7 | **Low** | `<img>` 15곳 중 `loading="lazy"` 1곳 | 화면 아래 이미지도 처음에 다 받습니다. | 목록·모달 이미지에 `loading="lazy"`·`decoding="async"`. | S |
| P-8 | **Low** | [functions/index.js](functions/index.js) `sendMorningReminders` | 매일 아침 모든 커플 문서를 전부 읽습니다. 사용자가 늘면 비용이 커집니다. | 기념일 날짜를 미리 계산해 색인 필드로 두거나 쪽 단위로 읽기. 지금 규모에선 보류 가능. | M |
| P-9 | **Low** | `src/components/images/main.png`(7.85MB) | 어디서도 쓰지 않는 7.8MB 이미지가 저장소에 있습니다(빌드에는 안 들어감). | 삭제. | S |

---

## 6. 코드 품질

| ID | 심각도 | 위치 | 문제 | 개선 방법 | 작업량 |
|---|---|---|---|---|---|
| Q-1 | **Medium** | 프로젝트 전체 | 단위 테스트가 없습니다. 날짜·반복 일정·지역 찾기·요약 계산처럼 순수 함수가 많은데 검증 수단이 화면 점검뿐입니다. | `recurrenceRules.js`, `regionMatch.js`, `recapDates.js`, `monthlyRecap.js`, `mapStats.js`부터 Vitest로 테스트(이번 세션에서 손으로 확인한 예시를 그대로 옮기면 됨). | M |
| Q-2 | **Medium** | [functions/index.js](functions/index.js)(963줄) | 알림·합류·예약 작업이 한 파일에 있습니다. 서버 함수는 자동 점검 대상이 아니라 실수가 운영에서 드러납니다. | 알림·예약·합류로 파일 분리, 에뮬레이터 테스트 추가(`npm run smoke`에 functions 포함). | M |
| Q-3 | **Low** | [KoreaMap.jsx](src/components/Map/KoreaMap.jsx), [TripMiniMap.jsx](src/components/Map/TripMiniMap.jsx), [MiniKorea.jsx](src/components/Map/MiniKorea.jsx) | 이름표 위치 계산(`labelPoint`)이 3개 파일에 복사돼 있습니다. `md`(월/일 표시) 함수도 여러 파일에 있습니다. | `Map/mapGeometry.js`, `utils/dateFormat.js`로 모으기. | S |
| Q-4 | **Low** | Home 696줄, BucketListPage 683줄, EventModal 588줄, Calendar 543줄, MemoryList 500줄 | 큰 화면 파일. 고칠 때 다른 기능을 건드릴 위험이 큽니다. | 홈은 카드별 컴포넌트로, 버킷은 목록·모달·필터로 분리(동작 변경 없이). 분리 전후 `npm run smoke`. | L |
| Q-5 | **Low** | `src` 전체 | `.js`(76개)와 `.jsx`(106개)가 섞여 있고 타입 정보가 없습니다. | 새 파일은 `.jsx`로 통일. 타입은 서비스 함수부터 JSDoc으로. | L |
| Q-6 | **Low** | eslint 경고 14건 | '효과 안에서 바로 상태 변경' 경고가 구독 훅·AuthContext에 남아 있습니다. | 훅별로 초기 상태 계산을 정리(급하지 않음). | M |

**잘 되어 있는 것:** 안 쓰는 파일 0개(가져오기 관계로 확인), `console.log` 0개, 페이지 지연 로딩, 화면 자동 점검과 release-check.

---

## 7. UI/UX·디자인

| ID | 심각도 | 위치 | 문제 | 개선 방법 | 작업량 |
|---|---|---|---|---|---|
| U-1 | **Medium** | CSS 전체(색 코드 551곳). 많은 곳: [OptionFormSheet.css](src/components/Travel/Decisions/OptionFormSheet.css)(51), [OptionDetailSheet.css](src/components/Travel/Decisions/OptionDetailSheet.css)(39), [EditLogModal.css](src/components/EditLog/EditLogModal.css)(37), [AuthFlow.css](src/components/Auth/AuthFlow.css)(27) | "색 코드를 직접 쓰지 않는다"는 규칙과 달리 색 코드가 많이 남아 있어 화면마다 회색·분홍 톤이 조금씩 다릅니다. | 많이 쓰인 색부터 변수로 치환(여행 후보·수정 기록·로그인 순). | M |
| U-2 | **Medium** | [SealedMessagesPage.css:30-31](src/components/SealedMessages/SealedMessagesPage.css#L30)(28px), [Sidebar.css:52](src/components/common/Sidebar.css#L52)(30px), [DayModal.css:425](src/components/Calendar/DayModal.css#L425)·[sealed-message-modal.css:66](src/components/SealedMessages/sealed-message-modal.css#L66)·[DecisionModal.css:56](src/components/Travel/Decisions/DecisionModal.css#L56)(32px) | 닫기·아이콘 버튼이 28~32px로, 손가락으로 누르기에 작습니다(권장 44px). | 보이는 크기는 두고 누르는 영역만 44px로(패딩 또는 `::after`). | S |
| U-3 | **Medium** | toast 문구(‘~습니다’ 71개, ‘~어요’ 47개) | 안내 문구 말투가 섞여 있습니다. 예: "여행을 삭제했습니다."와 "여행을 기록했어요". | '~어요'체로 통일(새 화면 기준). | S |
| U-4 | **Medium** | E-1과 같음 | 저장이 멈춘 것처럼 보일 때 사용자가 할 수 있는 게 없습니다. | E-1 처리. | — |
| U-5 | **Low** | [Home.jsx](src/components/Home/Home.jsx) 등 누를 수 있는 `div` 33곳 | 카드 누름에 눌림 표시(`:active`)가 없는 곳이 있어 눌렀는지 알기 어렵습니다(확인 필요: 기기에서). | 카드 공통 `:active` 살짝 눌림 효과. | S |
| U-6 | **Low** | [SealedMessageComposeModal.jsx:47](src/components/SealedMessages/SealedMessageComposeModal.jsx#L47), [useHeroImage.js:49](src/hooks/useHeroImage.js#L49) | 사진 처리 오류를 `error.message` 그대로 보여줍니다. 직접 만든 한글 문구일 때는 괜찮지만 라이브러리 오류면 영어가 나옵니다. | `getFriendlyErrorMessage(error, '사진을 불러오지 못했어요.')`로. | S |
| U-7 | **Low** | [TripDetailHeader.jsx](src/components/Travel/Trip/TripDetailHeader.jsx) | 여행지를 비우면 여행지 줄과 바로 아래 지역 줄에 같은 이름이 두 번 보입니다(예: "광주 동구 · 광주 서구" / "전남광주 광주 동구 · 광주 서구"). | 여행지를 비운 경우 지역 줄만 보여주기. | S |
| U-8 | **Low** | [KoreaMap.jsx](src/components/Map/KoreaMap.jsx) | 지도 이름표가 작은 지역(서울 구, 광주 구)에서 겹칠 수 있습니다(확인 필요: 기기에서). | 확대 배율이 낮을 때는 간 곳만 이름표 표시. | S |

---

## 8. 접근성

| ID | 심각도 | 위치 | 문제 | 개선 방법 | 작업량 |
|---|---|---|---|---|---|
| A-1 | **Medium** | 누를 수 있는 `div`/`span` 38곳 중 33곳에 `role`·`tabIndex` 없음. [Home.jsx](src/components/Home/Home.jsx)(6), [TripCard.js](src/components/Travel/Trip/TripCard.js), [TripEndCard.jsx](src/components/Travel/Review/TripEndCard.jsx) 등 | 키보드·화면 읽기 프로그램으로는 카드를 누를 수 없습니다. | `<button>`·`<Link>`로 바꾸거나 `role="button" tabIndex={0}` + Enter 처리. | M |
| A-2 | **Medium** | 모달 약 30개 중 `role="dialog"`/`aria-modal`은 7개 파일, Esc 처리 0곳 | 모달이 열려도 화면 읽기 프로그램이 알 수 없고, 포커스가 모달 안에 갇히지 않습니다. | 공용 모달 틀에 `role="dialog" aria-modal aria-labelledby` + 열릴 때 포커스 이동 + Esc 닫기. | M |
| A-3 | **Low** | `<img>` 15곳 중 3곳 `alt` 없음 | 화면 읽기 프로그램이 파일 이름을 읽습니다. | 장식이면 `alt=""`, 내용이면 설명. | S |
| A-4 | **Low** | [MapPage.css](src/components/Map/MapPage.css) `.km-lb`, `.map-credit` | 지도 회색 이름표·출처 글씨가 매우 작고(6~8px, 0.6rem) 대비가 낮습니다. | 출처는 0.7rem 이상, 안 간 곳 이름표는 확대했을 때만. | S |

**잘 되어 있는 것:** 아이콘만 있는 버튼의 `aria-label`(자동 검색으로 빠진 곳 0), 입력창 글자 16px 고정([index.css:289](src/index.css#L289)), `lang="ko"`.

---

## 9. 세부 완성도

| ID | 심각도 | 위치 | 문제 | 개선 방법 | 작업량 |
|---|---|---|---|---|---|
| D-1 | **Low** | [index.html:5](index.html#L5) | 파비콘이 2.5MB PNG 하나뿐입니다(P-1과 같이 처리). | 32px 파비콘 추가. | S |
| D-2 | **Low** | `public/og-image.png`(752KB) | 링크 공유 미리보기 이미지가 큽니다. 미리 받기에도 들어갑니다. | 200KB 이하 JPEG로, 미리 받기에서 제외. | S |
| D-3 | **Low** | [vite.config.js](vite.config.js) manifest | PWA 바로가기(`shortcuts`)와 화면 캡처가 없습니다. | "일정 추가", "여행" 바로가기 추가(선택). | S |
| D-4 | **Low** | [ErrorBoundary.jsx:50-52](src/components/common/ErrorBoundary.jsx#L50) | 오류 화면이 색 코드 직접 사용 + "~습니다"체 + "버튼을 클릭해서"(모바일에선 '눌러서')입니다. | 앱 톤에 맞춰 문구·스타일 정리. | S |
| D-5 | **Low** | [CLAUDE.md](CLAUDE.md) 구조 참고 | `getMemberName`이 일정 종류를 받는 함수라는 설명이 없어 v1.1.0에서 잘못 쓴 적이 있습니다. | 구조 참고에 `useNameByUid` 한 줄 추가. | S |

---

## 10. 추가하면 좋을 기능 (이 앱에 맞는 것만)

| 제안 | 기대 효과 | 난이도 |
|---|---|---|
| **여행 기록에 사진 붙이기** — 기록 1단계에서 사진 1~3장, 여행 상세 기록 카드와 지도 시트에 표시 | 지금 여행 기록은 글과 순위뿐이라 다시 볼 때 밋밋합니다. 사진 올리기 경로와 규칙은 편지에서 이미 쓰는 방식을 그대로 쓸 수 있습니다(P-2 줄이기와 함께). | M |
| **우리 지도를 이미지로 저장·공유** | 요약에서 만든 이미지 저장(`recapImage.js`, `saveImageFile`)을 그대로 재사용합니다. "우리 여기까지 칠했어"를 공유하기 좋습니다. | S |
| **버킷 → 일정 만들기** — 버킷 항목에서 [일정으로 잡기] | 버킷이 '하고 싶은 것' 목록으로만 남고 실행으로 이어지는 길이 없습니다. 일정을 끝내면 버킷도 완료로 묻기. | M |
| **연결 상태·저장 상태 표시** | 지하철·해외 여행 중에 "저장됐나?"가 가장 불안한 지점입니다(E-1). | S |
| **일정에 한 줄 반응** — 상대 일정에 하트·한마디 | 둘이 쓰는 앱인데 상대가 봤는지 알 길이 알림뿐입니다. 일정 문서에 `reactions[uid]` 하나면 됩니다. | M |
| **연말 랩업에 '올해 칠한 지도' 카드** | 지도 데이터가 이미 있어 카드 한 장만 추가하면 됩니다. | S |
| **해외 여행 표시** — 지역 칩에 '해외' + 나라 이름 | 지금은 해외 여행을 지역 없이 둘 수밖에 없어 지도·통계에서 빠집니다. 지도 아래 "해외 3곳" 목록만 있어도 충분합니다. | M |
| **여행 예산 정산** — 일정별 금액을 낸 사람과 함께 기록, 여행 끝 기록에서 합계 | 이미 예산·일정 금액 필드가 있어 누가 냈는지만 더하면 됩니다. | M |

---

## 11. 실행 로드맵 (우선순위 순, 같이 하면 좋은 것끼리 묶음)

**묶음 1 — 바로 고칠 것 (작업 반나절, 사용자 체감 큼)**
- S-1 로그아웃 때 알림 토큰 제거
- P-1·D-1·D-2 아이콘·공유 이미지 크기 줄이기, P-9 안 쓰는 7.8MB 이미지 삭제
- S-2 합류 함수 검증 추가, S-5·S-12·B-5 규칙 보강 → **Functions·규칙 배포 필요**
- U-6 사진 오류 문구, U-7 여행지 중복 표시

**묶음 2 — 모바일 네트워크 대응 (1~2일)**
- E-1·E-4 오프라인 배너 + 저장 대기 안내
- B-1 구독 오류 처리(로딩이 끝나지 않는 문제)
- E-2 첫 화면 제한 시간, E-3 중복 누름 방지 통일

**묶음 3 — 사진·글꼴 (1일)**
- P-2 올리기 전 사진 줄이기(홈·편지 공통)
- P-5 글꼴 자체 호스팅 또는 미리 연결
- P-7 이미지 지연 로딩
- S-3 봉인 편지 사진 경로 변경(사진 올리는 코드를 고칠 때 같이)

**묶음 4 — 누르기·읽기 편하게 (1~2일)**
- U-2 작은 버튼 누르는 영역
- A-1 누를 수 있는 카드의 키보드·읽기 프로그램 대응, A-2 모달 공통 처리, A-3
- U-3 문구 말투 통일, D-4 오류 화면

**묶음 5 — 안정성 기반 (2~3일)**
- Q-1 순수 함수 단위 테스트, Q-2 서버 함수 분리·테스트
- S-4 의존성 정리, S-7 보안 헤더, S-10·S-11
- B-2·B-3 날짜 변환 정리

**묶음 6 — 장기 (각 2일 이상)**
- P-3 일정 구독 범위 줄이기, P-4·P-6
- U-1 색 코드 정리, Q-3·Q-4 중복·큰 파일 분리
- S-6·S-8 규칙 세분화·App Check, B-4 혼자 쓰던 커플 데이터

## 12. 먼저 고쳐야 할 순서 (제안)

1. **묶음 1** — 작고 확실하며, 개인정보(알림)와 용량 문제를 바로 줄입니다.
2. **묶음 2** — 모바일 사용자가 가장 자주 겪는 "멈춘 것처럼 보이는" 문제입니다.
3. **묶음 3** — 사진이 쌓일수록 느려지는 문제를 지금 막습니다.
4. 이후 묶음 4 → 5 → 6, 기능 제안은 '우리 지도 이미지 저장'과 '연결 상태 표시'부터 권합니다.
