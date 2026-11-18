#!/usr/bin/env bash
# 화면 자동 점검 — 에뮬레이터 설정은 루트의 firebase.smoke.json(설정 파일은 프로젝트 루트에 있어야 규칙 파일을 읽음). Firebase 에뮬레이터(데모 프로젝트, 운영과 무관)를 켜고 그 안에서 smoke.mjs 실행. 끝나면 에뮬레이터도 꺼짐.
# 사용: npm run smoke   (Java 필요 · 처음 한 번 `npx playwright install chromium`)
set -e
cd "$(dirname "$0")/../.."
npx firebase-tools emulators:exec --config firebase.smoke.json --project demo-twogether --only auth,firestore "node scripts/smoke/smoke.mjs"
