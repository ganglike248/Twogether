// src/components/common/Layout.jsx
import React from 'react';
import AppHeader from './AppHeader';
import Navigation from './Navigation';
import './Layout.css';

const Layout = ({ children }) => {
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
