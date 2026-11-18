// scripts/smoke/smoke.mjs — 화면 자동 점검(스모크 테스트). 직접 실행하지 말고 `npm run smoke`(run.sh)로.
// 흐름: Firebase 에뮬레이터(auth·firestore, 데모 프로젝트)에 테스트 커플 데이터 시드 → 에뮬레이터에 붙은 Vite 개발 서버 실행 →
// Playwright로 로그인 후 주요 화면을 차례로 열어 오류 화면·처리 안 된 오류·핵심 요소를 확인 → "N/M 통과" 요약.
// 운영 Firebase는 전혀 건드리지 않음(데모 프로젝트 ID라 에뮬레이터에만 연결됨).
import { spawn } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';

const PROJECT = 'demo-twogether';
// emulators:exec가 넘겨주는 실제 주소를 우선(호스트가 127.0.0.1/localhost/::1 중 무엇일지 환경마다 다름)
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const FS_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const AUTH = `http://${AUTH_HOST}`;
const FS = `http://${FS_HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;
const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;
const EMAIL = 'smoke-a@test.dev';
const PASSWORD = 'smoke-pass-1234';

// ── Playwright: npx 캐시에서 찾음(프로젝트 의존성에 넣지 않음) ──
const findPlaywright = () => {
  const root = path.join(homedir(), '.npm/_npx');
  for (const dir of existsSync(root) ? readdirSync(root) : []) {
    const p = path.join(root, dir, 'node_modules/playwright');
    if (existsSync(p)) return p;
  }
  throw new Error('Playwright를 찾지 못했어요. `npx playwright install chromium`을 한 번 실행해 주세요.');
};
const { chromium } = createRequire(import.meta.url)(findPlaywright());

// ── 날짜(로컬 기준) ──
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const today = new Date();
const thisMonth = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
const prev = new Date(today.getFullYear(), today.getMonth() - 1, 15);
const prevMonth = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`;

