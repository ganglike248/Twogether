// src/components/common/AppHeader.jsx
import React, { useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { HiHeart, HiBars3 } from 'react-icons/hi2';
import { useAuthContext } from '../../contexts/AuthContext';
import { calcDday } from '../../utils/dataUtils';
import Sidebar from './Sidebar';
import './AppHeader.css';

const AppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { coupleDoc } = useAuthContext();
  // 사이드바는 어느 페이지에서나 열리는 전역 UI라, 그 페이지 라우트를 새로 설계하는 대신
  // 지금 페이지 URL에 ?sidebar=1을 붙이는 쿼리 파라미터 방식으로 열림 상태를 표현함 —
  // 손수 만든 pushState/popstate 훅(useModalBackButton) 없이 React Router가 히스토리를
  // 전담하게 함(캘린더와 같은 이유).
  const [searchParams] = useSearchParams();
  const sidebarOpen = searchParams.get('sidebar') === '1';

  const openSidebar = () => {
    const qs = new URLSearchParams(location.search);
    qs.set('sidebar', '1');
    navigate(`${location.pathname}?${qs.toString()}`, { state: { modal: true } });
  };

  // location.key === 'default'면 이 세션에서 첫 진입(딥링크/새로고침)이라 navigate(-1)이
  // 앱 밖으로 나갈 수 있어 대신 사이드바 쿼리만 뗀 현재 페이지로 보냄.
  const closeSidebar = () => {
    if (location.key === 'default') {
      const qs = new URLSearchParams(location.search);
      qs.delete('sidebar');
      const suffix = qs.toString();
      navigate(`${location.pathname}${suffix ? `?${suffix}` : ''}`, { replace: true });
    } else {
      navigate(-1);
    }
  };

  const dday = useMemo(() => calcDday(coupleDoc?.anniversaryDate), [coupleDoc?.anniversaryDate]);

  return (
    <>
      <header className="app-header">
        <button className="app-header-menu" onClick={openSidebar}>
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
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
    </>
  );
};

export default AppHeader;
