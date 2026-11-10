import React from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { HiInformationCircle, HiUserCircle, HiChevronRight } from 'react-icons/hi2';
import { MdPalette, MdNotifications, MdBackup } from 'react-icons/md';
import EventTypeColorSettingsModal from './EventTypeColorSettingsModal';
import { setFirstStepsDismissed } from '../../services/authService';
import { MenuPageHeader } from '../common/MenuPage';
import './SettingsPage.css';

const SettingsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // 모달 열림 상태를 useState 대신 ?modal= 쿼리에서 파생 — 손수 만든 pushState/popstate
  // 훅(useModalBackButton) 없이 React Router가 히스토리를 전담하게 함(캘린더와 같은 이유).
  const [searchParams] = useSearchParams();
  const modalType = searchParams.get('modal');
  const showColorModal = modalType === 'colors';

  const openModal = (type) => navigate(`/settings?modal=${type}`, { state: { modal: true } });

  // location.key === 'default'면 이 세션에서 첫 진입(딥링크/새로고침)이라 navigate(-1)이
  // 앱 밖으로 나갈 수 있어 대신 /settings로 보냄 — 캘린더 closeModal과 동일한 패턴.
  const closeModal = () => {
    if (location.key === 'default') {
      navigate('/settings', { replace: true });
    } else {
      navigate(-1);
    }
  };

  // 카드마다 한 줄 설명을 붙여 크기를 키움 — 예전엔 얇은 버튼 4개만 있어 화면 아래가 텅 비어 보였음
  const groups = [
    {
      label: '계정',
      items: [
        { key: 'account', Icon: HiUserCircle, color: '#748ffc', title: '계정', desc: '로그인 정보 · 비밀번호 · 연결된 계정 · 로그아웃', onClick: () => navigate('/account') },
      ],
    },
    {
      label: '앱 설정',
      items: [
        { key: 'colors', Icon: MdPalette, color: '#cc5de8', title: '이벤트 색상 설정', desc: '커플·나·상대 일정의 색을 바꿔요', onClick: () => openModal('colors') },
        { key: 'notifications', Icon: MdNotifications, color: '#ff8787', title: '알림 설정', desc: '어떤 알림을 받을지 종류별로 정해요', onClick: () => navigate('/notification-settings') },
        { key: 'backup', Icon: MdBackup, color: '#4dabf7', title: '데이터 백업', desc: '우리 기록을 파일로 저장하고 되살려요', onClick: () => navigate('/data-backup') },
      ],
    },
    {
      label: '도움말',
      items: [
        // 예전 기능 소개 슬라이드 대신 홈 "우리 둘의 첫 걸음" 카드를 다시 켬(v1.0.28)
        { key: 'intro', Icon: HiInformationCircle, color: '#69db7c', title: '우리 둘의 첫 걸음 다시 보기', desc: '홈에 해볼 일 카드를 다시 띄워요', onClick: async () => { await setFirstStepsDismissed(false).catch(() => {}); navigate('/', { replace: true }); } },
      ],
    },
  ];

  return (
    <div className="settings-page menu-page">
      <MenuPageHeader title="설정" />

      {groups.map(group => (
        <section key={group.label} className="settings-group">
          <h2 className="settings-group-label">{group.label}</h2>
          {group.items.map(({ key, color, title, desc, onClick, Icon: icon }) => (
            <button key={key} type="button" className="settings-item" onClick={onClick}>
              <span className="settings-item-icon" style={{ color, background: `${color}1f` }} aria-hidden="true">
                {React.createElement(icon)}
              </span>
              <span className="settings-item-text">
                <span className="settings-item-title">{title}</span>
                <span className="settings-item-desc">{desc}</span>
              </span>
              <HiChevronRight className="settings-item-arrow" aria-hidden="true" />
            </button>
          ))}
        </section>
      ))}

      <EventTypeColorSettingsModal
        isOpen={showColorModal}
        onClose={closeModal}
      />
    </div>
  );
};

export default SettingsPage;
