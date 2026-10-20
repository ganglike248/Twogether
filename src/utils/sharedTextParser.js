// src/utils/sharedTextParser.js
// 지도/숙소 앱의 "공유하기"로 복사된 텍스트를 후보 입력 칸(제목/주소/링크)으로 나눔.
// 여행 '선택 사항'의 "새로운 옵션 추가" 모달 붙여넣기 핸들러에서 사용.
//
// 지원 형태(줄 단위로 구분돼서 옴):
//   네이버지도:  [네이버지도]\n상호명\n주소\nhttps://naver.me/...
//   그 밖의 앱:  [여기어때] 호텔명 (★9.5)\n홍보 문구\nhttps://...
//   링크만:      https://naver.me/...
import { extractUrl } from './appLinkUtils';

const NAVER_MAP_TAG_RE = /^\[?\s*네이버\s*지도\s*\]\s*/;
// "[여기어때] ", "여기어때] " 처럼 앞 대괄호가 빠진 채 복사되는 경우까지 처리
const SITE_TAG_RE = /^\[?[^[\]\n]{1,20}\]\s*/;
// 제목 끝의 평점 표기 "(★9.5)", "★4.8"
const RATING_RE = /\s*\(?★\s*[\d.]+\)?\s*$/;

const cleanTitle = (line) => line.replace(SITE_TAG_RE, '').replace(RATING_RE, '').trim();

/**
 * @returns {null | { url: string, title: string, address: string }}
 *   알아볼 수 있는 공유 텍스트가 아니면 null(→ 호출부는 기본 붙여넣기 동작 유지)
 */
export const parseSharedText = (text) => {
  const raw = (text || '').trim();
  if (!raw) return null;

  const url = extractUrl(raw) || '';
  const lines = raw
    .split(/\r?\n/)
    .map(l => (url ? l.replace(url, '') : l).trim())
    .filter(Boolean);

  // 링크만 붙여넣은 경우
  if (url && lines.length === 0) return { url, title: '', address: '' };

  // 네이버지도: 태그 줄(또는 태그로 시작하는 줄) 다음이 상호명, 그다음이 주소
  if (lines.length && NAVER_MAP_TAG_RE.test(lines[0])) {
    const rest = [lines[0].replace(NAVER_MAP_TAG_RE, ''), ...lines.slice(1)].filter(Boolean);
    return { url, title: rest[0] || '', address: rest[1] || '' };
  }

  // 그 밖의 "[사이트] 제목" 공유 문구 — 링크가 같이 있을 때만 공유 문구로 판단
  // (링크 없는 일반 텍스트까지 가로채면 평소 붙여넣기가 이상하게 동작함)
  if (url && lines.length) {
    return { url, title: cleanTitle(lines[0]), address: '' };
  }

  return null;
};
