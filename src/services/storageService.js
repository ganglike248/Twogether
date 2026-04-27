// src/services/storageService.js
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { storage, db } from '../firebase';

// file.type이 비어 있을 경우 파일명으로 content type 추론
const inferContentType = (file) => {
  if (file.type) return file.type;
  const ext = file.name?.split('.').pop()?.toLowerCase();
  const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif' };
  return map[ext] || 'image/jpeg';
};

// 현재 사용자의 coupleId 검증
const validateCoupleIdAccess = async (coupleId) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('로그인이 필요합니다.');
  }

  if (!coupleId) {
    throw new Error('커플 정보가 없습니다.');
  }

  const userDocRef = doc(db, 'users', currentUser.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    throw new Error('사용자 정보를 찾을 수 없습니다.');
  }

  const userCoupleId = userDocSnap.data().coupleId;
  if (userCoupleId !== coupleId) {
    throw new Error('권한이 없습니다: 다른 커플의 리소스에 접근할 수 없습니다.');
  }
};

// 홈 hero 이미지 업로드 (같은 경로로 덮어씀)
export const uploadHeroImage = async (coupleId, file) => {
  // 1. 접근 권한 검증
  await validateCoupleIdAccess(coupleId);

  // 2. 파일 검증
  const contentType = inferContentType(file);
  if (!contentType.startsWith('image/')) {
    throw new Error(`지원하지 않는 파일 형식입니다: ${contentType}`);
  }

  // 3. 업로드
  const storageRef = ref(storage, `couples/${coupleId}/hero`);
  const metadata = { contentType };
  const snapshot = await uploadBytes(storageRef, file, metadata);
  if (!snapshot?.ref) throw new Error('업로드 응답이 올바르지 않습니다.');
  return getDownloadURL(snapshot.ref);
};

// 홈 hero 이미지 삭제
export const removeHeroImage = async (coupleId) => {
  // 1. 접근 권한 검증
  await validateCoupleIdAccess(coupleId);

  // 2. 삭제
  const storageRef = ref(storage, `couples/${coupleId}/hero`);
  try {
    await deleteObject(storageRef);
  } catch {
    // 파일이 없어도 무시 (이미 삭제됐거나 미존재)
  }
};
