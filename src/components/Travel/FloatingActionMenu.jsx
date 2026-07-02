// src/components/Travel/FloatingActionMenu.jsx
import React, { useState } from 'react';
import { MdAdd, MdClose } from 'react-icons/md';
import './FloatingActionMenu.css';

const FloatingActionMenu = ({
  activeTab,
  onScheduleAdd,
  onDecisionAdd,
  onChecklistAdd,
  onDecisionMenu
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleScheduleClick = () => {
    handleClose();
    onScheduleAdd?.();
  };

  const handleDecisionClick = () => {
    handleClose();
    onDecisionMenu?.();
  };

  const handleChecklistClick = () => {
    handleClose();
    onChecklistAdd?.();
  };

  const getMenuItems = () => {
    switch (activeTab) {
      case 'schedule':
        return [
          { label: '일정 추가', onClick: handleScheduleClick }
        ];
      case 'decisions':
        return [
          { label: '주제 추가', onClick: handleDecisionClick },
          { label: '항목 추가', onClick: handleDecisionClick }
        ];
      case 'checklist':
        return [
          { label: '항목 추가', onClick: handleChecklistClick }
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

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
        onClick={() => setIsOpen(!isOpen)}
        title="추가"
      >
        {isOpen ? <MdClose size={24} /> : <MdAdd size={24} />}
      </button>
    </>
  );
};

export default FloatingActionMenu;
