// src/components/common/ConfirmModal.jsx
// 앱 곳곳의 삭제/확인 동작이 브라우저 기본 window.confirm()/alert()을 써서 기기마다
// 생김새가 다르고 앱 톤과 안 맞았던 문제를 해결하기 위한 공용 확인 모달.
// EventModal.css의 .confirm-card(캘린더 모달)와 같은 톤으로 별도 클래스명을 씀
// (다른 파일에서도 불러 쓰므로 EventModal.css 로드 여부와 무관하게 항상 동작해야 함).
import React from 'react';
import './ConfirmModal.css';

const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  danger = true,
  onConfirm,
  onCancel,
  confirmDisabled = false,
}) => {
  if (!isOpen) return null;

  // 다른 모달 위에 겹쳐 뜨는 경우가 많아(예: SealedMessageDetailModal), 배경 클릭이 이
  // 확인 모달만 닫아야 하고 부모 모달의 오버레이 클릭 핸들러까지 같이 타면 안 됨 —
  // stopPropagation으로 항상 방어.
  const handleOverlayClick = (e) => {
    e.stopPropagation();
    onCancel();
  };

  return (
    <div className="confirm-modal-overlay" onClick={handleOverlayClick}>
      <div className="confirm-modal-card" onClick={(e) => e.stopPropagation()}>
        {title && <p className="confirm-modal-title">{title}</p>}
        <p className="confirm-modal-body">{message}</p>
        <div className="confirm-modal-actions">
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            disabled={confirmDisabled}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
