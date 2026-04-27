import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiXMark, HiUser, HiCog, HiArrowRightOnRectangle, HiUsers } from 'react-icons/hi2';
import { useAuthContext } from '../../contexts/AuthContext';
import { signOut } from '../../services/authService';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { userDoc, partnerDoc, coupleDoc } = useAuthContext();

  const dday = useMemo(() => {
    if (!coupleDoc?.anniversaryDate) return null;
    const start = new Date(coupleDoc.anniversaryDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
  }, [coupleDoc?.anniversaryDate]);

  const handleNavigation = (path) => {
    navigate(path, { replace: true });
    onClose();
  };

  const handleLogout = () => {
    if (!window.confirm('정말 로그아웃하시겠습니까?')) return;
    signOut();
  };

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      {/* 사이드바 */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* 닫기 버튼 */}
        <button className="sidebar-close" onClick={onClose}>
          <HiXMark />
        </button>

        {/* 프로필 영역 */}
        <div className="sidebar-profile">
          <h2 className="sidebar-title">우리두리</h2>
          <div className="profile-names-row">
            <span className="profile-name">{userDoc?.displayName || '...'}</span>
            <span className="profile-heart">♥</span>
            <span className="profile-name">{partnerDoc?.displayName || '...'}</span>
          </div>
          {dday !== null && (
            <p className="profile-dday">
              <span className="dday-label">연애한지</span>
              <span className="dday-number">{dday}</span>
              <span className="dday-label">일</span>
            </p>
          )}
        </div>

        {/* 메뉴 */}
        <nav className="sidebar-menu">
          <button
            className="sidebar-menu-item"
            onClick={() => handleNavigation('/profile')}
          >
            <HiUser />
            <span>프로필</span>
          </button>

          <button
            className="sidebar-menu-item"
            onClick={() => handleNavigation('/couple-info')}
          >
            <HiUsers />
            <span>커플 정보</span>
          </button>

          <button
            className="sidebar-menu-item"
            onClick={() => handleNavigation('/settings')}
          >
            <HiCog />
            <span>설정</span>
          </button>
        </nav>

        {/* 하단 푸터 */}
        <div className="sidebar-footer">
          <span className="sidebar-version">v0.3.46</span>
          <span className="sidebar-feedback">Business9498@gmail.com</span>
          <button className="sidebar-logout" onClick={handleLogout}>
            <HiArrowRightOnRectangle />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