// ── Firestore REST 값 인코딩 ──
const enc = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
  return { stringValue: String(v) };
};
const put = async (docPath, data) => {
  const res = await fetch(`${FS}/${docPath}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, // owner = 규칙 무시(시드 전용)
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, enc(v)])) }),
  });
  if (!res.ok) throw new Error(`시드 실패 ${docPath}: ${res.status} ${await res.text()}`);
};
const signUp = async (email) => {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  const j = await res.json();
  if (!j.localId) throw new Error(`계정 생성 실패: ${JSON.stringify(j)}`);
  return j.localId;
};

const seed = async () => {
  const a = await signUp(EMAIL);
  const b = await signUp('smoke-b@test.dev');
  const c = 'smoke-couple';
  const now = new Date();
  await put(`users/${a}`, { displayName: '두리', email: EMAIL, coupleId: c, nicknameConfirmed: true, firstStepsDismissed: true, createdAt: now });
  await put(`users/${b}`, { displayName: '우리', email: 'smoke-b@test.dev', coupleId: c, nicknameConfirmed: true, firstStepsDismissed: true, createdAt: now });
  await put(`couples/${c}`, { members: [a, b], anniversaryDate: ymd(addDays(-700)), inviteCode: 'SMOKE1', createdAt: now });
  const ev = (id, dateStr, title) => put(`events/${id}`, {
    title, start: `${dateStr}T10:00`, end: `${dateStr}T12:00`, eventType: 'couple', coupleId: c, createdBy: a, createdAt: now, updatedAt: now,
  });
  await ev('e1', ymd(today), '오늘 데이트');
  await ev('e2', `${thisMonth}-02`, '전시 보기');
  await ev('e3', `${prevMonth}-05`, '지난달 카페');
  await ev('e4', `${prevMonth}-20`, '지난달 영화');
  const tripBase = { coupleId: c, createdBy: a, createdAt: now, updatedAt: now, budget: 0, description: '' };
  await put('trips/t1', { ...tripBase, title: '강릉 바다 여행', destination: '강릉', startDate: ymd(addDays(-6)), endDate: ymd(addDays(-4)), status: 'completed', regions: [{ sido: '51', sgg: '51150' }] });
  await put('trips/t2', { ...tripBase, title: '제주 여행', destination: '제주도', startDate: ymd(addDays(20)), endDate: ymd(addDays(22)), status: 'planning', regions: [] });
  await put('tripSchedules/t1_1', { tripId: 't1', day: 1, updatedAt: now, schedules: [
    { id: 's1', title: '안목해변 카페', time: '14:00', location: '강원특별자치도 강릉시 창해로 17', category: 'cafe', completed: true },
    { id: 's2', title: '양양 서피비치', time: '17:00', location: '', category: 'sight', completed: true },
  ] });
  await put('bucketlists/b1', { coupleId: c, title: '캠핑 가기', category: '', completed: false, createdAt: now.toISOString(), createdBy: a });
  await put('bucketlists/b2', { coupleId: c, title: '오마카세', category: '', completed: true, completedAt: ymd(addDays(-10)), createdAt: now.toISOString(), createdBy: b });
};

// ── Vite 개발 서버(에뮬레이터 연결 모드) ──
const startVite = () => new Promise((resolve, reject) => {
  const env = {
    ...process.env,
    VITE_USE_EMULATORS: 'true',
    VITE_FIREBASE_PROJECT_ID: PROJECT,
    VITE_FIREBASE_API_KEY: 'demo-key',
    VITE_FIREBASE_AUTH_DOMAIN: `${PROJECT}.firebaseapp.com`,
    VITE_FIREBASE_STORAGE_BUCKET: `${PROJECT}.appspot.com`,
    VITE_FIREBASE_APP_ID: '1:000000000000:web:smoke',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
    VITE_SENTRY_DSN: '',
  };
  const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  const onData = (d) => { out += d; if (out.includes('Local:')) resolve(vite); };
  vite.stdout.on('data', onData);
  vite.stderr.on('data', (d) => { out += d; });
  vite.on('exit', (code) => reject(new Error(`Vite가 종료됨(${code})\n${out.slice(-800)}`)));
  setTimeout(() => reject(new Error(`Vite 시작 시간 초과\n${out.slice(-800)}`)), 60000);
});

// 브라우저 콘솔 소음(데모·에뮬레이터 환경이라 생기는 것) — 실패로 치지 않음
const NOISE = [/이전 커플 목록 조회 실패/, /* 콜러블 함수(functions 에뮬레이터 안 띄움) */ /messaging/i, /fcm/i, /firebase-messaging/i, /Failed to load resource/i, /fonts\.g/i, /sentry/i, /installations/i, /Notification/i, /service worker/i, /favicon/i, /404/];

// ── 점검 목록 ──
const CHECKS = [
  { name: '홈', path: '/', expect: '우리 이야기', act: async (p) => { await p.getByRole('button', { name: '우리 이야기' }).click(); await p.getByText('봉인 편지함').first().waitFor({ timeout: 8000 }); } },
  { name: '홈 · 여행 기록 카드', path: '/', expect: '어땠어요?' },
  { name: '캘린더 + 날짜 모달', path: '/calendar', expect: null, act: async (p) => {
    // 캘린더는 이전·이번·다음 달 세 장이 나란히 있음 — 화면에 보이는 이번 달의 오늘 칸만 누름
    const cell = p.locator(`.fc-daygrid-day[data-date="${ymd(today)}"]`).filter({ visible: true }).first();
    await cell.waitFor({ timeout: 10000 });
    await cell.click();
    await p.waitForURL(/\/calendar\/day\//, { timeout: 8000 });
  } },
  { name: '추억', path: '/memories' },
  { name: '버킷리스트', path: '/bucket', expect: '캠핑 가기' },
  { name: '여행 목록 + 지도 카드', path: '/travel', expect: '강릉 바다 여행', act: async (p) => { await p.getByText('기록을 기다리는 여행').first().waitFor({ timeout: 8000 }); } },
  { name: '새 여행 모달 + 지역 칸', path: '/travel?modal=trip', expect: '지역 더하기' },
  { name: '여행 상세(약도·기록 카드·일정)', path: '/travel/t1', expect: '이번 여행은 어땠나요?', act: async (p) => { await p.locator('.tmm svg').waitFor({ timeout: 8000 }); } },
  { name: '여행 끝 기록 1단계', path: '/travel/t1/review', expect: '이번 여행 어땠어요?' },
  { name: '여행 끝 기록 2단계(TOP 3)', path: '/travel/t1/review?step=2', expect: '좋았던 순간 TOP 3' },
  { name: '여행 끝 기록 3단계(지도 확인)', path: '/travel/t1/review?step=3', expect: '여행 지도' },
  { name: '우리 지도 + 아래 시트', path: '/map', expect: '함께 가 본 곳', act: async (p) => {
    await p.locator('svg.km path').first().waitFor({ timeout: 8000 });
    await p.locator('svg.km path.l1').first().click({ force: true });
    await p.locator('.map-sheet').waitFor({ timeout: 5000 });
  } },
  { name: '우리 지도 · 강원 시·군', path: '/map/51', expect: '강릉 바다 여행', act: async (p) => { await p.locator('svg.km path').first().waitFor({ timeout: 10000 }); } },
  { name: '지난 요약 목록', path: '/recap', expect: '지난 요약' },
  { name: '월간 요약', path: `/recap/${prevMonth}`, expect: '채웠어요' },
  { name: '봉인 편지함', path: '/letters' },
  { name: '설정', path: '/settings', expect: '알림 설정' },
  { name: '알림 설정', path: '/notification-settings', expect: '알림 받기' }, // 종류별 목록은 알림이 켜졌을 때만 보임(테스트 브라우저는 권한 없음)
  { name: '프로필', path: '/profile', expect: '프로필' },
  { name: '커플 정보', path: '/couple-info' },
  { name: '계정', path: '/account', expect: '로그아웃' },
  { name: '데이터 백업', path: '/data-backup' },
];

const main = async () => {
  console.log('· 테스트 데이터 시드');
  await seed();
  console.log('· 개발 서버 시작(에뮬레이터 연결)');
  const vite = await startVite();
  const browser = await chromium.launch();
  const results = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => { try { localStorage.setItem('twogether_notification_priming_shown', 'true'); } catch { /* 무시 */ } });
    const page = await ctx.newPage();
    let pageErrors = [];
    let consoleErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e.message || e)));
    page.on('console', (m) => { if (m.type() === 'error' && !NOISE.some(r => r.test(m.text()))) consoleErrors.push(m.text()); });

    console.log('· 로그인');
    await page.goto(`${BASE}/login?step=login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });

    for (const c of CHECKS) {
      pageErrors = []; consoleErrors = [];
      let error = '';
      try {
        await page.goto(`${BASE}${c.path}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        if (c.expect) await page.getByText(c.expect).first().waitFor({ timeout: 10000 });
        if (c.act) await c.act(page);
        await page.waitForTimeout(300);
        const body = await page.locator('body').innerText();
        if (body.includes('문제가 발생했어요')) error = '오류 화면(ErrorBoundary)이 떴어요';
        else if (body.includes('페이지를 찾을 수 없어요')) error = '없는 페이지로 나왔어요';
        else if (new URL(page.url()).pathname.startsWith('/login')) error = '로그인 화면으로 튕겼어요';
        else if (pageErrors.length) error = `처리 안 된 오류: ${pageErrors[0].slice(0, 160)}`;
      } catch (e) {
        error = (e.message || String(e)).split('\n')[0].slice(0, 160);
      }
      results.push({ name: c.name, ok: !error, error, warn: consoleErrors.slice(0, 2) });
      console.log(`${error ? '✗' : '✓'} ${c.name}${error ? ` — ${error}` : ''}`);
    }
  } finally {
    await browser.close();
    vite.kill('SIGTERM');
  }
  const pass = results.filter(r => r.ok).length;
  const warns = results.filter(r => r.warn.length);
  console.log(`\n결과: ${pass}/${results.length} 통과`);
  if (warns.length) {
    console.log('콘솔 오류(참고):');
    warns.forEach(r => r.warn.forEach(w => console.log(`  - [${r.name}] ${w.slice(0, 160)}`)));
  }
  process.exit(pass === results.length ? 0 : 1);
};

main().catch((e) => { console.error(`점검 실행 실패: ${e.message}${e.cause ? ` (${e.cause.code || e.cause.message})` : ''}`); console.error(`AUTH=${AUTH} FS=${FS_HOST}`); process.exit(2); });
