import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiXMark, HiUser, HiCog, HiUsers } from 'react-icons/hi2';
import { MdFavorite } from 'react-icons/md';
import { useAuthContext } from '../../contexts/AuthContext';
import { calcDday } from '../../utils/dataUtils';
import { version } from '../../../package.json';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { userDoc, partnerDoc, coupleDoc } = useAuthContext();
  const dday = useMemo(() => calcDday(coupleDoc?.anniversaryDate), [coupleDoc?.anniversaryDate]);

  // path로 완전히 다른 화면으로 이동하는 것이라 onClose()(navigate(-1)/replace)를 따로
  // 부를 필요 없음 — 이 이동 자체가 이미 사이드바가 열려있던 URL(?sidebar=1)을 벗어나므로
  // 자동으로 닫힘. 굳이 onClose()까지 연달아 부르면 캘린더 모달에서 겪었던 것과 같은
  // 히스토리 레이스가 날 수 있어 의도적으로 안 부름.
  const handleNavigation = (path) => {
    navigate(path, { replace: true });
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
            <MdFavorite className="profile-heart" color="var(--color-primary)" />
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
          {/* 로그아웃은 설정 → 계정으로 옮김(v1.0.26) */}
          <span className="sidebar-version">v{version}</span>
        </div>
      </aside>

    </>
  );
};

export default Sidebar;
