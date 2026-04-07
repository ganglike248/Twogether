// src/components/common/AppHeader.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HiHeart, HiArrowRightOnRectangle, HiUser } from 'react-icons/hi2';
import { useAuthContext } from '../../contexts/AuthContext';
import { signOut } from '../../services/authService';
import './AppHeader.css';

const getDday = (anniversaryDate) => {
  if (!anniversaryDate) return null;
  const start = new Date(anniversaryDate);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
};

const AppHeader = () => {
  const navigate = useNavigate();
  const { coupleDoc } = useAuthContext();
  const dday = getDday(coupleDoc?.anniversaryDate);

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
    <header className="app-header" onClick={() => navigate('/')}>
      <button className="app-header-logout" onClick={handleLogout}>
        <HiArrowRightOnRectangle />
      </button>
      <span className="app-header-title">우리두리</span>
      <div className="app-header-right">
        <HiHeart className="app-header-heart" />
        {dday !== null && <span className="app-header-dday">+ {dday}</span>}
        <button className="app-header-profile" onClick={handleProfile}>
          <HiUser />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
