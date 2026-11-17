// src/hooks/useNameByUid.js
// uid → 닉네임(나/상대). AuthContext의 getMemberName은 일정 종류('boyfriend'|'girlfriend')를 받는 함수라 uid엔 못 씀.
import { useAuthContext } from '../contexts/AuthContext';

export const useNameByUid = () => {
  const { user, userDoc, partnerDoc } = useAuthContext();
  return (uid) => (uid === user?.uid ? userDoc?.displayName : partnerDoc?.displayName) || '';
};
