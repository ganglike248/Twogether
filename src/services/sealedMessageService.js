// src/services/sealedMessageService.js
// 봉인 편지함 — 제목/봉인상태는 sealedMessages/{id}에, 실제 내용은 private/content 서브문서에
// 분리 저장함(firestore.rules 참고: 봉인 중엔 서버 단에서 진짜로 읽기가 막힘).
import {
  doc,
  collection,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { uploadSealedMessageImage, deleteSealedMessageImage } from './storageService';

// 새 편지 생성 — unlockAt(Date, 선택)을 넘기면 예약 공개, 안 넘기면 작성자가 나중에 직접 공개할 때까지 무기한 봉인
export const createSealedMessage = async ({ coupleId, authorUid, recipientUid, title, content, imageFile, unlockAt }) => {
  const messageRef = doc(collection(db, 'sealedMessages'));

  let imageUrl = null;
  if (imageFile) {
    imageUrl = await uploadSealedMessageImage(coupleId, messageRef.id, imageFile);
  }

  await setDoc(messageRef, {
    coupleId,
    authorUid,
    recipientUid,
    title,
    unlockAt: unlockAt ? Timestamp.fromDate(unlockAt) : null,
    isUnlocked: false,
    unlockedAt: null,
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'sealedMessages', messageRef.id, 'private', 'content'), {
    content,
    imageUrl,
  });

  return messageRef.id;
};

// 커플의 봉인 편지 목록 실시간 구독 (내가 쓴 것 + 파트너가 쓴 것 전부 — 내용은 별도로 조회)
export const subscribeSealedMessages = (coupleId, callback) => {
  const q = query(
    collection(db, 'sealedMessages'),
    where('coupleId', '==', coupleId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

// 열람 가능(본인 작성 또는 이미 공개됨)할 때만 호출해야 함 — 그 외엔 firestore.rules가 거부함
export const getSealedMessageContent = async (messageId) => {
  const snap = await getDoc(doc(db, 'sealedMessages', messageId, 'private', 'content'));
  return snap.exists() ? snap.data() : null;
};

// 예약 시각 수정 — 작성자 본인, 아직 안 열린 편지만 가능(rules에서도 재검증)
export const updateUnlockAt = async (messageId, unlockAt) => {
  await updateDoc(doc(db, 'sealedMessages', messageId), {
    unlockAt: unlockAt ? Timestamp.fromDate(unlockAt) : null,
  });
};

// 지금 바로 공개 — 예약 시각과 무관하게 작성자가 직접 트리거
export const unlockSealedMessageNow = async (messageId) => {
  await updateDoc(doc(db, 'sealedMessages', messageId), {
    isUnlocked: true,
    unlockedAt: serverTimestamp(),
  });
};

// 편지 삭제 — 작성자만 가능(rules에서도 재검증). private/content가 상위 문서를 get()으로 조회해
// 작성자를 확인하는 규칙이라, 상위 문서보다 먼저 지워야 함. 첨부 이미지도 함께 정리.
export const deleteSealedMessage = async (messageId, coupleId) => {
  await deleteDoc(doc(db, 'sealedMessages', messageId, 'private', 'content'));
  await deleteSealedMessageImage(coupleId, messageId);
  await deleteDoc(doc(db, 'sealedMessages', messageId));
};
