// src/services/linkPreviewService.js
// 링크 → 제목/대표 사진/설명/주소 추출 (Cloud Function `fetchLinkPreview` 호출)
// 서버가 대신 페이지를 열어서 OG 태그(+네이버 장소는 영업시간 등)를 읽어옴 — functions/linkPreview.js 참고
import { httpsCallable } from 'firebase/functions';
import { functionsInstance } from '../firebase';

/**
 * @param {string} url 링크(또는 링크가 포함된 텍스트)
 * @returns {Promise<{ title: string, description: string, imageUrl: string, address: string, finalUrl: string }>}
 */
export const fetchLinkPreview = async (url) => {
  const result = await httpsCallable(functionsInstance, 'fetchLinkPreview')({ url });
  return result.data;
};
