import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiXMark, HiUser, HiCog, HiArrowRightOnRectangle, HiUsers } from 'react-icons/hi2';
import { MdFavorite } from 'react-icons/md';
import { useAuthContext } from '../../contexts/AuthContext';
import { signOut } from '../../services/authService';
import { calcDday } from '../../utils/dataUtils';
import { version } from '../../../package.json';
import { useModalBackButton } from '../../hooks/useModalBackButton';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { userDoc, partnerDoc, coupleDoc } = useAuthContext();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  useModalBackButton(isOpen, onClose);
  useModalBackButton(showLogoutModal, () => setShowLogoutModal(false));

  const dday = useMemo(() => calcDday(coupleDoc?.anniversaryDate), [coupleDoc?.anniversaryDate]);

  const handleNavigation = (path) => {
    navigate(path, { replace: true });
    onClose();
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    // signOut을 먼저 기다린 뒤 이동해야 함 — 로그아웃 확인 모달이 닫히며 발생하는
    // history.back()(useModalBackButton)과 순서가 겹치면 /login이 아닌 엉뚱한 이전 페이지로
    // 튕기는 문제가 있었음. await로 그 back() 처리가 먼저 끝나게 한 뒤 명시적으로 이동.
    await signOut();
    navigate('/login', { replace: true });
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
            <MdFavorite className="profile-heart" color="#ff6b6b" />
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
          <span className="sidebar-version">v{version}</span>
          <span className="sidebar-feedback">Business9498@gmail.com</span>
          <button className="sidebar-logout" onClick={() => setShowLogoutModal(true)}>
            <HiArrowRightOnRectangle />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* 로그아웃 확인 모달 */}
      {showLogoutModal && (
        <div className="sidebar-modal-overlay">
          <div className="sidebar-modal-box">
            <p className="sidebar-modal-title">로그아웃</p>
            <p className="sidebar-modal-msg">정말 로그아웃하시겠습니까?</p>
            <div className="sidebar-modal-actions">
              <button
                className="sidebar-modal-btn"
                onClick={() => setShowLogoutModal(false)}
              >
                취소
              </button>
              <button
                className="sidebar-modal-btn confirm"
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
