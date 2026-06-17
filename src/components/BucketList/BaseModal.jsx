import React from 'react';
import { MdClose } from 'react-icons/md';
import { useModalBackButton } from '../../hooks/useModalBackButton';

function BaseModal({ isOpen, onClose, title, icon: Icon, iconColor, children, className = '' }) {
  useModalBackButton(isOpen, onClose);
  if (!isOpen) return null;

  return (
    <div className="bucket-modal-overlay" onClick={onClose}>
      <div className={`bucket-modal-box ${className}`} onClick={(e) => e.stopPropagation()}>
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
