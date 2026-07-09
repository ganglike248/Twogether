// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [coupleDoc, setCoupleDoc] = useState(null);
  const [partnerDoc, setPartnerDoc] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userDocLoading, setUserDocLoading] = useState(false);

  // Firebase Auth 상태 감지
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserDoc(null);
        setCoupleDoc(null);
        setPartnerDoc(null);
        setUserDocLoading(false);
        setAuthLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 로그인 후 users/{uid} 실시간 구독
  // persistentLocalCache(오프라인 퍼시스턴스)를 켜두면 onSnapshot의 첫 이벤트가 IndexedDB에 남아있는
  // "예전" 캐시로 먼저 올 수 있음 — 이 값의 coupleId가 stale하면 실제로는 커플 연결이 멀쩡한데도
  // ProtectedRoute가 /couple-setup으로 잘못 리다이렉트해버림(오래 켜둔 브라우저 탭/기기에서 드물게 재현됨).
  // 구독을 시작하기 전에 서버에서 한 번 강제로 확인해 로컬 캐시를 최신 값으로 갱신해둠.
  useEffect(() => {
    if (!user) return;
    setUserDocLoading(true);
    const userRef = doc(db, 'users', user.uid);
    let unsubscribeUser = () => {};
    let cancelled = false;

    getDocFromServer(userRef)
      .catch(() => {}) // 오프라인 등으로 서버 접근 실패 시 캐시로 폴백(기존 동작 유지)
      .finally(() => {
        if (cancelled) return;
        unsubscribeUser = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setUserDoc({ id: snap.id, ...snap.data() });
          } else {
            setUserDoc(null);
          }
          setUserDocLoading(false);
          setAuthLoading(false);
        }, () => {
          setUserDocLoading(false);
          setAuthLoading(false);
        });
      });

    return () => {
      cancelled = true;
      unsubscribeUser();
    };
  }, [user]);

  // coupleId가 생기면 couples/{coupleId} 실시간 구독 — 위와 같은 이유로 서버 우선 확인 후 구독 시작
  useEffect(() => {
    const coupleId = userDoc?.coupleId;
    if (!coupleId) {
      setCoupleDoc(null);
      return;
    }
    const coupleRef = doc(db, 'couples', coupleId);
    let unsubscribeCouple = () => {};
    let cancelled = false;

    getDocFromServer(coupleRef)
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        unsubscribeCouple = onSnapshot(coupleRef, (snap) => {
          if (snap.exists()) {
            setCoupleDoc({ id: snap.id, ...snap.data() });
          } else {
            setCoupleDoc(null);
          }
        }, () => setCoupleDoc(null));
      });

    return () => {
      cancelled = true;
      unsubscribeCouple();
    };
  }, [userDoc?.coupleId]);

  // 파트너 user doc 실시간 구독
  // 배열 참조 대신 개별 UID 문자열을 의존성으로 사용 — coupleDoc 스냅샷마다 불필요한 재구독 방지
  useEffect(() => {
    const m0 = coupleDoc?.members?.[0];
    const m1 = coupleDoc?.members?.[1];
    const userUid = user?.uid;
    if (!m0 || !m1 || !userUid) { setPartnerDoc(null); return; }
    const partnerUid = m0 === userUid ? m1 : m0;

    const partnerRef = doc(db, 'users', partnerUid);
    const unsubPartner = onSnapshot(partnerRef, (snap) => {
      setPartnerDoc(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    }, () => setPartnerDoc(null));
    return () => unsubPartner();
  }, [coupleDoc?.members?.[0], coupleDoc?.members?.[1], user?.uid]);

  const loading = authLoading || userDocLoading;
  const coupleId = userDoc?.coupleId || null;

  // members[0] = boyfriend, members[1] = girlfriend
  const member0Uid = coupleDoc?.members?.[0] || null;
  const member1Uid = coupleDoc?.members?.[1] || null;
  const member0Name = member0Uid === user?.uid ? (userDoc?.displayName || '') : (partnerDoc?.displayName || '');
  const member1Name = member1Uid === user?.uid ? (userDoc?.displayName || '') : (partnerDoc?.displayName || '');

  // 현재 유저의 역할 ('boyfriend' | 'girlfriend' | null)
  const myRole = user?.uid === member0Uid ? 'boyfriend'
               : user?.uid === member1Uid ? 'girlfriend'
               : null;

  // eventType('boyfriend'|'girlfriend'|'couple') → 표시 이름
  const getMemberName = (eventType) => {
    if (eventType === 'boyfriend') return member0Name || '멤버1';
    if (eventType === 'girlfriend') return member1Name || '멤버2';
    return '데이트';
  };

  return (
    <AuthContext.Provider value={{ user, userDoc, coupleDoc, coupleId, partnerDoc, myRole, getMemberName, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within AuthProvider');
  return context;
};
