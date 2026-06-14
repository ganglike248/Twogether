import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

const MAX_IMAGE_SIZE_MB = 10;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

const useHeroImage = (currentHeroImageUrl) => {
  const [pendingHeroFile, setPendingHeroFile] = useState(null);
  const [pendingHeroDelete, setPendingHeroDelete] = useState(false);
  const [heroPreviewUrl, setHeroPreviewUrl] = useState(null);
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

  const handleHeroFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`파일 크기는 ${MAX_IMAGE_SIZE_MB}MB 이하여야 합니다.`);
      e.target.value = '';
      return;
    }

    if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다. (JPG, PNG, WEBP, GIF)');
      e.target.value = '';
      return;
    }

    if (heroPreviewUrl) URL.revokeObjectURL(heroPreviewUrl);
    setPendingHeroFile(file);
    setPendingHeroDelete(false);
    setHeroPreviewUrl(URL.createObjectURL(file));
    e.target.value = '';
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
    heroInputRef,
    handleHeroClick,
    handleHeroFileChange,
    confirmHeroDelete,
    resetPending,
  };
};

export default useHeroImage;
