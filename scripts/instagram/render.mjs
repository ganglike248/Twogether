// 인스타그램 게시물 슬라이드(HTML)를 1080x1350 PNG로 뽑아요.
// 사용: node scripts/instagram/render.mjs post-01
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const post = process.argv[2] || 'post-01';
const dir = path.join(root, 'marketing/instagram', post);
const file = process.argv[3] || 'slides.html'; // 시안 비교용 파일도 뽑을 수 있어요

async function loadPlaywright() {
  const bases = [path.join(os.homedir(), 'AppData/Local/npm-cache/_npx'), path.join(os.homedir(), '.npm/_npx')];
  for (const base of bases) {
    if (!fs.existsSync(base)) continue;
    for (const d of fs.readdirSync(base)) {
      const p = path.join(base, d, 'node_modules/playwright/index.mjs');
      if (fs.existsSync(p)) return import(pathToFileURL(p).href);
    }
  }
  throw new Error('Playwright를 찾지 못했어요. `npx playwright install chromium`을 한 번 실행해 주세요.');
}

// 우리 지도 카드: 앱의 실제 시·도 경계를 그대로 써요
function mapSvg() {
  const sido = JSON.parse(fs.readFileSync(path.join(root, 'src/components/Map/data/sido.json'), 'utf8'));
  const on = (process.env.MAP_ON || '11,26,47,50,51').split(',').filter(Boolean);
  const paths = Object.entries(sido.d)
    .map(([code, d]) => `<path d="${d}"${on.includes(code) ? ' class="on"' : ''}/>`)
    .join('');
  return `<svg viewBox="0 0 ${sido.w} ${sido.h}">${paths}</svg>`;
}

const html = fs.readFileSync(path.join(dir, file), 'utf8').replace('<!--MAP-->', mapSvg());
const built = path.join(dir, '.build.html');
fs.writeFileSync(built, html);

const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(built).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const out = path.join(dir, file === 'slides.html' ? 'out' : `out-${path.basename(file, '.html')}`);
fs.mkdirSync(out, { recursive: true });
const slides = await page.locator('.slide').all();
for (let i = 0; i < slides.length; i++) {
  const file = path.join(out, `${String(i + 1).padStart(2, '0')}.png`);
  await slides[i].screenshot({ path: file });
  console.log(file);
}
await browser.close();
fs.unlinkSync(built);
