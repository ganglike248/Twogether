# Differential Security Review — v1.0.24 → v1.0.33 (2026-11-11)

방법: Trail of Bits `differential-review` (Quick Triage, MEDIUM 코드베이스 → FOCUSED). 범위: `1aedf35..HEAD`의
`firestore.rules`, `storage.rules`, `functions/`, `src/services/`. Functions·Storage 규칙 변경 없음.

## 위험도 분류
| 파일 | 위험 | 내용 |
|---|---|---|
| firestore.rules | HIGH | `users` write 분리(coupleId 불변/자기 혼자 커플만), `couples` create를 `members == [uid]`로 |
| authService.js | MEDIUM | `sendPasswordReset`, `confirmNickname`, `setFirstStepsDismissed` 추가(모두 본인 문서) |
| inviteShare.js | LOW | 공유 창/클립보드, 외부 전송 없음 |
| travelChecklist/Decision, color 서비스 | LOW | 미사용 함수 삭제(호출부 0 확인) |

## 발견 사항

### F1. (해결됨, 이전 버전 취약점) 다른 커플 사용자 개인정보 열람 — HIGH
- 이전 규칙: `users` write가 본인이면 전부 허용 → 공격자가 자기 `users.coupleId`를 피해 커플 ID로 바꾸면
  `users` read 규칙(`get(users/me).coupleId`의 `couples.members`에 대상 포함)을 통과해 **피해 커플 두 사람의 사용자 문서
  (이메일·닉네임·FCM 토큰·알림 설정)를 읽을 수 있었음**. 커플 ID는 추측 불가 랜덤이라 실제 악용은 ID 유출이 전제.
- v1.0.33: `coupleId`는 그대로이거나 `getAfter(couples/{id}).members == [본인]`일 때만 변경 가능 → 차단.
- 커플 데이터 자체(일정 등)는 각 컬렉션 규칙이 `couples.members`를 보므로 이전에도 노출되지 않았음.

### F2. (해결됨) 남을 멤버로 넣은 커플 생성 — MEDIUM
- 이전: `couples` create가 `auth.uid in members`만 확인 → `[공격자, 피해자]` 커플 생성 가능,
  `onCoupleCreate`가 피해자 claims에 그 커플을 추가(피해자 쪽 데이터 노출은 없음, claims 오염).
- v1.0.33: `members == [auth.uid]`로 차단. 앱의 유일한 생성 경로(`createCouple`)와 일치 확인.

### F3. (잔여, LOW) 2인 커플 멤버가 자기 coupleId를 새 혼자 커플로 바꿀 수 있음
- `settingOwnSoloCouple`은 "현재 커플을 떠나는지"를 보지 않음 → 정식 해제(`leaveCouple`) 없이 자기 쪽만 이탈해
  상대 커플 문서에 멤버로 남는 비정상 상태 가능. 피해는 본인 데이터 접근 상실뿐(타인 영향 없음), UI 경로도 없음.
- 조치 원하면: `resource.data.coupleId == null` 또는 기존 커플 `members`가 비어 있을 때만 허용으로 좁힐 수 있음.

### F4. (잔여, LOW) 본인 문서의 부가 필드는 자유 쓰기
- `fcmTokens`·`notificationPrefs`·`coupleEndedNotice` 등을 본인이 임의로 쓸 수 있음. 영향은 본인 알림/표시에 한정.

## 회귀 확인
- 클라이언트의 `users` 쓰기 경로 전부 확인: 가입 `setDoc`(coupleId null), 구글 `ensureUserDoc`(null), `createCouple` 배치
  (getAfter로 같은 배치의 새 커플 확인), 닉네임·첫 걸음·색·알림 설정·안내 삭제(coupleId 미변경), 계정 충돌 정리 delete(본인).
- `couples` 생성은 `createCouple` 한 곳뿐. 데이터 백업 복원은 `users`/`couples` 생성 안 함.
- 합류·해제·탈퇴는 Admin SDK 콜러블이라 규칙 영향 없음.

## 한계
- 테스트 코드 없음(규칙 단위 테스트 미작성). 문법은 Firestore 에뮬레이터 로드로만 확인, 시나리오는 운영에서 수동 확인 필요.
- Functions 전체·Storage 규칙은 이번 범위 밖(변경 없음).
