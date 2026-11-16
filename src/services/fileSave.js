// src/services/fileSave.js (텍스트 saveTextFile · 이미지 saveImageFile)
// 텍스트 파일(백업 JSON, 기록 HTML) 저장 — 웹은 브라우저 다운로드, 네이티브 앱은 캐시 폴더에 쓴 뒤 공유 창.
// Capacitor 웹뷰는 <a download>/Blob 다운로드를 처리하지 못해서(아무 반응 없음) 네이티브는 반드시 이 경로로.
// 공유 창에서 "파일에 저장"(iOS)·"내 파일/드라이브"(안드로이드)나 메신저 보내기를 고를 수 있음.
// 안드로이드 공유는 AndroidManifest의 FileProvider + res/xml/file_paths.xml의 cache-path가 필요(이미 있음).
import { Capacitor } from '@capacitor/core';

const downloadInBrowser = (content, fileName, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 클릭 직후 바로 revoke하면 일부 브라우저(Safari)에서 다운로드가 시작되기 전에 URL이 사라짐
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

/**
 * @returns {Promise<{ saved: boolean, cancelled?: boolean }>} 공유 창에서 사용자가 취소하면 cancelled
 */
export const saveTextFile = async ({ fileName, content, mimeType = 'text/plain' }) => {
  if (!Capacitor.isNativePlatform()) {
    downloadInBrowser(content, fileName, `${mimeType};charset=utf-8`);
    return { saved: true };
  }

  // 웹 번들에서는 쓰지 않으니 필요할 때만 불러옴
  const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);
  const { uri } = await Filesystem.writeFile({
    path: fileName,
    data: content,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  try {
    await Share.share({ title: fileName, files: [uri] });
    return { saved: true };
  } catch (error) {
    // 공유 창을 그냥 닫으면 플러그인이 "Share canceled"로 reject함 — 오류가 아니라 취소
    if (/cancel/i.test(error?.message || '')) return { saved: false, cancelled: true };
    throw error;
  }
};

/**
 * PNG 이미지 저장(월간 요약·연말 랩업) — 네이티브는 캐시에 쓴 뒤 공유 창(사진에 저장/메신저 보내기),
 * 모바일 웹은 Web Share(파일 공유 지원 시), 그 외는 다운로드.
 * @param {{ fileName: string, dataUrl: string }} p dataUrl은 'data:image/png;base64,...'
 * @returns {Promise<{ saved: boolean, cancelled?: boolean }>}
 */
export const saveImageFile = async ({ fileName, dataUrl }) => {
  const isCancel = (error) => error?.name === 'AbortError' || /cancel/i.test(error?.message || '');

  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const { uri } = await Filesystem.writeFile({ path: fileName, data: dataUrl.split(',')[1], directory: Directory.Cache });
    try {
      await Share.share({ title: fileName, files: [uri] });
      return { saved: true };
    } catch (error) {
      if (isCancel(error)) return { saved: false, cancelled: true };
      throw error;
    }
  }

  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], fileName, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return { saved: true };
    } catch (error) {
      if (isCancel(error)) return { saved: false, cancelled: true };
      // 이미지 만드는 사이 사용자 동작 유효 시간이 지나면 NotAllowedError — 다운로드로 대체
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { saved: true };
};
