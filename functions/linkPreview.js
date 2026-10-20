// 링크 미리보기(제목/대표 사진/설명) 추출 — 여행 '선택 사항' 후보 추가 모달의 "정보 불러오기"용.
//
// 사용자가 입력한 임의 URL을 서버가 대신 fetch하는 기능이라 SSRF 방어가 핵심:
// - http/https + 기본 포트(80/443)만 허용
// - 실제로 소켓을 여는 시점의 IP(커스텀 lookup)를 검사해서 사설/루프백/링크로컬/메타데이터 대역 차단
//   → DNS 조회 후 IP를 바꿔치기하는 DNS rebinding도 연결 단계에서 걸러짐
// - 리다이렉트는 자동 추적하지 않고 직접 따라가며 매 hop마다 위 검사를 다시 적용(최대 MAX_REDIRECTS)
// - 요청당 타임아웃 + 전체 데드라인 + 응답 크기 상한 + HTML 응답만 처리
//
// 네이버지도는 map.naver.com 페이지에 공통 지도 이미지 OG 태그밖에 없어서, 장소 ID를 꺼내
// m.place.naver.com 모바일 장소 페이지로 바꿔 열고 그 안의 __APOLLO_STATE__(페이지 내부 데이터)에서
// 영업시간/주소/전화 등을 추가로 읽음. 공식 API가 아니라 네이버가 구조를 바꾸면 깨질 수 있으므로
// 실패 시 OG 태그 결과로 조용히 폴백함.

const axios = require('axios');
const cheerio = require('cheerio');
const dns = require('dns');
const net = require('net');
const http = require('http');
const https = require('https');

const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 5000;
const TOTAL_DEADLINE_MS = 9000;
const MAX_BODY_BYTES = 1.5 * 1024 * 1024;
const MAX_INPUT_LENGTH = 2000;

const USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// ===== SSRF 방어: 차단 IP 대역 =====
const blockList = new net.BlockList();
[
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
].forEach(([addr, prefix]) => blockList.addSubnet(addr, prefix, 'ipv4'));
[
  ['::', 128], ['::1', 128], ['64:ff9b::', 96], ['100::', 64], ['2001:db8::', 32],
  ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
].forEach(([addr, prefix]) => blockList.addSubnet(addr, prefix, 'ipv6'));

const isBlockedIp = (ip) => {
  const family = net.isIP(ip);
  if (family === 4) return blockList.check(ip, 'ipv4');
  if (family === 6) {
    // IPv4-mapped IPv6(::ffff:127.0.0.1)는 IPv4로 풀어서 검사
    const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (mapped) return blockList.check(mapped[1], 'ipv4');
    return blockList.check(ip, 'ipv6');
  }
  return true;
};

class BlockedTargetError extends Error {}

