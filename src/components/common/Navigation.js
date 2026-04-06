// src/components/common/Navigation.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HiHome, HiCalendarDays, HiPhoto, HiCheckCircle, HiPaperAirplane } from 'react-icons/hi2';
import './Navigation.css';

const navItems = [
  { path: '/bucket',   Icon: HiCheckCircle,   label: '버킷' },
  { path: '/calendar', Icon: HiCalendarDays,  label: '캘린더' },
  { path: '/',         Icon: HiHome,          label: '홈' },
  { path: '/travel',   Icon: HiPaperAirplane, label: '여행' },
  { path: '/memories', Icon: HiPhoto,         label: '추억' },
];

const Navigation = () => {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bottom-nav">
      {navItems.map(({ path, Icon, label }) => (
        <Link
          key={path}
          to={path}
          className={`bottom-nav-item ${isActive(path) ? 'active' : ''}`}
        >
          <Icon className="nav-icon" />
          <span className="nav-label">{label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default Navigation;
