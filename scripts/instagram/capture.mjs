// 인스타그램 게시물용 실제 앱 화면 캡처. 화면 자동 점검(smoke)과 같은 방식 —
// Firebase 에뮬레이터(데모 프로젝트, 운영과 무관)에 게시물용 데이터를 넣고, 에뮬레이터에 붙은 개발 서버를 띄워 화면을 찍어요.
// 사용: bash scripts/instagram/capture.sh  → marketing/instagram/shots/*.png (390x844, 3배)
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(root, 'marketing/instagram/shots');
const PROJECT = 'demo-twogether';
const AUTH = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'}`;
const FS = `http://${process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'}/v1/projects/${PROJECT}/databases/(default)/documents`;
const PORT = 5198;
const BASE = `http://127.0.0.1:${PORT}`;
const EMAIL = 'insta-a@test.dev';
const PASSWORD = 'insta-pass-1234';
const ONLY = (process.env.SHOTS || '').split(',').filter(Boolean);

async function loadPlaywright() {
  for (const base of [path.join(os.homedir(), 'AppData/Local/npm-cache/_npx'), path.join(os.homedir(), '.npm/_npx')]) {
    if (!fs.existsSync(base)) continue;
    for (const d of fs.readdirSync(base)) {
      const p = path.join(base, d, 'node_modules/playwright/index.mjs');
      if (fs.existsSync(p)) return import(pathToFileURL(p).href);
    }
  }
  throw new Error('Playwright를 찾지 못했어요. `npx playwright install chromium`을 한 번 실행해 주세요.');
}

// ── 날짜(로컬 기준) ──
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = new Date();
const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };
const next = new Date(today.getFullYear(), today.getMonth() + 1, 1); // 이야기의 무대 = 다음 달
const N = (day) => `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(day)}`;
const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
const P = (day) => `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}-${pad(day)}`;
const prevMonth = P(1).slice(0, 7);
const T = (day) => `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(day)}`;