// 소켓 연결 직전에 호출되는 lookup — 여기서 걸러야 DNS rebinding까지 막힘
const safeLookup = (hostname, options, callback) => {
  const opts = typeof options === 'object' ? options : { family: options };
  dns.lookup(hostname, { ...opts, all: true }, (err, addresses) => {
    if (err) return callback(err);
    if (!addresses.length || addresses.some(a => isBlockedIp(a.address))) {
      return callback(new BlockedTargetError(`blocked address for ${hostname}`));
    }
    if (opts.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
};

const httpAgent = new http.Agent({ lookup: safeLookup });
const httpsAgent = new https.Agent({ lookup: safeLookup });

// URL 자체 검증 — IP 리터럴 호스트는 lookup을 안 거치므로 여기서 직접 검사
const assertSafeUrl = (urlStr) => {
  let u;
  try { u = new URL(urlStr); } catch { throw new BlockedTargetError('invalid url'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new BlockedTargetError('protocol');
  if (u.username || u.password) throw new BlockedTargetError('credentials');
  if (u.port && !['80', '443'].includes(u.port)) throw new BlockedTargetError('port');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && isBlockedIp(host)) throw new BlockedTargetError('ip literal');
  if (/^(localhost|metadata(\.google\.internal)?)$/i.test(host) || host.endsWith('.internal') || host.endsWith('.local')) {
    throw new BlockedTargetError('internal host');
  }
  return u;
};

// ===== fetch (리다이렉트 수동 추적) =====
const decodeBody = (buffer, contentType) => {
  let charset = (contentType.match(/charset=([^;]+)/i) || [])[1];
  if (!charset) {
    const head = buffer.subarray(0, 2048).toString('latin1');
    charset = (head.match(/<meta[^>]+charset=["']?([\w-]+)/i) || [])[1];
  }
  try {
    return new TextDecoder((charset || 'utf-8').trim().toLowerCase()).decode(buffer);
  } catch {
    return new TextDecoder('utf-8').decode(buffer);
  }
};

const fetchHtml = async (startUrl, deadline) => {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertSafeUrl(current);
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('deadline exceeded');

    let res;
    try {
      res = await axios.get(current, {
      httpAgent,
      httpsAgent,
      maxRedirects: 0,
      proxy: false,
      timeout: Math.min(REQUEST_TIMEOUT_MS, remaining),
      maxContentLength: MAX_BODY_BYTES,
      responseType: 'arraybuffer',
      decompress: true,
      validateStatus: () => true,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.6',
        },
      });
    } catch (e) {
      // safeLookup이 막은 경우 axios가 감싸서 던지므로 원래 차단 에러로 풀어줌
      if (e.cause instanceof BlockedTargetError) throw e.cause;
      throw e;
    }

    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      current = new URL(res.headers.location, current).toString();
      continue;
    }
    if (res.status >= 400) throw new Error(`http ${res.status}`);

    const contentType = String(res.headers['content-type'] || '');
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) throw new Error('not html');

    return { finalUrl: current, html: decodeBody(Buffer.from(res.data), contentType) };
  }
  throw new Error('too many redirects');
};

// ===== 범용 OG 태그 파싱 =====
const SITE_SUFFIX_RE =
  /\s+[-|:·]\s+[^-|:·]*(여기어때|야놀자|네이버|NAVER|카카오|Kakao|에어비앤비|Airbnb|트립닷컴|Trip\.com|아고다|Agoda|호텔스닷컴|Hotels\.com|Booking\.com|인터파크|마이리얼트립|클룩|Klook)[^-|:·]*$/i;

const cleanTitle = (title, siteName) => {
  let t = (title || '').replace(/\s+/g, ' ').trim();
  if (siteName) {
    const escaped = siteName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    t = t.replace(new RegExp(`\\s+[-|:·]\\s+${escaped}.*$`, 'i'), '');
  }
  return t.replace(SITE_SUFFIX_RE, '').trim();
};

const parseOg = (html, baseUrl) => {
  const $ = cheerio.load(html);
  const meta = (...keys) => {
    for (const key of keys) {
      const v = $(`meta[property="${key}"]`).attr('content') || $(`meta[name="${key}"]`).attr('content');
      if (v && v.trim()) return v.trim();
    }
    return '';
  };
  const siteName = meta('og:site_name');
  const title = cleanTitle(meta('og:title', 'twitter:title') || $('title').first().text(), siteName);
  const description = meta('og:description', 'twitter:description', 'description');

  let imageUrl = meta('og:image:secure_url', 'og:image', 'twitter:image');
  if (imageUrl) {
    try {
      const resolved = new URL(imageUrl, baseUrl);
      imageUrl = ['http:', 'https:'].includes(resolved.protocol) ? resolved.toString() : '';
    } catch { imageUrl = ''; }
  }
  return { title, description, imageUrl };
};

// ===== 네이버 장소 전용 보강 =====
const NAVER_HOST_RE = /(^|\.)(map\.naver\.com|place\.naver\.com|m\.place\.naver\.com|pcmap\.place\.naver\.com)$/i;

const getNaverPlaceId = (urlStr) => {
  try {
    const u = new URL(urlStr);
    if (!NAVER_HOST_RE.test(u.hostname)) return null;
    const m = u.pathname.match(/\/place\/(\d+)/) || u.pathname.match(/^\/[a-z]+\/(\d+)/i);
    if (m) return m[1];
    // 모바일 UA로 naver.me를 열면 m.map.naver.com/appLink.naver?pinId=...&pinType=site 로 리다이렉트됨
    const pinId = u.searchParams.get('pinId');
    if (pinId && /^\d+$/.test(pinId) && (u.searchParams.get('pinType') || 'site') === 'site') return pinId;
    return null;
  } catch {
    return null;
  }
};

// window.__APOLLO_STATE__ = {...}; 의 JSON 부분만 괄호 짝을 맞춰 잘라냄(문자열 안 괄호는 무시)
const extractApolloState = (html) => {
  const marker = html.indexOf('window.__APOLLO_STATE__');
  if (marker < 0) return null;
  const start = html.indexOf('{', marker);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) {
      try { return JSON.parse(html.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
};

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

// 같은 내용인 요일끼리 묶어서 "월~토 11:00–21:00 (라스트오더 20:00)" 형태로 요약
const formatBusinessHours = (newBusinessHours) => {
  const lines = [];
  (newBusinessHours || []).forEach((group) => {
    const perDay = [];
    (group.businessHours || []).forEach((d) => {
      const day = (d.day || '').replace(/\(.*?\)/g, '').trim();
      let text;
      if (d.businessHours?.start && d.businessHours?.end) {
        text = `${d.businessHours.start}–${d.businessHours.end}`;
        const breaks = (d.breakHours || []).filter(b => b?.start && b?.end).map(b => `${b.start}–${b.end}`);
        if (breaks.length) text += ` (브레이크 ${breaks.join(', ')})`;
        const lastOrder = (d.lastOrderTimes || []).find(l => l?.time)?.time;
        if (lastOrder) text += ` (라스트오더 ${lastOrder})`;
        if (d.description) text += ` ${d.description}`;
      } else {
        text = d.description || '휴무';
      }
      perDay.push({ day, text });
    });

    const order = (day) => {
      const idx = WEEKDAYS.indexOf(day);
      return idx < 0 ? 99 : idx;
    };
    perDay.sort((a, b) => order(a.day) - order(b.day));

    const byText = new Map();
    perDay.forEach(({ day, text }) => {
      if (!byText.has(text)) byText.set(text, []);
      byText.get(text).push(day);
    });

    const prefix = group.name ? `[${group.name}] ` : '';
    byText.forEach((days, text) => {
      const idxs = days.map(order);
      const isRun = idxs.every(i => i < 99) && idxs.length >= 3 && idxs[idxs.length - 1] - idxs[0] === idxs.length - 1;
      const label = days.length === 7 && isRun ? '매일' : isRun ? `${days[0]}~${days[days.length - 1]}` : days.join(', ');
      lines.push(`${prefix}${label} ${text}`.trim());
    });
  });
  return lines;
};

const buildNaverDetails = (state, placeId) => {
  const base = state[`PlaceDetailBase:${placeId}`];
  if (!base) return null;
  const root = state.ROOT_QUERY || {};
  const detailKey = Object.keys(root).find(k => k.startsWith('placeDetail(') && k.includes(`"${placeId}"`));
  const detail = detailKey ? root[detailKey] : {};

  const parts = [];
  const headline = [base.category, base.microReviews?.[0]].filter(Boolean).join(' · ');
  if (headline) parts.push(headline);

  const hours = formatBusinessHours(detail.newBusinessHours);
  if (hours.length) parts.push(`영업시간\n${hours.join('\n')}`);

  const phone = base.phone || base.virtualPhone;
  if (phone) parts.push(`전화 ${phone}`);
  if (base.conveniences?.length) parts.push(`편의 ${base.conveniences.join(', ')}`);

  const reviews = [
    base.visitorReviewsTotal ? `방문자리뷰 ${base.visitorReviewsTotal.toLocaleString()}` : '',
    base.cafeBlogReviewsTotal ? `블로그리뷰 ${base.cafeBlogReviewsTotal.toLocaleString()}` : '',
  ].filter(Boolean).join(' · ');
  if (reviews) parts.push(reviews);

  // 업체가 직접 등록한 소개글(없는 업체가 많음)
  if (typeof detail.description === 'string' && detail.description.trim()) {
    parts.push(`\n${detail.description.trim()}`);
  }

  return {
    title: (base.name || '').trim(),
    address: (base.roadAddress || base.address || '').trim(),
    description: parts.join('\n'),
  };
};

// ===== 진입점 =====
const extractFirstUrl = (text) => {
  const m = String(text || '').match(/https?:\/\/[^\s<>"'`]+/i);
  return m ? m[0].replace(/[),.\]}>]+$/, '') : null;
};

const fetchLinkPreview = async (input) => {
  if (typeof input !== 'string' || input.length > MAX_INPUT_LENGTH) throw new BlockedTargetError('input');
  const startUrl = extractFirstUrl(input);
  if (!startUrl) throw new BlockedTargetError('no url');

  const deadline = Date.now() + TOTAL_DEADLINE_MS;
  let { finalUrl, html } = await fetchHtml(startUrl, deadline);

  const placeId = getNaverPlaceId(finalUrl);
  if (placeId && !/m\.place\.naver\.com/i.test(new URL(finalUrl).hostname)) {
    ({ finalUrl, html } = await fetchHtml(`https://m.place.naver.com/place/${placeId}/home`, deadline));
  }

  const og = parseOg(html, finalUrl);
  const result = { title: og.title, description: og.description, imageUrl: og.imageUrl, address: '', finalUrl };

  if (placeId) {
    try {
      const state = extractApolloState(html);
      const naver = state && buildNaverDetails(state, placeId);
      if (naver) {
        result.title = naver.title || result.title;
        result.address = naver.address;
        result.description = naver.description || result.description;
      }
    } catch (e) {
      console.warn('[fetchLinkPreview] 네이버 장소 데이터 파싱 실패, OG로 폴백:', e.message);
    }
  }

  return result;
};

module.exports = { fetchLinkPreview, BlockedTargetError, isBlockedIp, assertSafeUrl, formatBusinessHours };
