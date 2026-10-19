// HEIC/HEIF 파일(아이폰 카메라 포맷이 "높은 효율성"일 때 생성됨)은 Firebase Storage 업로드/저장은
// 되지만, 대부분의 브라우저(Chrome, Android WebView 등)가 <img> 태그로 디코딩하지 못해 사진이 안
// 뜨고 alt 텍스트만 보이는 문제가 있음 — 업로드 전에 JPEG로 변환해서 방지.
const HEIC_TYPES = ['image/heic', 'image/heif'];

export const isHeicFile = (file) => {
  if (!file) return false;
  if (file.type && HEIC_TYPES.includes(file.type)) return true;
  const name = file.name?.toLowerCase() || '';
  return name.endsWith('.heic') || name.endsWith('.heif');
};

// 브라우저가 바로 표시할 수 있는 이미지로 변환(HEIC/HEIF가 아니면 원본 그대로 반환)
export const ensureBrowserDisplayableImage = async (file) => {
  if (!isHeicFile(file)) return file;

  const heic2any = (await import('heic2any')).default;
  try {
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    const blob = Array.isArray(result) ? result[0] : result;
    const newName = (file.name || 'photo').replace(/\.(heic|heif)$/i, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg' });
  } catch (error) {
    console.error('[imageUtils] HEIC 변환 실패:', error);
    throw new Error('이 사진 형식은 지원되지 않습니다. 다른 사진을 선택해주세요.');
  }
};
