// 릴스 영상 만들기 — reel.html의 애니메이션을 시간만 옮겨 가며 한 프레임씩 찍고(끊김 없음) MP4로 묶어요.
// 사용: python scripts/instagram/reel.py && node scripts/instagram/reel.mjs
//   미리 보기(몇 장만): node scripts/instagram/reel.mjs --stills 1000,4800,7500
// 필요: Playwright(npx playwright install chromium), ffmpeg(pip install imageio-ffmpeg)
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, 'marketing/instagram/reel');
const FPS = 30;

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

// 지도 자리표시(게시물과 같은 방식)는 릴스에 없지만, 있어도 비워 둠
const html = fs.readFileSync(path.join(dir, 'reel.html'), 'utf8');
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(dir, 'reel.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => window.__ready);
const total = Number(/data-total="(\d+)"/.exec(html)[1]);
const stage = page.locator('#stage');

const stillsArg = process.argv.indexOf('--stills');
if (stillsArg > -1) {
  const out = path.join(dir, 'stills');
  fs.mkdirSync(out, { recursive: true });
  for (const t of process.argv[stillsArg + 1].split(',').map(Number)) {
    await page.evaluate((ms) => window.__seek(ms), t);
    await stage.screenshot({ path: path.join(out, `${String(t).padStart(5, '0')}.png`) });
  }
  await browser.close();
  console.log(out);
  process.exit(0);
}

const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'wooridoori-reel-'));
const count = Math.round((total / 1000) * FPS);
for (let f = 0; f < count; f++) {
  await page.evaluate((ms) => window.__seek(ms), (f * 1000) / FPS);
  await stage.screenshot({ path: path.join(frames, `${String(f).padStart(5, '0')}.png`) });
  if (f % 150 === 0) console.log(`${f}/${count}`);
}
await browser.close();

const ffmpeg = execSync('python -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"').toString().trim();
const outFile = path.join(dir, 'reel.mp4');
execFileSync(ffmpeg, ['-y', '-framerate', String(FPS), '-i', path.join(frames, '%05d.png'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '15',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-r', String(FPS), outFile], { stdio: 'ignore' });
fs.rmSync(frames, { recursive: true, force: true });
console.log(outFile);
