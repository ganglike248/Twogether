// HEIC/HEIF 파일(아이폰 카메라 포맷이 "높은 효율성"일 때 생성됨)은 Firebase Storage 업로드/저장은
// 되지만, 대부분의 브라우저(Chrome, Android WebView 등)가 <img> 태그로 디코딩하지 못해 사진이 안
// 뜨고 alt 텍스트만 보이는 문제가 있음 — 업로드 전에 JPEG로 변환해서 방지.
const HEIC_TYPES = ['image/heic', 'image/heif'];

const isHeicFile = (file) => {
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

// 올리기 전에 사진 줄이기(AUDIT P-2) — 예전엔 원본(최대 10MB)을 그대로 올려 홈 사진이 열 때마다 느리게 떴음.
// 긴 변 maxSide px · JPEG quality로 다시 그림. 이미 작으면(긴 변·용량 모두 기준 이하) 그대로, 결과가 더 크면 원본 유지.
// GIF(움직이는 그림)·SVG는 건드리지 않음. 투명 PNG는 흰 배경으로 채움(홈·편지 사진은 사진이 대부분).
const SKIP_TYPES = ['image/gif', 'image/svg+xml'];

const loadBitmap = async (file) => {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* 아래 <img>로 */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const shrinkImageForUpload = async (file, { maxSide = 1600, quality = 0.82, keepUnder = 600 * 1024 } = {}) => {
  if (!file || SKIP_TYPES.includes(file.type)) return file;
  try {
    const bitmap = await loadBitmap(file);
    const w = bitmap.width; const h = bitmap.height;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    if (scale === 1 && file.size <= keepUnder) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if (typeof bitmap.close === 'function') bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    const name = (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch (error) {
    console.warn('[imageUtils] 사진 줄이기 실패 — 원본으로 올림:', error);
    return file;
  }
};
