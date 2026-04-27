// src/components/common/AppHeader.jsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiHeart, HiArrowRightOnRectangle, HiUser } from 'react-icons/hi2';
import { useAuthContext } from '../../contexts/AuthContext';
import { signOut } from '../../services/authService';
import './AppHeader.css';

const AppHeader = () => {
  const navigate = useNavigate();
  const { coupleDoc } = useAuthContext();

  const dday = useMemo(() => {
    if (!coupleDoc?.anniversaryDate) return null;
    const start = new Date(coupleDoc.anniversaryDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
  }, [coupleDoc?.anniversaryDate]);

  const handleLogout = (e) => {
    e.stopPropagation();
    if (!window.confirm('정말 로그아웃하시겠습니까?')) return;
    signOut();
  };

  const handleProfile = (e) => {
    e.stopPropagation();
    navigate('/profile');
  };

  return (
    <header className="app-header">
      <button className="app-header-logout" onClick={handleLogout}>
        <HiArrowRightOnRectangle />
      </button>
      <span className="app-header-title" onClick={() => navigate('/', { replace: true })}>
        우리두리
      </span>
      <div className="app-header-right">
        <HiHeart className="app-header-heart" />
        {dday !== null && <span className="app-header-dday">+ {dday}</span>}
        <button className="app-header-profile" onClick={handleProfile} title="프로필">
          <HiUser />
          <span className="app-header-profile-label">프로필</span>
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
