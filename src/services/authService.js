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
  // 중복되지 않는 초대 코드 생성
  let inviteCode;
  let codeExists = true;
  while (codeExists) {
    inviteCode = generateInviteCode();
    const q = query(collection(db, 'couples'), where('inviteCode', '==', inviteCode));
    const snap = await getDocs(q);
    codeExists = !snap.empty;
  }

  // couples 문서 생성
  const coupleRef = await addDoc(collection(db, 'couples'), {
    members: [uid],
    inviteCode,
    anniversaryDate, // 'YYYY-MM-DD' 형식
    createdAt: serverTimestamp(),
    createdBy: uid,
  });

  // users 문서에 coupleId 업데이트
  await updateDoc(doc(db, 'users', uid), {
    coupleId: coupleRef.id,
  });

  return { coupleId: coupleRef.id, inviteCode };
};

// 초대 코드로 커플 합류
export const joinCouple = async (uid, inviteCode) => {
  const code = inviteCode.trim().toUpperCase();

  // 코드로 couples 문서 찾기
  const q = query(collection(db, 'couples'), where('inviteCode', '==', code));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('유효하지 않은 초대 코드입니다.');
  }

  const coupleDoc = snap.docs[0];
  const coupleData = coupleDoc.data();

  // 이미 2명이면 거부
  if (coupleData.members.length >= 2) {
    throw new Error('이미 커플이 연결된 코드입니다.');
  }

  // 자기 자신 코드이면 거부
  if (coupleData.members.includes(uid)) {
    throw new Error('자신의 초대 코드는 사용할 수 없습니다.');
  }

  // couples 문서에 두 번째 멤버 추가
  await updateDoc(coupleDoc.ref, {
    members: arrayUnion(uid),
  });

  // users 문서에 coupleId 업데이트
  await updateDoc(doc(db, 'users', uid), {
    coupleId: coupleDoc.id,
  });

  return { coupleId: coupleDoc.id };
};

// 커플 정보 조회
export const getCoupleDoc = async (coupleId) => {
  const snap = await getDoc(doc(db, 'couples', coupleId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};