// ── Firestore REST ──
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
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
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
  const a = await signUp(EMAIL); // 하나(파란 친구) — 화면을 보는 사람
  const b = await signUp('insta-b@test.dev'); // 두리(살구 친구)
  const c = 'insta-couple';
  const now = new Date();
  await put(`users/${a}`, { displayName: '하나', email: EMAIL, coupleId: c, nicknameConfirmed: true, firstStepsDismissed: true, createdAt: now });
  await put(`users/${b}`, { displayName: '두리', email: 'insta-b@test.dev', coupleId: c, nicknameConfirmed: true, firstStepsDismissed: true, createdAt: now });
  await put(`couples/${c}`, { members: [a, b], anniversaryDate: ymd(addDays(-623)), inviteCode: 'INSTA1', heroImageUrl: `${BASE}/og-image.jpg`, createdAt: now });

  let n = 0;
  const ev = (dateStr, title, eventType = 'couple', extra = {}) => put(`events/ev${++n}`, {
    title, start: dateStr, end: dateStr, eventType, description: '', coupleId: c, createdBy: eventType === 'girlfriend' ? b : a, createdAt: now, updatedAt: now, ...extra,
  });
  // 이번 달
  await ev(ymd(today), '저녁 같이 먹기');
  await ev(ymd(addDays(1)), '보드게임 카페');
  await ev(T(7), '한강에서 라면 먹기');
  await ev(T(14), '보드게임 카페');
  await ev(T(21), '영화 보기');
  await ev(T(18), '야근', 'boyfriend');
  await ev(T(11), '동기 모임', 'girlfriend');
  // 다음 달(게시물의 무대)
  await ev(N(5), '전시회');
  await ev(N(9), '팀 회식', 'girlfriend', { description: '저녁 7시 강남역 · 팀장님, 동기들이랑 · 늦을 수도' });
  await ev(N(9), '필라테스', 'boyfriend', { description: '8시 수업 · 끝나고 통화하기' });
  await ev(N(12), '친구 결혼식', 'girlfriend', { description: '12시 반 강남 · 대학 동기들이랑 · 끝나고 연락할게' });
  await ev(N(15), '출장', 'boyfriend');
  await ev(N(24), '크리스마스 데이트', 'couple', { isDday: true });
  await ev(N(28), '송년회', 'boyfriend');
  await ev(N(31), '해돋이 보러 가기');
  // 1·2년 전 이맘때(그날의 우리)
  await ev(ymd(addDays(-365)), '첫 제주 여행 둘째 날');
  await ev(ymd(addDays(-366)), '첫 제주 여행 첫째 날');
  await ev(ymd(addDays(-729)), '처음 같이 본 영화');
  // 지난달(월간 요약용)
  await ev(P(3), '놀이공원 교복 데이트');
  await ev(P(9), '단풍 구경');
  await ev(P(17), '보드게임 카페');
  await ev(P(24), '집에서 영화');
  await ev(P(31 > 30 ? 30 : 31), '커플 사진 찍기');

  // 여행
  const tripBase = { coupleId: c, createdBy: a, createdAt: now, updatedAt: now, description: '' };
  await put('trips/t1', { ...tripBase, title: '강릉 1박 2일', destination: '강릉', startDate: N(18), endDate: N(19), status: 'planning', budget: 400000, regions: [{ sido: '51', sgg: '51150' }] });
  await put('trips/t0', { ...tripBase, title: '제주 여행', destination: '제주도', startDate: P(10), endDate: P(12), status: 'completed', budget: 0, regions: [{ sido: '50' }],
    review: { [b]: { mood: 'great', text: '', top3: [], doneAt: 1, updatedAt: 1 } } });
  await put('tripSchedules/t0_1', { tripId: 't0', day: 1, updatedAt: now, schedules: [
    { id: 'z1', title: '성산일출봉', time: '10:00', location: '', category: 'sight', cost: 0, description: '', completed: true },
    { id: 'z2', title: '흑돼지 구이', time: '13:00', location: '', category: 'food', cost: 0, description: '', completed: true },
    { id: 'z3', title: '협재 해변 노을', time: '17:30', location: '', category: 'sight', cost: 0, description: '', completed: true },
    { id: 'z4', title: '귤 따기 체험', time: '15:00', location: '', category: 'activity', cost: 0, description: '', completed: true },
  ] });
  const past = (id, title, dest, sido, monthsAgo) => {
    const s = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 6);
    const e = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 7);
    return put(`trips/${id}`, { ...tripBase, title, destination: dest, startDate: ymd(s), endDate: ymd(e), status: 'completed', budget: 0, regions: [{ sido }] });
  };
  await past('tp1', '부산 바다', '부산', '26', 4);
  await past('tp2', '경주 한옥 스테이', '경주', '47', 7);
  await past('tp3', '서울 호캉스', '서울', '11', 9);

  await put('tripSchedules/t1_1', { tripId: 't1', day: 1, updatedAt: now, schedules: [
    { id: 's1', title: '초당 순두부', time: '11:30', location: '강원특별자치도 강릉시 초당순두부길 77', category: 'food', cost: 24000, description: '', completed: false },
    { id: 's2', title: '안목해변 산책', time: '13:30', location: '', category: 'sight', cost: 0, description: '', completed: false },
    { id: 's3', title: '오션뷰 카페', time: '15:00', location: '', category: 'cafe', cost: 14000, description: '', completed: false },
    { id: 's4', title: '경포 오션뷰 호텔 체크인', time: '17:00', location: '강원특별자치도 강릉시 창해로 307', category: 'stay', cost: 150000, description: '', completed: false, sourceOptionId: 'o1' },
  ] });
  await put('tripSchedules/t1_2', { tripId: 't1', day: 2, updatedAt: now, schedules: [
    { id: 's5', title: '경포호 해돋이', time: '07:20', location: '', category: 'sight', cost: 0, description: '', completed: false },
    { id: 's6', title: '중앙시장 닭강정', time: '11:00', location: '', category: 'food', cost: 22000, description: '', completed: false },
  ] });
  await put('travelTimes/tt1', { tripId: 't1', day: 1, fromScheduleId: 's1', toScheduleId: 's2', travelTime: '차로 12분', updatedAt: now });
  await put('travelTimes/tt2', { tripId: 't1', day: 1, fromScheduleId: 's2', toScheduleId: 's3', travelTime: '걸어서 5분', updatedAt: now });
  await put('travelTimes/tt3', { tripId: 't1', day: 1, fromScheduleId: 's3', toScheduleId: 's4', travelTime: '차로 8분', updatedAt: now });

  const opt = (id, title, price, sa, ca, sb, cb, extra = {}) => ({
    id, url: '', title, address: '', images: [], description: '', price,
    scores: [{ userId: a, score: sa, comment: ca }, { userId: b, score: sb, comment: cb }], totalScore: sa + sb, ...extra,
  });
  await put('trips/t1/travelDecisions/d1', { tripId: 't1', coupleId: c, category: 'custom', title: '숙소', description: '', status: 'deciding', createdAt: now, updatedAt: now, options: [
    opt('o1', '경포 오션뷰 호텔', '150000', 8, '', 9, '바다 보이는 방이면 무조건 여기', { address: '강원특별자치도 강릉시 창해로 307', isDecided: true, decidedBy: b, decidedAt: 1 }),
    opt('o2', '안목 감성 숙소', '110000', 7, '싸긴 한데 역에서 좀 멀어', 5, ''),
    opt('o3', '강릉역 앞 비즈니스 호텔', '89000', 5, '', 4, '잠만 잘 거면 괜찮긴 해'),
  ] });
  const item = (i, title, completed, extra = {}) => ({ id: `item_${i}`, title, description: '', completed, completedBy: completed ? a : null, completedAt: completed ? 1 : null, dueDate: null, priority: 'medium', order: i, createdAt: i, ...extra });
  await put('trips/t1/checklists/main', { tripId: 't1', coupleId: c, createdAt: now, updatedAt: now, items: [
    item(1, '기차표 예매', true), item(2, '숙소 예약', true), item(3, '보조 배터리', true),
    item(4, '렌터카 예약', false, { priority: 'high', dueDate: N(10) }), item(5, '필름 카메라', false),
  ] });

  // 하고 싶은 것
  const bk = (id, data) => put(`bucketlists/${id}`, { coupleId: c, category: '', completed: false, createdAt: now.toISOString(), createdBy: a, ...data });
  await bk('b1', { title: '겨울 바다 보러 가기', kind: 'once', likes: { [a]: true, [b]: true } });
  await bk('b2', { title: '둘이서 김장 해보기', kind: 'once', createdBy: b, likes: { [b]: true } });
  await bk('b3', { title: '보드게임 카페', kind: 'repeat', doneCount: 4, lastDoneAt: T(14), likes: { [a]: true, [b]: true },
    history: [
      { date: P(3), note: '비 와서 급하게 간 날', by: b, at: 1 }, { date: P(17), note: '', by: a, at: 2 },
      { date: T(3), note: '새로 생긴 곳 가봤는데 넓고 좋았다', by: a, at: 3 }, { date: T(14), note: '하나가 3연승. 다음엔 안 봐줌', by: b, at: 4 },
    ] });
  await bk('b4', { title: '집에서 영화', kind: 'repeat', doneCount: 7, lastDoneAt: T(21), history: [{ date: T(21), note: '', by: a, at: 1 }] });
  await bk('b5', { title: '전시회 가기', kind: 'once', createdBy: b, plannedDate: ymd(addDays(-1)), plannedEventId: 'evplan' });
  await bk('b6', { title: '맛집 탐방', kind: 'repeat', doneCount: 2, lastDoneAt: P(20), history: [{ date: P(20), note: '', by: b, at: 1 }] });
  await put('events/evplan', { title: '전시회 가기', start: ymd(addDays(-1)), end: ymd(addDays(-1)), eventType: 'couple', description: '', coupleId: c, createdBy: b, bucketId: 'b5', createdAt: now, updatedAt: now });
  await bk('b7', { title: '한강에서 라면 먹기', kind: 'once', completed: true, completedAt: T(7) });
  await bk('b8', { title: '커플 사진 찍기', kind: 'once', completed: true, completedAt: P(30), createdBy: b });
  await bk('b9', { title: '놀이공원 교복 데이트', kind: 'once', completed: true, completedAt: P(3) });

  // 봉인 편지
  const xmas = new Date(next.getFullYear(), next.getMonth(), 25, 0, 0);
  await put('sealedMessages/m1', { coupleId: c, authorUid: b, recipientUid: a, title: '크리스마스에 열어 봐', unlockAt: xmas, isUnlocked: false, unlockedAt: null, createdAt: now });
  await put('sealedMessages/m1/private/content', { content: '메리 크리스마스!', imageUrl: null });
  await put('sealedMessages/m2', { coupleId: c, authorUid: a, recipientUid: b, title: '600일 축하해', unlockAt: addDays(-23), isUnlocked: true, unlockedAt: addDays(-23), createdAt: addDays(-40) });
  await put('sealedMessages/m2/private/content', { content: '벌써 600일이네. 같이 다닌 곳들이 지도에 하나씩 칠해지는 게 좋아. 다음 600일도 잘 부탁해.', imageUrl: null });
  // 막 가입한 사람(커플 연결 전) — 첫 실행 화면 캡처용
  const nu = await signUp('insta-new@test.dev');
  await put(`users/${nu}`, { displayName: '', email: 'insta-new@test.dev', nicknameConfirmed: false, createdAt: now });
  return { a, b };
};

