// src/components/BucketList/BucketSheet.jsx
// '하고 싶은 것' 아래에서 올라오는 시트 공통 틀 — 배경 누르면 닫힘, Esc·포커스는 useDialog, 바닥 safe-area는 footer에만.
import React from 'react';
import { useDialog } from '../../hooks/useDialog';

const BucketSheet = ({ open, onClose, label, children, footer }) => {
  const ref = useDialog(open, onClose);
  if (!open) return null;
  return (
    <div className="bk-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bk-sheet" ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        <span className="bk-grabber" aria-hidden="true" />
        <div className="bk-sheet-body">{children}</div>
        {footer && <div className="bk-sheet-foot">{footer}</div>}
      </div>
    </div>
  );
};

export default BucketSheet;
