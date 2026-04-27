// src/components/common/AppHeader.jsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiHeart, HiBars3 } from 'react-icons/hi2';
import { useAuthContext } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import './AppHeader.css';

const AppHeader = () => {
  const navigate = useNavigate();
  const { coupleDoc } = useAuthContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const dday = useMemo(() => {
    if (!coupleDoc?.anniversaryDate) return null;
    const start = new Date(coupleDoc.anniversaryDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
  }, [coupleDoc?.anniversaryDate]);

  return (
    <>
      <header className="app-header">
        <button className="app-header-menu" onClick={() => setSidebarOpen(true)}>
          <HiBars3 />
        </button>
        <span className="app-header-title" onClick={() => navigate('/', { replace: true })}>
          우리두리
        </span>
        <div className="app-header-right" onClick={() => navigate('/', { replace: true })}>
          <HiHeart className="app-header-heart" />
          {dday !== null && <span className="app-header-dday">+ {dday}</span>}
        </div>
      </header>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
};

export default AppHeader;
