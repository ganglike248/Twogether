// src/services/storageService.js
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { storage, db, functionsInstance } from '../firebase';

// file.type이 비어 있을 경우 파일명으로 content type 추론
const inferContentType = (file) => {
  if (file.type) return file.type;
  const ext = file.name?.split('.').pop()?.toLowerCase();
  const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif' };
  return map[ext] || 'image/jpeg';
};

// ✅ ID Token 갱신 + custom claims 검증
// (Cloud Functions에서 설정한 coupleIds claim을 포함하도록 강제 갱신)
// onCoupleCreate/onCoupleUpdate 트리거가 배포되기 전(v0.4.14 이전)에 이미 만들어진 커플은 claim이
// 아예 없을 수 있음 — 1차 검증에 실패하면 ensureCoupleClaims로 자가 복구를 한 번 시도한 뒤 재검증함.
const refreshAuthTokenWithClaims = async (coupleId) => {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('로그인이 필요합니다.');
  }

  // ID token 갱신 (force=true로 강제)
  let tokenResult = await currentUser.getIdTokenResult(true);
  let coupleIds = tokenResult.claims.coupleIds;

  if (!coupleIds || !coupleIds.includes(coupleId)) {
    try {
      await httpsCallable(functionsInstance, 'ensureCoupleClaims')();
    } catch (error) {
      console.error('[storageService] custom claims 복구 실패:', error);
      throw new Error('이 커플에 접근할 권한이 없습니다. (custom claims 검증 실패)');
    }
    tokenResult = await currentUser.getIdTokenResult(true);
    coupleIds = tokenResult.claims.coupleIds;
  }

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

// 봉인 편지 첨부 이미지 업로드
export const uploadSealedMessageImage = async (coupleId, messageId, file) => {
  await validateCoupleIdAccess(coupleId);
  await refreshAuthTokenWithClaims(coupleId);

  const contentType = inferContentType(file);
  if (!contentType.startsWith('image/')) {
    throw new Error(`지원하지 않는 파일 형식입니다: ${contentType}`);
  }

  const storageRef = ref(storage, `sealedMessages/${coupleId}/${messageId}`);
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

// 봉인 편지 첨부 이미지 삭제 (편지 자체를 삭제할 때 함께 정리)
export const deleteSealedMessageImage = async (coupleId, messageId) => {
  await validateCoupleIdAccess(coupleId);
  await refreshAuthTokenWithClaims(coupleId);

  const storageRef = ref(storage, `sealedMessages/${coupleId}/${messageId}`);
  try {
    await deleteObject(storageRef);
  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      // 사진 없이 작성된 편지일 수 있음 — 무시
      return;
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
