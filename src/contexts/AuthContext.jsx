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
  const [authLoading, setAuthLoading] = useState(true);
  const [userDocLoading, setUserDocLoading] = useState(false);

  // Firebase Auth 상태 감지
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserDoc(null);
        setCoupleDoc(null);
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
        const data = snap.data();
        console.log('[AuthContext] coupleDoc 업데이트:', { migrationDone: data.migrationDone });
        setCoupleDoc({ id: snap.id, ...data });
      } else {
        setCoupleDoc(null);
      }
    });
    return () => unsubscribeCouple();
  }, [userDoc?.coupleId]);

  const loading = authLoading || userDocLoading;
  const coupleId = userDoc?.coupleId || null;

  return (
    <AuthContext.Provider value={{ user, userDoc, coupleDoc, coupleId, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within AuthProvider');
  return context;
};
