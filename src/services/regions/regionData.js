// src/services/regions/regionData.js
// 행정구역 목록(시·도 16 · 시·군·구 256, 2026-10 기준 — 광주·전남은 전남광주통합특별시로 통합) + 여행 지역 다루는 도우미.
// 원자료: 통계청 SGIS 행정동 경계(공공누리 1유형) → vuski/admdongkor(CC BY 4.0). 지도 화면에 출처 표시 필수.
//
// 여행 지역 저장 모양: trips.regions = [{ sido: '51', sgg: '51210' }, { sido: '41' } ...]
//  - 시·군·구까지 알면 sgg, 시·도만 알면 sido만. 같은 시·도에 sgg가 생기면 sido만 있던 항목은 지움(mergeRegions)
//  - '수원시 장안구'처럼 구가 있는 시는 구 단위로 저장하고, 화면에선 시 하나로 묶어 보여줌(groupRegions)
import data from './koreaRegions.json';

export const REGION_SOURCE = data.source;

// 화면용 짧은 이름 + 글자에서 시·도를 알아볼 별칭(긴 것부터 검사)
const SIDO_META = {
  11: { short: '서울', aliases: ['서울특별시', '서울시', '서울'] },
  12: { short: '전남광주', aliases: ['전남광주통합특별시', '전남광주', '전라남도', '광주광역시', '전남'] }, // '광주'는 경기 광주시와 겹쳐 따로 처리
  26: { short: '부산', aliases: ['부산광역시', '부산시', '부산'] },
  27: { short: '대구', aliases: ['대구광역시', '대구시', '대구'] },
  28: { short: '인천', aliases: ['인천광역시', '인천시', '인천'] },
  30: { short: '대전', aliases: ['대전광역시', '대전시', '대전'] },
  31: { short: '울산', aliases: ['울산광역시', '울산시', '울산'] },
  36: { short: '세종', aliases: ['세종특별자치시', '세종시', '세종'] },
  41: { short: '경기', aliases: ['경기도', '경기'] },
  43: { short: '충북', aliases: ['충청북도', '충북'] },
  44: { short: '충남', aliases: ['충청남도', '충남'] },
  47: { short: '경북', aliases: ['경상북도', '경북'] },
  48: { short: '경남', aliases: ['경상남도', '경남'] },
  50: { short: '제주', aliases: ['제주특별자치도', '제주도', '제주'] },
  51: { short: '강원', aliases: ['강원특별자치도', '강원도', '강원'] },
  52: { short: '전북', aliases: ['전북특별자치도', '전라북도', '전북'] },
};

// '수원시장안구' → { city: '수원시', gu: '장안구' } / '속초시' → { city: '속초시', gu: null }
const splitName = (raw) => {
  const m = /^(.+?시)(.+구)$/.exec(raw);
  return m ? { city: m[1], gu: m[2] } : { city: raw, gu: null };
};

export const SIDO_LIST = data.sido.map(([code, name]) => ({
  code, name, short: SIDO_META[code]?.short || name, aliases: SIDO_META[code]?.aliases || [name],
}));
export const SIDO_BY_CODE = Object.fromEntries(SIDO_LIST.map(s => [s.code, s]));

export const SGG_LIST = data.sgg.map(([code, sido, raw]) => {
  const { city, gu } = splitName(raw);
  return { code, sido, raw, city, gu, name: gu ? `${city} ${gu}` : city };
});
export const SGG_BY_CODE = Object.fromEntries(SGG_LIST.map(s => [s.code, s]));

/** 시·도 안의 고를 단위 — 구가 있는 시는 시 하나로 묶음: [{ key, label, codes: [...] }] */
export const getSggChoices = (sidoCode) => {
  const map = new Map();
  SGG_LIST.filter(s => s.sido === sidoCode).forEach(s => {
    const key = `${sidoCode}:${s.city}`;
    if (!map.has(key)) map.set(key, { key, label: s.city, codes: [] });
    map.get(key).codes.push(s.code);
  });
  return [...map.values()];
};

/** 중복·포함 관계 정리: 같은 sgg 한 번만, sgg가 있는 시·도의 'sido만' 항목은 제거, 시·군·구가 하나뿐인 시·도(세종)는 sgg로 */
export const mergeRegions = (...lists) => {
  const sggSet = new Set();
  const sidoOnly = new Set();
  lists.flat().filter(Boolean).forEach(r => {
    if (r.sgg && SGG_BY_CODE[r.sgg]) sggSet.add(r.sgg);
    else if (r.sido && SIDO_BY_CODE[r.sido]) sidoOnly.add(r.sido);
  });
  sidoOnly.forEach(code => {
    const only = SGG_LIST.filter(s => s.sido === code);
    if (only.length === 1) { sggSet.add(only[0].code); sidoOnly.delete(code); }
  });
  const sidoWithSgg = new Set([...sggSet].map(c => SGG_BY_CODE[c].sido));
  return [
    ...[...sggSet].sort().map(sgg => ({ sido: SGG_BY_CODE[sgg].sido, sgg })),
    ...[...sidoOnly].filter(c => !sidoWithSgg.has(c)).sort().map(sido => ({ sido })),
  ];
};

/** 화면용 묶음: [{ key, sido, label('강원 · 속초시' 또는 '강원'), codes }] — 구 있는 시는 하나로 */
export const groupRegions = (regions = []) => {
  const map = new Map();
  regions.forEach(r => {
    if (r.sgg && SGG_BY_CODE[r.sgg]) {
      const s = SGG_BY_CODE[r.sgg];
      const key = `${s.sido}:${s.city}`;
      if (!map.has(key)) map.set(key, { key, sido: s.sido, label: s.city, sidoShort: SIDO_BY_CODE[s.sido]?.short, codes: [] });
      map.get(key).codes.push(s.code);
    } else if (r.sido && SIDO_BY_CODE[r.sido]) {
      map.set(r.sido, { key: r.sido, sido: r.sido, label: SIDO_BY_CODE[r.sido].short, sidoShort: SIDO_BY_CODE[r.sido].short, codes: [] });
    }
  });
  return [...map.values()];
};

/** 묶음 하나(groupRegions 항목)를 저장 모양으로 되돌림 */
export const groupToRegions = (g) => (g.codes.length ? g.codes.map(sgg => ({ sido: g.sido, sgg })) : [{ sido: g.sido }]);

/** 짧은 요약 문구: '강원 · 강릉시 · 속초시' */
export const describeRegions = (regions = []) => {
  const groups = groupRegions(regions);
  if (!groups.length) return '';
  const sidos = [...new Set(groups.map(g => g.sidoShort))];
  const places = groups.filter(g => g.codes.length).map(g => g.label);
  return [...sidos, ...places].join(' · ');
};

export { SIDO_META };
