import React, { useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { HiXMark, HiUser, HiCog, HiArrowRightOnRectangle, HiUsers } from 'react-icons/hi2';
import { MdFavorite } from 'react-icons/md';
import { useAuthContext } from '../../contexts/AuthContext';
import { signOut } from '../../services/authService';
import { calcDday } from '../../utils/dataUtils';
import { version } from '../../../package.json';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userDoc, partnerDoc, coupleDoc } = useAuthContext();
  // 로그아웃 확인 모달도 같은 쿼리 파라미터 방식(?logout=1) — 손수 만든 pushState/popstate
  // 훅(useModalBackButton) 없이 React Router가 히스토리를 전담하게 함. isOpen도 같이 확인해서
  // 사이드바가 닫힌 상태에서 이 모달만 남는 경우가 없게 방어.
  const [searchParams] = useSearchParams();
  const showLogoutModal = isOpen && searchParams.get('logout') === '1';

  const openLogoutModal = () => {
    const qs = new URLSearchParams(location.search);
    qs.set('logout', '1');
    navigate(`${location.pathname}?${qs.toString()}`, { state: { modal: true } });
  };

  const closeLogoutModal = () => {
    if (location.key === 'default') {
      const qs = new URLSearchParams(location.search);
      qs.delete('logout');
      const suffix = qs.toString();
      navigate(`${location.pathname}${suffix ? `?${suffix}` : ''}`, { replace: true });
    } else {
      navigate(-1);
    }
  };

  const dday = useMemo(() => calcDday(coupleDoc?.anniversaryDate), [coupleDoc?.anniversaryDate]);

  // path로 완전히 다른 화면으로 이동하는 것이라 onClose()(navigate(-1)/replace)를 따로
  // 부를 필요 없음 — 이 이동 자체가 이미 사이드바가 열려있던 URL(?sidebar=1)을 벗어나므로
  // 자동으로 닫힘. 굳이 onClose()까지 연달아 부르면 캘린더 모달에서 겪었던 것과 같은
  // 히스토리 레이스가 날 수 있어 의도적으로 안 부름.
  const handleNavigation = (path) => {
    navigate(path, { replace: true });
  };

  const handleLogout = async () => {
    // signOut을 먼저 기다린 뒤 이동해야 함(순서 보장). /login으로 이동하는 것 자체가
    // 사이드바+로그아웃 모달이 열려있던 URL을 완전히 벗어나므로 별도로 닫을 필요 없음 —
    // 예전엔 이 함수가 setShowLogoutModal(false) 후 history.back()과 순서가 겹쳐 엉뚱한
    // 페이지로 튕기는 문제가 있었는데, 그 손수 만든 히스토리 관리 자체가 없어지면서 해결됨.
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
          <button className="sidebar-logout" onClick={openLogoutModal}>
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
                onClick={closeLogoutModal}
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
