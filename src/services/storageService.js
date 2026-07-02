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

// ✅ ID Token 갱신 + custom claims 검증
// (Cloud Functions에서 설정한 coupleIds claim을 포함하도록 강제 갱신)
const refreshAuthTokenWithClaims = async (coupleId) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('로그인이 필요합니다.');
  }

  // ID token 갱신 (force=true로 강제)
  const tokenResult = await currentUser.getIdTokenResult(true);
  const coupleIds = tokenResult.claims.coupleIds;

  if (!coupleIds || !coupleIds.includes(coupleId)) {
    throw new Error('이 커플에 접근할 권한이 없습니다. (custom claims 검증 실패)');
  }
};

// 현재 사용자의 coupleId 검증 (클라이언트 단계)
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
  // 1. 클라이언트 접근 권한 검증
  await validateCoupleIdAccess(coupleId);

  // 2. ✅ ID Token 갱신 및 custom claims 검증
  await refreshAuthTokenWithClaims(coupleId);

  // 3. 파일 검증
  const contentType = inferContentType(file);
  if (!contentType.startsWith('image/')) {
    throw new Error(`지원하지 않는 파일 형식입니다: ${contentType}`);
  }

  // 4. 업로드 (Storage Rules에서 custom claims 재검증)
  const storageRef = ref(storage, `couples/${coupleId}/hero`);
  const metadata = { contentType };
  try {
    const snapshot = await uploadBytes(storageRef, file, metadata);
    if (!snapshot?.ref) throw new Error('업로드 응답이 올바르지 않습니다.');
    return getDownloadURL(snapshot.ref);
  } catch (error) {
    if (error.code === 'storage/unauthorized') {
      throw new Error('Storage Rules에서 접근을 거부했습니다. (관리자 지원 필요)');
    }
    throw error;
  }
};

// 홈 hero 이미지 삭제
export const removeHeroImage = async (coupleId) => {
  // 1. 클라이언트 접근 권한 검증
  await validateCoupleIdAccess(coupleId);

  // 2. ✅ ID Token 갱신 및 custom claims 검증
  await refreshAuthTokenWithClaims(coupleId);

  // 3. 삭제 (Storage Rules에서 custom claims 재검증)
  const storageRef = ref(storage, `couples/${coupleId}/hero`);
  try {
    await deleteObject(storageRef);
  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      // 파일이 없어도 무시 (이미 삭제됐거나 미존재)
      return;
    }
    if (error.code === 'storage/unauthorized') {
      throw new Error('Storage Rules에서 접근을 거부했습니다. (관리자 지원 필요)');
    }
    throw error;
  }
};
