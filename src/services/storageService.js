// src/services/storageService.js
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

// 홈 hero 이미지 업로드 (같은 경로로 덮어씀)
export const uploadHeroImage = async (coupleId, file) => {
  const storageRef = ref(storage, `couples/${coupleId}/hero`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};
