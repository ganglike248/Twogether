// src/components/common/Layout.jsx
import React from 'react';
import AppHeader from './AppHeader';
import Navigation from './Navigation';
import useColorSync from '../../hooks/useColorSync';
import { useAuthContext } from '../../contexts/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const { userDoc, partnerDoc, myRole } = useAuthContext();
  useColorSync(userDoc, partnerDoc, myRole);

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
