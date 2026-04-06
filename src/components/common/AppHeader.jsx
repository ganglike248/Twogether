// src/components/common/AppHeader.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HiHeart } from 'react-icons/hi2';
import { useAuthContext } from '../../contexts/AuthContext';
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

  return (
    <header className="app-header" onClick={() => navigate('/')}>
      <span className="app-header-title">우리두리</span>
      <div className="app-header-right">
        <HiHeart className="app-header-heart" />
        {dday !== null && <span className="app-header-dday">+ {dday}</span>}
      </div>
    </header>
  );
};

export default AppHeader;
