// src/components/common/Layout.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import AppHeader from './AppHeader';
import Navigation from './Navigation';
import useColorSync from '../../hooks/useColorSync';
import { useAuthContext } from '../../contexts/AuthContext';
import { subscribeForegroundMessages } from '../../services/notificationService';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, userDoc, partnerDoc, myRole } = useAuthContext();
  const navigate = useNavigate();
  useColorSync(userDoc, partnerDoc, myRole);

  // 앱이 포그라운드(활성 탭)일 때는 시스템 알림이 자동으로 뜨지 않으므로 토스트로 대체 표시
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeForegroundMessages((payload) => {
      const { title, body } = payload.notification || payload.data || {};
      if (!title) return;
      const link = payload.fcmOptions?.link || payload.data?.link;
      toast.info(body ? `${title}\n${body}` : title, {
        onClick: link ? () => navigate(link) : undefined,
      });
    });
    return unsubscribe;
  }, [user, navigate]);

  return (
    <div className="layout">
      <AppHeader />
      <main className="main-content">
        {children}
      </main>
      <Navigation />
    </div>
  );
};

export default Layout;
