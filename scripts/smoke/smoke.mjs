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
    ...(id === 'eb5' ? { bucketId: 'b5' } : {}),
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
  // 기간 줄이기 점검용 — 3일째에 일정 하나
  await put('tripSchedules/t1_3', { tripId: 't1', day: 3, updatedAt: now, schedules: [
    { id: 's3', title: '중앙시장 닭강정', time: '11:00', location: '', category: 'food', completed: false },
  ] });
  await put('bucketlists/b1', { coupleId: c, title: '캠핑 가기', category: '', completed: false, createdAt: now.toISOString(), createdBy: a });
  await put('bucketlists/b2', { coupleId: c, title: '오마카세', category: '', completed: true, completedAt: ymd(addDays(-10)), createdAt: now.toISOString(), createdBy: b });
  // 하고 싶은 것(v1.2): 또 할 것 + 기록, 지난 계획(→ '했어요?' 카드)
  await put('bucketlists/b3', { coupleId: c, title: '마라탕 먹기', kind: 'repeat', category: 'food', completed: false, doneCount: 2, lastDoneAt: ymd(addDays(-20)),
    history: [{ date: ymd(addDays(-40)), note: '맵기 2단계', by: a, at: 1 }, { date: ymd(addDays(-20)), note: '', by: b, at: 2 }], likes: { [a]: true, [b]: true }, createdAt: now.toISOString(), createdBy: a });
  await ev('eb4', ymd(addDays(-2)), '한강 피크닉');
  // 캘린더에서 계획 일정을 지우면 버킷의 계획도 풀리는지 점검용(앞날 계획)
  await ev('eb5', ymd(addDays(5)), '스모크 계획 버킷');
  await put('bucketlists/b5', { coupleId: c, title: '스모크 계획 버킷', kind: 'once', category: '', completed: false, plannedDate: ymd(addDays(5)), plannedEventId: 'eb5', createdAt: now.toISOString(), createdBy: a });
  await put('bucketlists/b4', { coupleId: c, title: '한강 피크닉', kind: 'once', category: '', completed: false, plannedDate: ymd(addDays(-2)), plannedEventId: 'eb4', createdAt: now.toISOString(), createdBy: b });
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
  { name: '날짜 모달 Esc로 닫기', path: '/', expect: '우리 이야기', act: async (p) => {
    // useDialog(Esc) 확인 — 캘린더 날짜 모달을 열고 Esc로 닫힘
    await p.goto(p.url().replace(/\/$/, '') + '/calendar', { waitUntil: 'domcontentloaded' });
    const cell = p.locator(`.fc-daygrid-day[data-date="${ymd(today)}"]`).filter({ visible: true }).first();
    await cell.click();
    await p.waitForURL(/\/calendar\/day\//, { timeout: 8000 });
    await p.locator('[role="dialog"]').first().waitFor({ timeout: 5000 });
    await p.keyboard.press('Escape');
    await p.waitForURL((u) => !/\/calendar\/day\//.test(u.pathname), { timeout: 5000 });
  } },
  { name: '여행 카드를 키보드(Enter)로 열기', path: '/travel', expect: '강릉 바다 여행', act: async (p) => {
    const card = p.locator('.tvl-item').filter({ hasText: '강릉 바다 여행' }).first();
    await card.focus();
    await p.keyboard.press('Enter');
    await p.waitForURL(/\/travel\/t1/, { timeout: 5000 });
  } },
  { name: '추억', path: '/memories' },
  { name: '하고 싶은 것 보드(예전 문서·자주 할 것·이룬 것)', path: '/bucket', expect: '캠핑 가기', act: async (p) => {
    await p.getByText('마라탕 먹기').first().waitFor({ timeout: 5000 });
    await p.locator('.bk-seg button', { hasText: '이룬 것' }).click();
    await p.getByText('오마카세').first().waitFor({ timeout: 5000 });
  } },
  { name: '하고 싶은 것 추가 → 했어요(자주 할 것 횟수)', path: '/bucket', expect: '캠핑 가기', settleMs: 1500, act: async (p) => {
    await p.locator('.bk-add-input').fill('스모크 떡볶이');
    await p.locator('.bk-kind button', { hasText: '자주' }).click();
    await p.locator('.bk-add-btn').click();
    await p.locator('.bk-card', { hasText: '스모크 떡볶이' }).first().click();
    await p.locator('.bk-sheet .bk-btn.primary', { hasText: '했어요' }).click();
    await p.locator('#bk-done-note').fill('또 먹자');
    await p.locator('.bk-wide-btn', { hasText: '기록하기' }).click();
    await p.getByText('함께한 기록 · 1번').first().waitFor({ timeout: 8000 });
  } },
  { name: '하고 싶은 것 → 언제 할까?(일정 만들기)', path: '/bucket?modal=plan&id=b1', expect: '언제 할까요?', settleMs: 1500, act: async (p) => {
    await p.locator('.bk-wide-btn', { hasText: '일정 만들기' }).click();
    await p.getByText('캘린더에 일정을 만들었어요').first().waitFor({ timeout: 8000 });
  } },
  { name: '뭐 할까? 골라줘(돌림판)', path: '/bucket', expect: '캠핑 가기', act: async (p) => {
    await p.locator('.bk-pick').click();
    await p.getByText('오늘 뭐 할까?').first().waitFor({ timeout: 5000 });
  } },
  { name: '캘린더 수정기록 창', path: '/calendar/log', expect: '전체 수정 기록' },
  { name: '지워진 일정 주소 → 안내 후 캘린더', path: '/calendar/event/no-such-event', expect: '이미 지워진 일정이에요', act: async (p) => { await p.waitForURL((u) => u.pathname === '/calendar', { timeout: 8000 }); if (await p.getByText('새 일정 추가').count()) throw new Error('빈 새 일정 창이 떴어요'); } },
  { name: '캘린더에서 계획 일정 삭제 → 버킷 계획 풀림', path: '/calendar/event/eb5', expect: '삭제', settleMs: 1200, act: async (p) => {
    await p.locator('.sheet-footer-row .btn-danger').click();
    await p.locator('.confirm-actions .btn-danger').click();
    await p.waitForTimeout(1500);
    await p.goto(`${BASE}/bucket`, { waitUntil: 'domcontentloaded' });
    const card = p.locator('.bk-card', { hasText: '스모크 계획 버킷' }).first();
    await card.waitFor({ timeout: 10000 });
    await p.waitForTimeout(800);
    if ((await card.innerText()).includes('하기로 했어요')) throw new Error('일정을 지웠는데 버킷에 계획이 남아 있어요');
  } },
  { name: '홈 했어요? 카드(지난 계획)', path: '/', expect: '했어요?' },
  { name: '했어요? 카드 → 아직이에요', path: '/bucket', expect: '했어요?', settleMs: 1200, act: async (p) => {
    await p.locator('.bk-check-btn', { hasText: '아직이에요' }).click();
    await p.getByText('계획만 풀었어요').first().waitFor({ timeout: 8000 });
  } },
  { name: '여행 목록 + 지도 카드', path: '/travel', expect: '강릉 바다 여행', act: async (p) => { await p.getByText('기록을 기다리는 여행').first().waitFor({ timeout: 8000 }); } },
  { name: '새 여행 모달 + 지역 칸', path: '/travel?modal=trip', expect: '지역 더하기' },
  { name: '여행 저장(새 여행 만들기 → 목록에 보임)', path: '/travel?modal=trip', expect: '지역 더하기', settleMs: 2500, act: async (p) => {
    // 저장 함수(offlineWrite 등)를 바꿀 때 실제 쓰기가 되는지 확인 — 여행지 '속초'로 지역 자동 추천까지
    await p.locator('#trip-title').fill('스모크 저장 여행');
    await p.locator('#trip-destination').fill('속초');
    await p.locator('#trip-start-date').fill(ymd(addDays(30)));
    await p.locator('#trip-end-date').fill(ymd(addDays(31)));
    await p.locator('button[type="submit"]').last().click();
    await p.getByText('스모크 저장 여행').first().waitFor({ timeout: 10000 });
  } },
  { name: '오프라인 저장(멈추지 않고 띠·안내 표시)', path: '/travel?modal=trip', expect: '지역 더하기', act: async (p) => {
    await p.context().setOffline(true);
    try {
      await p.locator('.offline-banner').waitFor({ timeout: 5000 });
      await p.locator('#trip-title').fill('오프라인 여행');
      await p.locator('#trip-destination').fill('강릉');
      await p.locator('#trip-start-date').fill(ymd(addDays(40)));
      await p.locator('#trip-end-date').fill(ymd(addDays(41)));
      await p.locator('button[type="submit"]').last().click();
      // 예전엔 여기서 "저장 중…"으로 멈춤 — 이제 바로 닫히고 기기 대기열 데이터로 목록에 보여야 함
      await p.getByText('오프라인 여행').first().waitFor({ timeout: 6000 });
      await p.getByText('연결되면 자동으로 저장돼요').first().waitFor({ timeout: 4000 });
    } finally {
      await p.context().setOffline(false);
    }
  } },
  { name: '여행 상세(약도·기록 카드·일정)', path: '/travel/t1', expect: '이번 여행은 어땠나요?', act: async (p) => {
    // 다녀온 여행은 약도·정보가 한 줄로 접힌 채 시작 → 펼치면 약도
    await p.locator('.td-summary').click();
    await p.locator('.tmm svg').waitFor({ timeout: 8000 });
    await p.locator('.td-info-fold').click();
    await p.locator('.td-summary').waitFor({ timeout: 3000 });
    // 탭 줄 고정: 화면을 낮게 해서 충분히 내린 뒤에도 탭이 상단 헤더(52px) 바로 아래에 붙어 있어야 함
    await p.setViewportSize({ width: 390, height: 420 });
    try {
      const before = await p.locator('.td-tabs').boundingBox();
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await p.waitForTimeout(250);
      const scrolled = await p.evaluate(() => window.scrollY);
      const box = await p.locator('.td-tabs').boundingBox();
      if (before.y - scrolled > 60) throw new Error('점검할 만큼 스크롤되지 않았어요');
      if (!box || box.y < 50 || box.y > 75) throw new Error(`탭 줄이 고정되지 않았어요(y=${box?.y}, 스크롤 ${scrolled})`);
    } finally {
      await p.setViewportSize({ width: 390, height: 844 });
    }
  } },
  { name: '여행 끝 기록 1단계', path: '/travel/t1/review', expect: '이번 여행 어땠어요?' },
  { name: '여행 끝 기록 2단계(TOP 3)', path: '/travel/t1/review?step=2', expect: '좋았던 순간 TOP 3' },
  { name: '여행 끝 기록 3단계(지도 확인)', path: '/travel/t1/review?step=3', expect: '여행 지도' },
  { name: '우리 지도 + 아래 시트', path: '/map', expect: '함께 가 본 곳', act: async (p) => {
    await p.locator('svg.km path').first().waitFor({ timeout: 8000 });
    await p.locator('svg.km path.l1').first().click({ force: true });
    await p.locator('.map-sheet').waitFor({ timeout: 5000 });
  } },
  { name: '우리 지도 · 강원 시·군', path: '/map/51', expect: '강릉 바다 여행', act: async (p) => { await p.locator('svg.km path').first().waitFor({ timeout: 10000 }); } },
  { name: '여행 목록 구역(다가오는 D-day / 다녀옴) + 검색', path: '/travel', expect: '강릉 바다 여행', act: async (p) => {
    await p.locator('section[aria-label="다녀온 여행"] .tvl-prow', { hasText: '강릉 바다 여행' }).first().waitFor({ timeout: 5000 });
    await p.locator('section[aria-label="다가오는 여행"] .tvl-card', { hasText: '제주 여행' }).getByText('D-20').first().waitFor({ timeout: 5000 });
    await p.locator('.travel-plan-search-input').fill('제주');
    await p.locator('.tvl-item', { hasText: '강릉 바다 여행' }).first().waitFor({ state: 'detached', timeout: 5000 });
  } },
  { name: '체크리스트 첫 항목 추가(문서 없던 여행)', path: '/travel/t2', expect: '제주 여행', settleMs: 1500, act: async (p) => {
    await p.locator('.td-tab', { hasText: '체크리스트' }).click();
    await p.getByText('아직 준비 항목이 없어요').first().waitFor({ timeout: 8000 });
    await p.locator('.fam-fab').click();
    await p.locator('.cm-input').first().fill('스모크 여권');
    await p.locator('.cm-btn.submit').click();
    await p.getByText('스모크 여권').first().waitFor({ timeout: 8000 });
  } },
  { name: '여행 기간 줄이기 → 잘리는 일정 옮기기', path: '/travel/t1', expect: '강릉 바다 여행', settleMs: 2000, act: async (p) => {
    await p.locator('.td-header-action.edit').click();
    await p.locator('#trip-end-date').fill(ymd(addDays(-5)));
    await p.locator('button[type="submit"]').last().click();
    await p.getByText('기간 밖으로 나가요').first().waitFor({ timeout: 5000 });
    await p.locator('.trip-modal-overflow-btns button', { hasText: '옮기기' }).click();
    await p.getByText('여행이 수정됐어요').first().waitFor({ timeout: 10000 });
    await p.locator('.td-day', { hasText: 'Day 2' }).click();
    await p.getByText('중앙시장 닭강정').first().waitFor({ timeout: 8000 });
  } },
  { name: '일정 완료 체크 바로 반영', path: '/travel/t1', expect: '강릉 바다 여행', settleMs: 1500, act: async (p) => {
    await p.locator('.td-day', { hasText: 'Day 2' }).click();
    await p.locator('.tl-item', { hasText: '중앙시장 닭강정' }).locator('.tl-check').click();
    await p.getByText('이 날의 일정을 모두 마쳤어요').first().waitFor({ timeout: 8000 });
  } },
  { name: '여행 탭 위치 주소 유지 + 뒤로가기로 모달만 닫힘', path: '/travel/t1?tab=decisions', expect: '비교 주제', act: async (p) => {
    await p.locator('.tdt-add-topic').click();
    await p.locator('.decision-modal-container').waitFor({ timeout: 5000 });
    await p.goBack();
    await p.locator('.decision-modal-container').waitFor({ state: 'detached', timeout: 5000 });
    if (!p.url().includes('tab=decisions')) throw new Error('뒤로가기 뒤 탭 위치가 사라졌어요');
    await p.getByText('비교 주제').first().waitFor({ timeout: 3000 });
  } },
  { name: '비교 주제 → 후보 추가 → 일정에 추가(새 일정 제목)', path: '/travel/t1?tab=decisions', expect: '비교 주제', settleMs: 1500, act: async (p) => {
    await p.locator('.tdt-add-topic').click();
    await p.locator('.dm-input').first().fill('스모크 숙소');
    await p.locator('.dm-btn.submit').click();
    await p.locator('.dsec', { hasText: '스모크 숙소' }).locator('.dsec-add-card').click();
    await p.locator('.ofs-sheet .ofs-input').first().fill('스모크 호텔');
    await p.locator('.ofs-btn.submit').click();
    await p.locator('.dcard', { hasText: '스모크 호텔' }).locator('.dcard-btn.secondary').click();
    await p.locator('.dsm-day-btn').first().click();
    await p.getByText('새 일정 추가').first().waitFor({ timeout: 5000 });
    await p.goBack();
    await p.locator('.schedule-modal-container').waitFor({ state: 'detached', timeout: 5000 });
    await p.locator('.dcard', { hasText: '스모크 호텔' }).first().waitFor({ timeout: 3000 });
  } },
  { name: '이동 시간 + 이동 수단(도보) 저장', path: '/travel/t1', expect: '강릉 바다 여행', settleMs: 1200, act: async (p) => {
    await p.locator('.tl-travel-text.add').first().click();
    await p.locator('.tl-travel-modes button[aria-label="도보"]').click();
    await p.locator('.tl-travel-input').fill('10분');
    await p.locator('.tl-travel-save').click();
    await p.locator('.tl-travel-text', { hasText: '10분' }).first().waitFor({ timeout: 8000 });
    await p.locator('.tl-travel-icon[aria-label*="도보"]').first().waitFor({ timeout: 3000 });
  } },
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
        await page.waitForTimeout(c.settleMs || 300);
        // 화면에 뜬 오류 알림(빨간 토스트)도 실패로 — 예: 새 여행 저장 직후 '권한이 없어요'(v1.1.11에서 발견)
        const errorToasts = await page.locator('.Toastify__toast--error').allInnerTexts();
        const body = await page.locator('body').innerText();
        if (body.includes('문제가 생겼어요') || body.includes('문제가 발생했어요')) error = '오류 화면(ErrorBoundary)이 떴어요';
        else if (errorToasts.length) error = `오류 알림: ${errorToasts[0].replace(/\s+/g, ' ').slice(0, 120)}`;
        else if (body.includes('페이지를 찾을 수 없어요')) error = '없는 페이지로 나왔어요';
        else if (new URL(page.url()).pathname.startsWith('/login')) error = '로그인 화면으로 튕겼어요';
        else {
          // Firestore SDK 내부 상태 검사 실패(ca9) — 오프라인 캐시 관련 알려진 SDK 문제(firebase-js-sdk #9267). 저장은 정상이라 경고로만
          const known = pageErrors.filter(m => /INTERNAL ASSERTION FAILED/.test(m));
          known.forEach(m => consoleErrors.push(`[알려진 SDK 오류] ${m}`));
          const real = pageErrors.filter(m => !/INTERNAL ASSERTION FAILED/.test(m));
          if (real.length) error = `처리 안 된 오류: ${real[0].slice(0, 160)}`;
        }
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
