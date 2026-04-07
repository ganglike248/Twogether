// src/services/storageService.js
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

// 홈 hero 이미지 업로드 (같은 경로로 덮어씀)
export const uploadHeroImage = async (coupleId, file) => {
  const storageRef = ref(storage, `couples/${coupleId}/hero`);
  const metadata = { contentType: file.type };
  await uploadBytes(storageRef, file, metadata);
  return getDownloadURL(storageRef);
};

// 홈 hero 이미지 삭제
export const removeHeroImage = async (coupleId) => {
  const storageRef = ref(storage, `couples/${coupleId}/hero`);
  try {
    await deleteObject(storageRef);
  } catch {
    // 파일이 없어도 무시 (이미 삭제됐거나 미존재)
  }
};
