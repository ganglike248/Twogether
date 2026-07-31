// src/components/Travel/FloatingActionMenu.jsx
import React, { useState } from 'react';
import { MdAdd, MdClose } from 'react-icons/md';
import './FloatingActionMenu.css';

/**
 * FloatingActionMenu - 재사용 가능한 FAB 메뉴 컴포넌트
 *
 * 사용 예시:
 * 1. 탭 기반 (TripDetail):
 *    <FloatingActionMenu
 *      activeTab={activeTab}
 *      onScheduleAdd={...}
 *      onDecisionMenu={...}
 *      onChecklistAdd={...}
 *    />
 *
 * 2. 액션 기반 (Calendar, 기타):
 *    <FloatingActionMenu
 *      actions={[
 *        { label: '일정 추가', onClick: handleAddEvent }
 *      ]}
 *    />
 */
const FloatingActionMenu = ({
  // Tab-based mode (TripDetail)
  activeTab,
  onScheduleAdd,
  onDecisionMenu,
  onChecklistAdd,

  // Action-based mode (Calendar, etc)
  actions
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleActionClick = (onClick) => {
    handleClose();
    onClick?.();
  };

  const getMenuItems = () => {
    // 액션 기반 모드 (actions prop 사용)
    if (actions && Array.isArray(actions)) {
      return actions.map(action => ({
        label: action.label,
        onClick: () => handleActionClick(action.onClick)
      }));
    }

    // 탭 기반 모드 (activeTab prop 사용)
    if (!activeTab) return [];

    switch (activeTab) {
      case 'schedule':
        return [
          { label: '일정 추가', onClick: () => handleActionClick(onScheduleAdd) }
        ];
      case 'decisions':
        return [
          { label: '비교 주제 추가', onClick: () => handleActionClick(onDecisionMenu) }
        ];
      case 'checklist':
        return [
          { label: '항목 추가', onClick: () => handleActionClick(onChecklistAdd) }
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  // 메뉴 항목이 없으면 렌더링하지 않음
  if (!menuItems || menuItems.length === 0) {
    return null;
  }

  // 선택지가 하나뿐이면 메뉴를 띄우지 않고 바로 실행 — 굳이 한 번 더 선택하게 하지 않음
  const handleFabClick = () => {
    if (menuItems.length === 1) {
      menuItems[0].onClick();
      return;
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* 오버레이 */}
      {isOpen && (
        <div className="fam-overlay" onClick={handleClose} />
      )}

      {/* 메뉴 아이템들 */}
      {isOpen && (
        <div className="fam-menu">
          {menuItems.map((item, index) => (
            <button
              key={index}
              className="fam-menu-item"
              onClick={item.onClick}
            >
              <span className="fam-menu-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* FAB 버튼 */}
      <button
        className={`fam-fab ${isOpen ? 'open' : ''}`}
        onClick={handleFabClick}
        title="추가"
      >
        {isOpen ? <MdClose size={24} /> : <MdAdd size={24} />}
      </button>
    </>
  );
};

export default FloatingActionMenu;
