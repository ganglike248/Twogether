// src/services/authService.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  linkWithCredential,
  linkWithPopup,
  unlink,
  deleteUser,
  getAuth,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
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
import { initializeApp, deleteApp } from 'firebase/app';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { auth, db, app } from '../firebase';

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

// ─── 구글 로그인 (v0.4.30~) ─────────────────────────────────────

// users/{uid} 문서가 없으면 생성 — 구글 로그인은 이메일 회원가입 폼을 거치지 않고
// 바로 Firebase 계정이 만들어지므로, 최초 로그인 시 이 문서 생성을 직접 해줘야 함
const ensureUserDoc = async (user) => {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || '',
      coupleId: null,
      createdAt: serverTimestamp(),
    });
  }
};

// 안드로이드/iOS 네이티브 앱에서 구글 계정 선택 화면을 띄우고 idToken을 뽑아
// firebase/auth(JS SDK)용 credential로 변환. capacitor.config.ts의 skipNativeAuth:true와
// 짝을 이룸 — 네이티브 SDK는 계정 선택 UI만 담당하고, 실제 로그인 세션은 항상 JS SDK 하나로 유지.
//
// useCredentialManager: false — 플러그인 기본값(true)은 최신 androidx.credentials
// CredentialManager API를 쓰는데, 이게 일부 실기기(제조사 스킨, Credential Manager 백엔드가
// 제대로 안 붙은 기기 등)에서 성공/실패 콜백이 아예 안 오고 무한정 멈추는 문제가 실제로
// 발생함(SHA-1/OAuth 클라이언트 설정은 전부 정상이었는데도 재현됨, 2026-08-10). 에뮬레이터는
// Play services/계정 설정이 항상 깔끔해서 이 문제가 잘 안 드러남. 검증된 레거시
// GoogleSignInClient 플로우(표준 startActivityForResult 팝업)로 강제 전환해 회피.
// 그래도 혹시 모를 무응답에 대비해 아래 타임아웃으로 한 번 더 방어.
const NATIVE_GOOGLE_SIGN_IN_TIMEOUT_MS = 20000;

const withTimeout = (promise, ms, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);

const getNativeGoogleCredential = async () => {
  const result = await withTimeout(
    FirebaseAuthentication.signInWithGoogle({ useCredentialManager: false }),
    NATIVE_GOOGLE_SIGN_IN_TIMEOUT_MS,
    '구글 로그인 응답이 없습니다. 네트워크 상태를 확인하고 다시 시도해주세요.'
  );
  const idToken = result.credential?.idToken;
  if (!idToken) throw new Error('구글 로그인에 실패했습니다. 다시 시도해주세요.');
  return GoogleAuthProvider.credential(idToken);
};

// 구글로 로그인/가입 — 처음이면 신규 계정 생성, 이미 구글로 가입된 계정이면 그대로 로그인
export const signInWithGoogle = async () => {
  try {
    const userCredential = Capacitor.isNativePlatform()
      ? await signInWithCredential(auth, await getNativeGoogleCredential())
      : await signInWithPopup(auth, new GoogleAuthProvider());
    await ensureUserDoc(userCredential.user);
    return userCredential.user;
  } catch (error) {
    // 이미 이메일/비밀번호로 가입된 이메일로 구글 로그인을 시도한 경우 — Firebase가 계정을
    // 자동으로 합쳐주지 않으므로, 기존 비밀번호로 로그인시킨 뒤 구글 자격 증명을 연동할 수
    // 있게 정보를 담아 던짐 (LoginPage에서 비밀번호 재확인 UI로 처리)
    if (error.code === 'auth/account-exists-with-different-credential') {
      const pendingCredential = GoogleAuthProvider.credentialFromError(error);
      const linkError = new Error('이미 이 이메일로 가입된 계정이 있습니다.');
      linkError.code = 'account-exists-with-different-credential';
      linkError.email = error.customData?.email;
      linkError.pendingCredential = pendingCredential;
      throw linkError;
    }
    throw error;
  }
};

// 이메일/비밀번호로 로그인한 뒤, 구글 로그인 시도 중 충돌했던 자격 증명을 그 계정에 연동
// (signInWithGoogle이 'account-exists-with-different-credential' 에러로 넘겨준 정보 사용)
export const linkPendingGoogleCredential = async (email, password, pendingCredential) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await linkWithCredential(userCredential.user, pendingCredential);
  return userCredential.user;
};

// 로그인된 상태에서 현재 계정에 구글 계정을 추가로 연동 (ProfilePage용)
export const linkGoogleAccount = async () => {
  if (!auth.currentUser) throw new Error('로그인이 필요합니다.');
  if (Capacitor.isNativePlatform()) {
    return linkWithCredential(auth.currentUser, await getNativeGoogleCredential());
  }
  return linkWithPopup(auth.currentUser, new GoogleAuthProvider());
};

