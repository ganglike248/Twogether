#!/usr/bin/env node
// 릴리즈 전 자동 점검 — `node .claude/skills/release-check/check.mjs` (저장소 루트에서)
// 1) 웹·안드로이드·iOS 버전 동기화  2) 직전 release 커밋 이후 바뀐 파일 → 배포 대상/순서
// 3) 추가된 줄의 금지 패턴  4) 삭제된 전역 CSS 변수(기본값 사라짐 경고)
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');
const problems = [];
const warnings = [];
const info = [];

// ── 1. 버전 동기화 ──
const pkg = JSON.parse(read('package.json')).version;
const txt = read('version.txt').trim();
const gradle = read('android/app/build.gradle');
const vName = (gradle.match(/versionName\s+"([^"]+)"/) || [])[1];
const vCode = (gradle.match(/versionCode\s+(\d+)/) || [])[1];
const pbx = read('ios/App/App.xcodeproj/project.pbxproj');
const mkt = [...pbx.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map(m => m[1]);
const build = [...pbx.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g)].map(m => m[1]);

info.push(`버전: package ${pkg} · version.txt ${txt} · android ${vName}(${vCode}) · ios ${[...new Set(mkt)].join('/')}(${[...new Set(build)].join('/')})`);
if (pkg !== txt) problems.push(`package.json(${pkg})과 version.txt(${txt})가 다름`);
const nativeVersions = new Set([vName, ...mkt]);
if (nativeVersions.size > 1) problems.push(`네이티브 버전명이 서로 다름: ${[...nativeVersions].join(', ')}`);
if (new Set(build).size > 1) problems.push(`iOS Debug/Release 빌드 번호가 다름: ${build.join(', ')}`);
if (build[0] && vCode && build[0] !== vCode) warnings.push(`iOS 빌드 번호(${build[0]})와 안드로이드 versionCode(${vCode})가 다름 — 관례상 같이 올림`);
if (vName && vName !== pkg) warnings.push(`웹(${pkg})과 네이티브(${vName}) 버전이 다름 — "마무리"면 같이 맞출 것`);

// ── 2. 직전 release 이후 바뀐 파일 ──
let base = '';
try { base = sh('git log --grep="release:" -1 --format=%H'); } catch { /* 없음 */ }
const range = base ? `${base}..HEAD` : 'HEAD~1..HEAD';
let changed = [];
try {
  const committed = sh(`git diff --name-only ${range}`);
  const working = sh('git diff --name-only HEAD');
  const untracked = sh('git ls-files --others --exclude-standard');
  changed = [...new Set([committed, working, untracked].join('\n').split('\n').filter(Boolean))];
} catch { /* git 없음 */ }
info.push(`기준: ${base ? `직전 release ${base.slice(0, 7)}` : '직전 커밋'} 이후 변경 파일 ${changed.length}개`);

const has = (re) => changed.some(f => re.test(f));
const deploy = [];
if (has(/^functions\//)) deploy.push('Functions(`npx firebase-tools deploy --only functions`)');
if (has(/^(firestore\.rules|firestore\.indexes\.json)$/)) deploy.push('Firestore 규칙/인덱스(`--only firestore`)');
if (has(/^storage\.rules$/)) deploy.push('Storage 규칙(`--only storage`)');
if (has(/^(src|public|index\.html|vite\.config\.js)/)) deploy.push('Hosting(`--only hosting`)');
if (deploy.length) info.push(`배포 순서: ${deploy.join(' → ')}`);
if (has(/^functions\//) && has(/^src\//)) warnings.push('Functions와 웹이 같이 바뀜 — 반드시 Functions를 Hosting보다 먼저 배포');
if (has(/^(src|public|android|ios|capacitor\.config)/)) info.push('앱(AAB/Archive) 재빌드 필요 — 웹 변경도 앱엔 다음 네이티브 빌드부터 반영');

// ── 3·4. 추가/삭제된 줄 검사 ──
let diff = '';
try { diff = sh(`git diff -U0 ${base || 'HEAD~1'} -- src index.html`); } catch { /* 없음 */ }
let file = '';
const added = [];
const removed = [];
for (const line of diff.split('\n')) {
  if (line.startsWith('+++ b/')) { file = line.slice(6); continue; }
  if (line.startsWith('+') && !line.startsWith('+++')) added.push([file, line.slice(1)]);
  if (line.startsWith('-') && !line.startsWith('---')) removed.push([file, line.slice(1)]);
}
const rules = [
  [/toISOString\(\)/, 'toISOString() — KST에서 날짜가 하루 밀림, getLocalDateStr() 사용'],
  [/(?<![\w-])100vh(?!\s*-)/, '100vh — 모바일에서 넘침, 100dvh 또는 min-height:100% 사용'],
  [/^\s*:root\s*\{/, ':root 정의 — 컴포넌트 CSS에서 전역 변수 정의 금지'],
  [/#(ff6b6b|ffb6b9|ffb6c1)\b/i, '주 색 hex 직접 사용 — var(--color-primary / -dark / --color-danger)'],
  [/background:\s*linear-gradient/, '그라데이션 배경 — 버튼이면 단색 var(--color-primary)'],
  [/console\.log\(/, 'console.log 남음'],
];
for (const [f, text] of added) {
  if (!/\.(jsx?|css)$/.test(f)) continue;
  for (const [re, msg] of rules) {
    if (re.test(text)) warnings.push(`${f}: ${msg}  ← ${text.trim().slice(0, 70)}`);
  }
}
const removedVars = removed
  .filter(([f, t]) => f.endsWith('.css') && /^\s*--[\w-]+\s*:/.test(t))
  .map(([f, t]) => `${f}: ${t.trim().split(':')[0]}`);
const addedVarNames = new Set(added.map(([, t]) => (t.trim().match(/^(--[\w-]+)\s*:/) || [])[1]).filter(Boolean));
const reallyRemoved = removedVars.filter(v => !addedVarNames.has(v.split(': ')[1]));
if (reallyRemoved.length) {
  warnings.push(`CSS 변수 정의 삭제/이동 ${reallyRemoved.length}개 — 그 변수의 기본값이 어디서 오는지 확인(v1.0.29 캘린더 색 사고):\n    ${reallyRemoved.slice(0, 15).join('\n    ')}`);
}

// ── 출력 ──
const out = [];
out.push('## release-check');
info.forEach(l => out.push(`- ${l}`));
out.push(problems.length ? `\n### ❌ 문제 ${problems.length}` : '\n### ✅ 버전 동기화 문제 없음');
problems.forEach(l => out.push(`- ${l}`));
if (warnings.length) { out.push(`\n### ⚠ 확인 필요 ${warnings.length}`); warnings.forEach(l => out.push(`- ${l}`)); }
console.log(out.join('\n'));
process.exit(problems.length ? 1 : 0);
