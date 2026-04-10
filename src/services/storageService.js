// src/services/storageService.js
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

// file.type이 비어 있을 경우 파일명으로 content type 추론
const inferContentType = (file) => {
  if (file.type) return file.type;
  const ext = file.name?.split('.').pop()?.toLowerCase();
  const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif' };
  return map[ext] || 'image/jpeg';
};

// 홈 hero 이미지 업로드 (같은 경로로 덮어씀)
export const uploadHeroImage = async (coupleId, file) => {
  const contentType = inferContentType(file);
  if (!contentType.startsWith('image/')) {
    throw new Error(`지원하지 않는 파일 형식입니다: ${contentType}`);
  }
  const storageRef = ref(storage, `couples/${coupleId}/hero`);
  const metadata = { contentType };
  const snapshot = await uploadBytes(storageRef, file, metadata);
  if (!snapshot?.ref) throw new Error('업로드 응답이 올바르지 않습니다.');
  return getDownloadURL(snapshot.ref);
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
