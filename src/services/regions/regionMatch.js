// src/services/regions/regionMatch.js
// 글자(여행지 이름·일정 주소)에서 시·군·구/시·도를 찾아 추천 — 자동으로 채우는 값이라 확실한 것만 돌려줌.
//  - 주소('강원특별자치도 속초시 중앙로 ...')는 공식 이름이 다 들어 있어 정확함
//  - 여행지('속초 바다 여행')는 '시/군/구'를 뗀 이름(속초)으로도 찾음
//  - 같은 이름이 여러 시·도에 있으면(중구·동구·고성군·강서구 등) 시·도가 글자에 같이 있을 때만 채택
//  - 시·도만 나오면 { sido }만(시·도만 칠함). 사용자가 칩으로 고칠 수 있으니 애매하면 넣지 않는 쪽
import { SIDO_LIST, SGG_LIST, mergeRegions } from './regionData';

const SIDO_ALIAS_SET = new Set(SIDO_LIST.flatMap(s => s.aliases));
const stem = (name) => name.replace(/(시|군|구)$/, '');

// 이름 → 후보 sgg들(같은 이름이 여러 시·도에 있을 수 있음). 'full'은 공식 이름, 'stem'은 시/군/구를 뗀 이름
const buildIndex = () => {
  const idx = new Map();
  const add = (key, sgg, kind) => {
    if (!key || key.length < 2) return;
    if (kind === 'stem' && (SIDO_ALIAS_SET.has(key) || key === '광주')) return; // '제주'·'세종'은 시·도 별칭으로, '광주'는 아래에서 따로
    if (!idx.has(key)) idx.set(key, []);
    idx.get(key).push({ sgg, kind });
  };
  SGG_LIST.forEach(s => {
    add(s.raw, s.code, 'full');       // 수원시장안구
    add(s.city, s.code, 'full');      // 수원시 / 속초시 / 강남구
    add(stem(s.city), s.code, 'stem'); // 수원 / 속초 / 강남
    if (s.gu) { add(s.gu, s.code, 'full'); add(stem(s.gu), s.code, 'stem'); } // 장안구 / 장안
  });
  return [...idx.entries()].sort((a, b) => b[0].length - a[0].length); // 긴 이름부터
};
let INDEX = null;

const findSidoHints = (text) => {
  const hints = new Set();
  SIDO_LIST.forEach(s => { if (s.aliases.some(a => text.includes(a))) hints.add(s.code); });
  // '광주' 단독은 경기 광주시와 겹침 — '경기'가 같이 없을 때만 전남광주로
  if (text.includes('광주') && !text.includes('경기') && !text.includes('광주시')) hints.add('12');
  return hints;
};

/** 글자 → 추천 지역 목록(저장 모양). addressOnly면 '시·도 시·군·구 …' 주소 모양일 때만(일정 장소 자동 추가용 —
 *  '스타벅스 강남역점' 같은 장소 이름에서 강남구가 잘못 붙지 않게) */
export const matchRegions = (rawText, { addressOnly = false } = {}) => {
  const text = String(rawText || '').replace(/\s+/g, ' ').trim();
  if (!text) return [];
  if (!INDEX) INDEX = buildIndex();
  // 주소 모양('경기도 수원시 영통구 광교로 …')이면 시·도 + 시·군·구 마디만 봄(셋째 마디는 '…구'일 때만)
  // — 도로명('서초구 강남대로')이 다른 구로 잡히지 않게
  const tokens = text.split(' ');
  const isAddress = tokens.length >= 2 && SIDO_ALIAS_SET.has(tokens[0]);
  if (addressOnly && !isAddress) return [];
  const compact = (isAddress
    ? [tokens[0], tokens[1], tokens[2] && /구$/.test(tokens[2]) ? tokens[2] : ''].join('')
    : text).replace(/\s/g, '');
  const hints = findSidoHints(compact);

  let rest = compact;
  const picked = [];
  for (const [key, cands] of INDEX) {
    if (!rest.includes(key)) continue;
    const sidos = new Set(cands.map(c => SGG_LIST.find(s => s.code === c.sgg).sido));
    let use = cands;
    if (sidos.size > 1) {
      use = cands.filter(c => hints.has(SGG_LIST.find(s => s.code === c.sgg).sido));
      if (!use.length) continue; // 시·도 없이 애매한 이름은 건너뜀
    }
    // 시 이름만 나왔으면('수원') 그 시의 구 전부, 구까지 나왔으면 그 구만 — 긴 이름부터 보므로 구가 먼저 잡힘
    use.forEach(c => picked.push({ sgg: c.sgg }));
    rest = rest.split(key).join('·'); // 같은 글자를 짧은 이름으로 다시 잡지 않게
  }

  // '광주': 경기와 같이 나오면 경기 광주시, 아니면 전남광주(시·도만 — findSidoHints가 처리)
  if (rest.includes('광주') && hints.has('41')) picked.push({ sgg: '41610' });

  const merged = mergeRegions(picked.map(p => ({ sgg: p.sgg })));
  const sidoWithSgg = new Set(merged.map(r => r.sido));
  const sidoOnly = [...hints].filter(code => !sidoWithSgg.has(code)).map(sido => ({ sido }));
  return mergeRegions(merged, sidoOnly);
};
