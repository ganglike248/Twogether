// src/services/authService.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  arrayUnion,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

// 랜덤 6자리 대문자+숫자 초대 코드 생성
const generateInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// 회원가입
export const signUpWithEmail = async (email, password, displayName) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = userCredential;

  // Auth 프로필 업데이트
  await updateProfile(user, { displayName });

  // Firestore users 문서 생성
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email,
    displayName,
    coupleId: null,
    createdAt: serverTimestamp(),
  });

  return user;
};

// 로그인
export const signInWithEmail = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

// 로그아웃
export const signOut = async () => {
  await firebaseSignOut(auth);
};

// 새 커플 생성 (초대 코드 생성)
export const createCouple = async (uid, anniversaryDate) => {
  // inviteCodes 컬렉션에서 중복 없는 초대 코드 생성
  let inviteCode;
  let codeExists = true;
  while (codeExists) {
    inviteCode = generateInviteCode();
    const snap = await getDoc(doc(db, 'inviteCodes', inviteCode));
    codeExists = snap.exists();
  }

  const coupleRef = doc(collection(db, 'couples'));
  const batch = writeBatch(db);

  batch.set(coupleRef, {
    members: [uid],
    inviteCode,
    anniversaryDate,
    createdAt: serverTimestamp(),
    createdBy: uid,
  });
  // 초대 코드 매핑 (couples 읽기를 멤버 전용으로 제한하기 위한 분리)
  batch.set(doc(db, 'inviteCodes', inviteCode), {
    coupleId: coupleRef.id,
    creatorUid: uid,
    joined: false,
    createdAt: serverTimestamp(),
  });
  // users/{uid} 업데이트를 batch에 포함 — 커플 생성과 원자적으로 처리
  batch.update(doc(db, 'users', uid), { coupleId: coupleRef.id });
  await batch.commit();

  return { coupleId: coupleRef.id, inviteCode };
};

// 초대 코드로 커플 합류
export const joinCouple = async (uid, inviteCode) => {
  const code = inviteCode.trim().toUpperCase();
  const inviteRef = doc(db, 'inviteCodes', code);

  // runTransaction으로 joined 체크와 쓰기를 원자적으로 묶음 — 두 사용자가 동시에 같은
  // 코드로 합류를 시도해도 Firestore가 트랜잭션 충돌을 감지해 하나는 재시도 후
  // joined:true를 다시 읽어 에러를 던지게 됨 (check-then-write 사이의 gap 제거).
  const coupleId = await runTransaction(db, async (transaction) => {
    const inviteSnap = await transaction.get(inviteRef);

    if (!inviteSnap.exists()) {
      throw new Error('유효하지 않은 초대 코드입니다.');
    }

    const { coupleId: targetCoupleId, creatorUid, joined } = inviteSnap.data();

    if (joined) {
      throw new Error('이미 커플이 연결된 코드입니다.');
    }
    if (creatorUid === uid) {
      throw new Error('자신의 초대 코드는 사용할 수 없습니다.');
    }

    transaction.update(doc(db, 'couples', targetCoupleId), { members: arrayUnion(uid) });
    transaction.update(inviteRef, { joined: true });
    transaction.update(doc(db, 'users', uid), { coupleId: targetCoupleId });

    return targetCoupleId;
  });

  return { coupleId };
};

// 커플 정보 조회
export const getCoupleDoc = async (coupleId) => {
  const snap = await getDoc(doc(db, 'couples', coupleId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

// 사용자 이름 업데이트
export const updateUserName = async (newDisplayName) => {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');

  await updateProfile(user, { displayName: newDisplayName });
  await updateDoc(doc(db, 'users', user.uid), {
    displayName: newDisplayName,
  });
};
