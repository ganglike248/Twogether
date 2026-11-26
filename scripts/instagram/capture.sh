#!/usr/bin/env bash
# 인스타그램 게시물용 실제 앱 화면 캡처 — 에뮬레이터(데모 프로젝트, 운영과 무관)를 켜고 capture.mjs 실행. 끝나면 에뮬레이터도 꺼짐.
# 사용: bash scripts/instagram/capture.sh   (일부만: SHOTS=calendar,bucket bash scripts/instagram/capture.sh)
set -e
cd "$(dirname "$0")/../.."
npx firebase-tools emulators:exec --config firebase.smoke.json --project demo-twogether --only auth,firestore "node scripts/instagram/capture.mjs"
