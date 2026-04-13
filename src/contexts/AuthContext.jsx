// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
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
  useEffect(() => {
    if (!user) return;
    setUserDocLoading(true);
    const userRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userRef, (snap) => {
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
    return () => unsubscribeUser();
  }, [user]);

  // coupleId가 생기면 couples/{coupleId} 실시간 구독
  useEffect(() => {
    const coupleId = userDoc?.coupleId;
    if (!coupleId) {
      setCoupleDoc(null);
      return;
    }
    const coupleRef = doc(db, 'couples', coupleId);
    const unsubscribeCouple = onSnapshot(coupleRef, (snap) => {
      if (snap.exists()) {
        setCoupleDoc({ id: snap.id, ...snap.data() });
      } else {
        setCoupleDoc(null);
      }
    });
    return () => unsubscribeCouple();
  }, [userDoc?.coupleId]);

  // 파트너 user doc 실시간 구독
  useEffect(() => {
    if (!coupleDoc?.members || !user) { setPartnerDoc(null); return; }
    const partnerUid = coupleDoc.members.find(uid => uid !== user.uid);
    if (!partnerUid) { setPartnerDoc(null); return; }

    const partnerRef = doc(db, 'users', partnerUid);
    const unsubPartner = onSnapshot(partnerRef, (snap) => {
      setPartnerDoc(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    }, () => setPartnerDoc(null));
    return () => unsubPartner();
  }, [coupleDoc?.members, user]);

  const loading = authLoading || userDocLoading;
  const coupleId = userDoc?.coupleId || null;

  // members[0] = boyfriend, members[1] = girlfriend
  const member0Uid = coupleDoc?.members?.[0] || null;
  const member1Uid = coupleDoc?.members?.[1] || null;
  const member0Name = member0Uid === user?.uid ? (userDoc?.displayName || '') : (partnerDoc?.displayName || '');
  const member1Name = member1Uid === user?.uid ? (userDoc?.displayName || '') : (partnerDoc?.displayName || '');

  // eventType('boyfriend'|'girlfriend'|'couple') → 표시 이름
  const getMemberName = (eventType) => {
    if (eventType === 'boyfriend') return member0Name || '멤버1';
    if (eventType === 'girlfriend') return member1Name || '멤버2';
    return '데이트';
  };

  return (
    <AuthContext.Provider value={{ user, userDoc, coupleDoc, coupleId, partnerDoc, getMemberName, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within AuthProvider');
  return context;
};