// 구글 계정 연동 해제 — Firebase는 마지막 남은 로그인 수단을 해제하는 것도 에러 없이
// 그대로 허용함(로그아웃 전까지는 계속 쓸 수 있고, 이후엔 이 계정으로 재로그인이 불가능해질
// 뿐 서버가 막아주지 않음). "마지막 수단인지" 경고는 ProfilePage.jsx의 확인 모달이 담당.
export const unlinkGoogleAccount = async () => {
  if (!auth.currentUser) throw new Error('로그인이 필요합니다.');
  await unlink(auth.currentUser, GoogleAuthProvider.PROVIDER_ID);
};

// ─── 구글 연동 충돌(다른 계정에 이미 연동된 credential) 정리 ──────────

// 충돌 상대 계정을 잠깐 들여다보기 위한 임시 Firebase 앱. 메인 auth(로그인 세션)로 그대로
// signInWithCredential 해버리면 AuthContext가 전역으로 구독 중인 auth.currentUser가 그
// 계정으로 바뀌어서 화면 전체가 잘못된 계정 기준으로 렌더링되는 부작용이 생김 — 완전히
// 별도의 앱 인스턴스를 매번 새로 만들고 끝나면 지워서 메인 세션에 영향이 안 가게 함.
const withTempAuthSession = async (pendingCredential, work) => {
  const tempApp = initializeApp(app.options, `google-conflict-${Date.now()}`);
  try {
    const tempAuth = getAuth(tempApp);
    const { user } = await signInWithCredential(tempAuth, pendingCredential);
    return await work(user);
  } finally {
    await deleteApp(tempApp).catch(() => {});
  }
};

// 구글 로그인 연동 충돌 상대 계정 정보 조회 (메인 로그인 세션은 그대로 유지됨).
// coupleId 존재 여부로 "실제 데이터가 있는 계정인지"를 판단 — 삭제 가능 여부 결정에 사용.
export const inspectConflictingGoogleAccount = async (pendingCredential) => {
  return withTempAuthSession(pendingCredential, async (user) => {
    const snap = await getDoc(doc(db, 'users', user.uid));
    return {
      uid: user.uid,
      email: user.email,
      displayName: (snap.exists() && snap.data().displayName) || user.displayName || '',
      hasCoupleData: !!(snap.exists() && snap.data().coupleId),
    };
  });
};

// 커플이 연결되지 않은(비어있는) 상대 계정을 완전히 삭제 — 구글 credential을 자유롭게 만들어서
// 현재 계정에 다시 연동할 수 있게 함. coupleId가 있으면(실제 데이터 존재) 안전을 위해 거부.
export const deleteEmptyConflictingAccount = async (pendingCredential, expectedUid) => {
  await withTempAuthSession(pendingCredential, async (user) => {
    if (user.uid !== expectedUid) {
      throw new Error('계정 정보가 일치하지 않습니다. 처음부터 다시 시도해주세요.');
    }
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists() && snap.data().coupleId) {
      throw new Error('이 계정은 커플이 연결되어 있어서 삭제할 수 없습니다.');
    }
    if (snap.exists()) await deleteDoc(userRef);
    await deleteUser(user);
  });
};

// 현재(메인 세션) 계정이 비어있을 때만 삭제하고, 대신 구글 credential 소유 계정으로 전환해서
// 로그인. coupleId가 있으면(실제 데이터 존재) 안전을 위해 거부 — 현재 계정을 지우는 쪽이라
// 되돌릴 수 없는 작업인 만큼 deleteEmptyConflictingAccount보다 더 신중하게 다뤄야 함.
export const deleteCurrentAccountAndSwitchToGoogle = async (pendingCredential) => {
  if (!auth.currentUser) throw new Error('로그인이 필요합니다.');
  const userRef = doc(db, 'users', auth.currentUser.uid);
  const snap = await getDoc(userRef);
  if (snap.exists() && snap.data().coupleId) {
    throw new Error('현재 계정은 커플이 연결되어 있어서 삭제할 수 없습니다.');
  }
  if (snap.exists()) await deleteDoc(userRef);
  await deleteUser(auth.currentUser);
  // 삭제 직후 메인 세션이 로그아웃 상태가 되므로, 구글 계정으로 이어서 로그인시킴
  const userCredential = await signInWithCredential(auth, pendingCredential);
  await ensureUserDoc(userCredential.user);
  return userCredential.user;
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

  // 기본 이벤트 타입 색상 (DB에만 저장)
  const defaultEventTypeColors = {
    couple: '#ffbaba',
    boyfriend: '#c7ceea',
    girlfriend: '#b5ead7',
    personal: '#4ECDC4',
  };

  batch.set(coupleRef, {
    members: [uid],
    inviteCode,
    anniversaryDate,
    eventTypeColors: defaultEventTypeColors,
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
