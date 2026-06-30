// src/utils/appLinkUtils.js
/**
 * URL을 모바일 앱 deep link로 변환하는 유틸리티
 * iOS/Android에서 해당 앱을 직접 열 수 있음
 */

export const getAppLink = (url) => {
  if (!url) return url;

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/i.test(userAgent);
    const isAndroid = /android/i.test(userAgent);

    // YouTube
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      if (isIOS || isAndroid) {
        // 유튜브 앱이 있으면 앱으로, 없으면 웹으로 폴백
        const videoId = getYoutubeVideoId(url);
        if (videoId) {
          return `youtube://watch?v=${videoId}`;
        }
      }
      return url;
    }

    // Google Maps
    if (domain.includes('google.com/maps') || domain.includes('maps.google.com')) {
      if (isIOS) {
        // iOS: comgooglemaps:// scheme
        return url.replace('https://maps.google.com', 'comgooglemaps:');
      }
      // Android: geo: intent 또는 maps: intent (웹이 자동으로 처리함)
      return url;
    }

    // Naver Map
    if (domain.includes('map.naver.com')) {
      if (isAndroid) {
        // Android: 네이버 지도 앱
        return `naver://map`;
      }
      // iOS: 웹으로 열기
      return url;
    }

    // Kakao Map
    if (domain.includes('map.kakao.com')) {
      if (isAndroid) {
        // Android: 카카오맵 앱
        return `kakaomap://`;
      }
      // iOS: 웹으로 열기
      return url;
    }

    // Instagram
    if (domain.includes('instagram.com')) {
      // 모바일 웹이 최적화되어 있음 (웹으로 열기)
      return url;
    }

    // Naver
    if (domain.includes('naver.com')) {
      if (isAndroid) {
        return `naver://`;
      }
      return url;
    }

    // Kakao
    if (domain.includes('kakao.com')) {
      if (isAndroid) {
        return `kakao://`;
      }
      return url;
    }

    // Yanolja (여기어때/야놀자)
    if (domain.includes('yanolja.com')) {
      if (isAndroid) {
        // Android: 야놀자 앱
        return `yanolja://`;
      }
      // iOS: 웹으로 열기 (앱 URL scheme이 불안정함)
      return url;
    }

    // 기본: 웹으로 열기
    return url;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return url;
  }
};

/**
 * YouTube URL에서 비디오 ID 추출
 */
const getYoutubeVideoId = (url) => {
  try {
    const urlObj = new URL(url);

    // youtube.com/watch?v=ID
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v');
    }

    // youtu.be/ID
    if (urlObj.hostname.includes('youtu.be')) {
      return urlObj.pathname.slice(1);
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * 링크 클릭 핸들러
 */
export const handleOpenLink = (e, url) => {
  e.preventDefault();
  if (!url) return;

  const appLink = getAppLink(url);
  window.open(appLink, '_blank');
};
