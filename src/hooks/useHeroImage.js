import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { ensureBrowserDisplayableImage } from '../utils/imageUtils';

const MAX_IMAGE_SIZE_MB = 10;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

const useHeroImage = (currentHeroImageUrl) => {
  const [pendingHeroFile, setPendingHeroFile] = useState(null);
  const [pendingHeroDelete, setPendingHeroDelete] = useState(false);
  const [heroPreviewUrl, setHeroPreviewUrl] = useState(null);
  const [isProcessingHeroImage, setIsProcessingHeroImage] = useState(false);
  const heroInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (heroPreviewUrl) URL.revokeObjectURL(heroPreviewUrl);
    };
  }, [heroPreviewUrl]);

  const displayHeroUrl = pendingHeroDelete ? null : (heroPreviewUrl || currentHeroImageUrl);
  const hasPending = pendingHeroFile !== null || pendingHeroDelete;

  const handleHeroClick = (disabled = false) => {
    if (!disabled) heroInputRef.current?.click();
  };

  const handleHeroFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`파일 크기는 ${MAX_IMAGE_SIZE_MB}MB 이하여야 합니다.`);
      return;
    }

    if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다. (JPG, PNG, WEBP, GIF)');
      return;
    }

    let displayableFile = file;
    setIsProcessingHeroImage(true);
    try {
      // 아이폰 HEIC 사진은 변환해야 미리보기/표시가 가능 — 다른 포맷은 그대로 통과
      displayableFile = await ensureBrowserDisplayableImage(file);
    } catch (error) {
      toast.error(error.message);
      setIsProcessingHeroImage(false);
      return;
    }
    setIsProcessingHeroImage(false);

    if (heroPreviewUrl) URL.revokeObjectURL(heroPreviewUrl);
    setPendingHeroFile(displayableFile);
    setPendingHeroDelete(false);
    setHeroPreviewUrl(URL.createObjectURL(displayableFile));
  };

  const confirmHeroDelete = () => {
    if (heroPreviewUrl) URL.revokeObjectURL(heroPreviewUrl);
    setHeroPreviewUrl(null);
    setPendingHeroFile(null);
    setPendingHeroDelete(true);
  };

  const resetPending = () => {
    if (heroPreviewUrl) URL.revokeObjectURL(heroPreviewUrl);
    setPendingHeroFile(null);
    setPendingHeroDelete(false);
    setHeroPreviewUrl(null);
  };

  return {
    pendingHeroFile,
    pendingHeroDelete,
    heroPreviewUrl,
    displayHeroUrl,
    hasPending,
    isProcessingHeroImage,
    heroInputRef,
    handleHeroClick,
    handleHeroFileChange,
    confirmHeroDelete,
    resetPending,
  };
};

export default useHeroImage;
