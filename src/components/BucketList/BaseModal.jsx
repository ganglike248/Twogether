import React from 'react';
import { MdClose } from 'react-icons/md';

function BaseModal({ isOpen, onClose, title, icon: Icon, iconColor, children, className = '' }) {
  if (!isOpen) return null;

  return (
    // EventModal(캘린더)과 동일한 패턴 — target === currentTarget일 때만 닫음.
    // (배경 클릭 시 e.stopPropagation()으로 막는 대신 이 방식을 쓰면, 이 모달 위에 다시
    // 뜨는 확인 모달(예: CategoryManagerModal의 삭제 확인)의 배경을 눌러도 바깥 이 모달까지
    // 같이 닫히는 일이 없음 — 실제로 버블링되는지 재현 테스트로 확인해본 결과 기존
    // stopPropagation 방식도 이미 안전했지만, 캘린더와 완전히 같은 방식으로 통일함)
    <div
      className="bucket-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`bucket-modal-box ${className}`}>
        <div className="bucket-modal-header">
          {Icon && <Icon className="bucket-modal-icon" style={iconColor ? { color: iconColor } : undefined} />}
          <h2 className="bucket-modal-title">{title}</h2>
          <button className="bucket-modal-close" onClick={onClose}>
            <MdClose />
          </button>
        </div>
        <div className="bucket-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

export default BaseModal;