const startVite = () => new Promise((resolve, reject) => {
  const env = {
    ...process.env, VITE_USE_EMULATORS: 'true', VITE_FIREBASE_PROJECT_ID: PROJECT, VITE_FIREBASE_API_KEY: 'demo-key',
    VITE_FIREBASE_AUTH_DOMAIN: `${PROJECT}.firebaseapp.com`, VITE_FIREBASE_STORAGE_BUCKET: `${PROJECT}.appspot.com`,
    VITE_FIREBASE_APP_ID: '1:000000000000:web:insta', VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000', VITE_SENTRY_DSN: '', NO_COLOR: '1', FORCE_COLOR: '0',
  };
  const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { env, cwd: root, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
  let out = '';
  vite.stdout.on('data', (d) => { out += d; if (/Local/.test(out)) resolve(vite); }); // 색 코드가 섞여 'Local:'로는 못 찾음
  vite.stderr.on('data', (d) => { out += d; });
  vite.on('exit', (code) => reject(new Error(`Vite가 종료됨(${code})\n${out.slice(-800)}`)));
  setTimeout(() => reject(new Error(`Vite 시작 시간 초과\n${out.slice(-800)}`)), 90000);
});

// ── 찍을 화면 ──
const SHOTS = [
  { name: 'home-today', path: '/' },
  { name: 'home-story', path: '/', act: async (p) => { await p.getByRole('button', { name: '우리 이야기' }).click(); } },
  { name: 'calendar', path: '/calendar', act: async (p) => { await p.locator('button', { hasText: '›' }).filter({ visible: true }).first().click(); } },
  { name: 'calendar-day', path: `/calendar/day/${N(9)}` },
  { name: 'calendar-day-wedding', path: `/calendar/day/${N(12)}`, act: async (p) => { await p.getByText('친구 결혼식').last().click(); } },
  { name: 'trip-top', path: '/travel/t1' },
  { name: 'trip-schedule', path: '/travel/t1', act: async (p) => { await p.locator('.td-tabs').scrollIntoViewIfNeeded(); await p.evaluate(() => { const el = document.querySelector('.td-tabs'); el && el.scrollIntoView({ block: 'start' }); }); } },
  { name: 'trip-decisions', path: '/travel/t1', act: async (p) => { await p.locator('.td-tab').nth(1).click(); await p.evaluate(() => document.querySelector('.td-tabs')?.scrollIntoView({ block: 'start' })); } },
  { name: 'trip-checklist', path: '/travel/t1', act: async (p) => { await p.locator('.td-tab').nth(2).click(); await p.waitForTimeout(700); await p.evaluate(() => document.querySelector('.td-tabs')?.scrollIntoView({ block: 'start' })); } },
  { name: 'travel-list', path: '/travel' },
  { name: 'bucket', path: '/bucket' },
  { name: 'bucket-plan', path: '/bucket?modal=plan&id=b1' },
  { name: 'bucket-detail', path: '/bucket?modal=detail&id=b3' },
  { name: 'bucket-done', path: '/bucket', act: async (p) => { await p.locator('.bk-seg button', { hasText: '이룬 것' }).click(); await p.waitForTimeout(600); await p.evaluate(() => document.querySelector('.bk-seg')?.scrollIntoView({ block: 'start' })); } },
  { name: 'wheel-select', path: '/bucket', act: async (p) => { await p.locator('.bk-pick').click(); } },
  { name: 'wheel-result', path: '/bucket', wait: 9000, act: async (p) => {
    await p.locator('.bk-pick').click();
    await p.getByText(/모두 담기/).first().click();
    await p.getByText(/개로 돌리기/).first().click();
    await p.waitForTimeout(800);
    await p.getByRole('button', { name: '돌리기' }).first().click();
  } },
  { name: 'event-new', path: `/calendar/day/${N(12)}`, act: async (p) => { await p.getByText('일정 추가').first().click(); } },
  { name: 'event-repeat', path: `/calendar/day/${N(12)}`, act: async (p) => { await p.getByText('일정 추가').first().click(); await p.waitForTimeout(600); await p.locator('input[placeholder="일정 제목을 입력하세요"]').fill('필라테스'); await p.getByText('반복 일정으로 만들기').first().click(); await p.waitForTimeout(500); await p.getByText('반복 주기').first().scrollIntoViewIfNeeded(); } },
  { name: 'home-dday', path: '/', act: async (p) => { await p.getByText('크리스마스 데이트').first().scrollIntoViewIfNeeded(); } },
  { name: 'letter-write', path: '/letters', act: async (p) => { await p.getByText('편지 쓰기').first().click(); } },
  { name: 'recap-2', path: `/recap/${prevMonth}`, act: async (p) => { await p.mouse.click(330, 500); } },
  { name: 'recap-3', path: `/recap/${prevMonth}`, act: async (p) => { await p.mouse.click(330, 500); await p.waitForTimeout(500); await p.mouse.click(330, 500); } },
  { name: 'recap-4', path: `/recap/${prevMonth}`, act: async (p) => { for (let i = 0; i < 3; i++) { await p.mouse.click(330, 500); await p.waitForTimeout(500); } } },
  { name: 'recap-list', path: '/recap' },
  { name: 'map-sheet', path: '/map', act: async (p) => { await p.locator('svg.km path').first().waitFor({ timeout: 8000 }); await p.locator('svg.km path.l1').first().click({ force: true }); } },
  { name: 'map-sido', path: '/map/50' },
  { name: 'memory-detail', path: '/memories', act: async (p) => { await p.getByText('영화 보기').first().click(); } },
  { name: 'memories-2', path: '/memories', act: async (p) => { await p.getByText('보드게임 카페').first().scrollIntoViewIfNeeded(); } },
  { name: 'letter-open', path: '/letters', act: async (p) => { await p.getByText('600일 축하해').first().click(); } },
  { name: 'review-1', path: '/travel/t0/review' },
  { name: 'review-2', path: '/travel/t0/review?step=2' },
  { name: 'map', path: '/map' },
  { name: 'recap', path: `/recap/${prevMonth}` },
  { name: 'letters', path: '/letters' },
  { name: 'memories', path: '/memories' },
];

const main = async () => {
  fs.mkdirSync(OUT, { recursive: true });
  console.log('· 게시물용 데이터 시드');
  await seed();
  console.log('· 개발 서버 시작');
  const vite = await startVite();
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'ko-KR' });
    await ctx.addInitScript(() => { try { localStorage.setItem('twogether_notification_priming_shown', 'true'); } catch { /* 무시 */ } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login?step=login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
    for (const s of SHOTS) {
      if (ONLY.length && !ONLY.includes(s.name)) continue;
      try {
        await page.goto(`${BASE}${s.path}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        if (s.act) { await s.act(page); await page.waitForTimeout(s.wait || 1200); }
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: path.join(OUT, `${s.name}.png`) });
        console.log(`✓ ${s.name}`);
      } catch (e) {
        console.log(`✗ ${s.name} — ${(e.message || String(e)).split('\n')[0].slice(0, 160)}`);
      }
    }
    // ── 첫 실행 화면(로그인 전 → 가입 직후) ──
    const ONBOARD = [
      { name: 'ob-welcome', path: '/login', login: false },
      { name: 'ob-signup', path: '/login?step=signup', login: false },
      { name: 'ob-nickname', path: '/couple-setup' },
      { name: 'ob-choice', path: '/couple-setup', act: async (p) => { const i = p.locator('input').first(); await i.fill('하나'); await p.locator('button[type="submit"], button:has-text("다음")').first().click(); } },
      { name: 'ob-invite', path: '/couple-setup?step=invite' },
      { name: 'ob-join', path: '/couple-setup?step=join' },
    ];
    if (!ONLY.length || ONBOARD.some((o) => ONLY.includes(o.name))) {
      const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'ko-KR' });
      await ctx2.addInitScript(() => { try { localStorage.setItem('twogether_notification_priming_shown', 'true'); } catch { /* 무시 */ } });
      const p2 = await ctx2.newPage();
      let loggedIn = false;
      for (const o of ONBOARD) {
        if (ONLY.length && !ONLY.includes(o.name)) continue;
        try {
          if (o.login !== false && !loggedIn) {
            await p2.goto(`${BASE}/login?step=login`, { waitUntil: 'domcontentloaded' });
            await p2.locator('input[type="email"]').fill('insta-new@test.dev');
            await p2.locator('input[type="password"]').first().fill(PASSWORD);
            await p2.locator('button[type="submit"]').click();
            await p2.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
            loggedIn = true;
          }
          await p2.goto(`${BASE}${o.path}`, { waitUntil: 'domcontentloaded' });
          await p2.waitForTimeout(1500);
          if (o.act) { await o.act(p2); await p2.waitForTimeout(1500); }
          await p2.screenshot({ path: path.join(OUT, `${o.name}.png`) });
          console.log(`✓ ${o.name} (${new URL(p2.url()).pathname}${new URL(p2.url()).search})`);
        } catch (e) {
          console.log(`✗ ${o.name} — ${(e.message || String(e)).split('\n')[0].slice(0, 160)}`);
        }
      }
    }
  } finally {
    await browser.close();
    // 윈도우에선 셸을 거쳐 띄우므로 자식(node)까지 같이 끝내야 포트가 풀려요
    if (process.platform === 'win32' && vite.pid) { try { execSync(`taskkill /pid ${vite.pid} /T /F`, { stdio: 'ignore' }); } catch { /* 이미 끝남 */ } }
    else vite.kill('SIGTERM');
  }
  process.exit(0);
};

main().catch((e) => { console.error(`캡처 실패: ${e.message}`); process.exit(2); });
