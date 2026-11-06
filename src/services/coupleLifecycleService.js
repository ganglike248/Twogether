// src/services/coupleLifecycleService.js
// 커플 연결 해제 / 해제 취소 / 보관 중인 이전 커플 / 회원 탈퇴 — 전부 서버(functions/coupleLifecycle.js) 콜러블.
// 규칙상 클라이언트가 직접 할 수 없는 작업이라(members 변경, 상대 문서 수정, 로그인 계정 삭제) 반드시 이 경로로만.
import { httpsCallable } from 'firebase/functions';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db, functionsInstance } from '../firebase';

const call = async (name, data = {}) => (await httpsCallable(functionsInstance, name)(data)).data;

export const leaveCouple = () => call('leaveCouple');
export const cancelLeaveCouple = (coupleId) => call('cancelLeaveCouple', { coupleId });

// [{ coupleId, dissolvedAt(ms), purgeAfter(ms), daysLeft, canCancel, partnerName }] — 30일 안의 것만
export const listFormerCouples = async () => (await call('listFormerCouples')).couples || [];

export const deleteMyAccount = () => call('deleteMyAccount');

// 서버가 "최근 로그인 5분 이내"를 요구할 때 HttpsError details로 알려줌
export const isRecentLoginRequired = (error) => error?.details?.reason === 'requires-recent-login';

// 상대방 쪽 안내 표시를 봤으면 지움(본인 사용자 문서라 규칙상 직접 수정 가능)
export const dismissCoupleEndedNotice = (uid) => updateDoc(doc(db, 'users', uid), { coupleEndedNotice: deleteField() });
export const dismissCoupleRestoredNotice = (uid) => updateDoc(doc(db, 'users', uid), { coupleRestoredNotice: deleteField() });
