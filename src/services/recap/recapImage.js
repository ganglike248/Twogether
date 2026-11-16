// src/services/recap/recapImage.js
// 요약 카드를 PNG로 — html-to-image. 한글 웹폰트(주아·고운돋움)는 통째로 넣으면 수 MB라
// 카드에 실제로 쓰인 글자만 Google Fonts `text=` 서브셋으로 받아 data URL로 넣음(실패하면 시스템 폰트로 저장).
import { toPng } from 'html-to-image';

const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Jua&display=block&text=';

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const buildFontEmbedCss = async (text) => {
  const chars = [...new Set(`${text}0123456789%·+-–→()`.replace(/\s/g, ''))].sort().join('');
  const res = await fetch(FONT_CSS_URL + encodeURIComponent(chars));
  if (!res.ok) throw new Error(`font css ${res.status}`);
  let css = await res.text();
  const urls = [...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]))];
  for (const url of urls) {
    const fontRes = await fetch(url);
    if (!fontRes.ok) throw new Error(`font ${fontRes.status}`);
    css = css.split(url).join(await blobToDataUrl(await fontRes.blob()));
  }
  return css;
};

/** node를 PNG data URL로 */
export const captureRecapImage = async (node) => {
  let fontEmbedCSS = '';
  try {
    fontEmbedCSS = await buildFontEmbedCss(node.textContent || '');
  } catch {
    fontEmbedCSS = ''; // 빈 문자열이면 html-to-image가 폰트를 따로 찾지 않음 → 시스템 폰트
  }
  const backgroundColor = getComputedStyle(node).backgroundColor || 'white'; // .rc-export 배경과 같게
  return toPng(node, { pixelRatio: 2, backgroundColor, fontEmbedCSS, cacheBust: true });
};
