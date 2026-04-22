# Twogether (우리두리) - 프로젝트 컨텍스트

## 기본 정보
- **앱 이름**: 우리두리 (한글 UI), Twogether (영어/코드)
- **현재 버전**: v0.3.4 | 배포: https://twogether-206fb.web.app | GitHub: master 브랜치

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

### Firebase Storage + Workbox
`firebasestorage.googleapis.com`을 Workbox runtimeCaching에 넣으면 서비스 워커가 CORS 없이 fetch → opaque 응답 → 이미지 로딩 실패 (특히 iOS). **현재 의도적으로 캐싱에서 제외**되어 있음.

### EventForm.js
비어 있음 — 폼 로직이 `EventModal.js`에 통합되어 있음.

### BucketListPage
`getDocs` 사용 (실시간 구독 아님) → 파트너가 변경해도 새로고침 전까지 반영 안 됨.

## AuthContext API
`user, userDoc, coupleDoc, coupleId, partnerDoc, getMemberName, loading` 전역 제공.
- `members[0]` = boyfriend (커플 생성자), `members[1]` = girlfriend (합류자)
- `getMemberName('boyfriend'|'girlfriend'|'couple')` → 실제 displayName 반환

## ProtectedRoute 순서
loading → user 없음(`/login`) → coupleId 없음(`/couple-setup`) → 통과

## Firestore 데이터 스키마
```
users/{uid}        → uid, email, displayName, coupleId
couples/{coupleId} → members:[uid1,uid2], inviteCode, anniversaryDate, heroImageUrl
events             → coupleId, title, start, end, ...
trips              → coupleId, startDate, ...
bucketlists        → coupleId, ...
edit_logs          → eventId 기반 조회 (coupleId 필터 없음 — 보안 강화 필요 시 추가)
```

## 남은 작업
- 이벤트 이미지 업로드: EventModal.js 파일선택 UI → `storageService.uploadEventImage()` → imageUrls 저장 → MemoryCard/Detail 표시
- 소셜 로그인 (Google/Kakao, 장기)

## 작업 규칙
1. 기능 하나 완성 후 커밋 허락 받고 다음 작업 — 여러 요청이어도 한 번에 몰아서 하지 말 것
2. 작업 완료 후 변경 파일·추가 기능·부작용 설명. 커밋은 내가 요청할 때만
3. 하나의 파일에 모든 것 구현 금지 — 기능별 모듈화
4. 요청이 불명확할 때 추론해서 실행하지 말고 선택지 제시 후 확인
5. 내가 제시한 문제가 실제로 그렇게 동작하는지 확인 후 수정(내가 문제가 있다고 말해서 무작정 수정 금지)
