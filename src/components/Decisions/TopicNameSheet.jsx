// src/components/Decisions/TopicNameSheet.jsx — 주제 이름 바꾸기
import React, { useState } from 'react';
import { useDialog } from '../../hooks/useDialog';

const TopicNameSheet = ({ initial, onSave, onClose }) => {
  const dialogRef = useDialog(true, onClose);
  const [title, setTitle] = useState(initial || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    const ok = await onSave(title);
    if (!ok) setSaving(false);
  };

  return (
    <div className="dcs-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dcs-sheet" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="주제 이름 바꾸기">
        <div className="dcs-grabber" />
        <div className="dcs-head">
          <span className="dcs-title">주제 이름 바꾸기</span>
          <button type="button" className="dcs-close" onClick={onClose} aria-label="닫기">×</button>
        </div>
        <label className="dcs-sr" htmlFor="dcs-topic-name">주제 이름</label>
        <input
          id="dcs-topic-name"
          className="dcs-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
          maxLength={40}
        />
        <div className="dcs-actions">
          <button type="button" className="dcs-btn" onClick={onClose} disabled={saving}>취소</button>
          <button type="button" className="dcs-btn primary" onClick={save} disabled={!title.trim() || saving}>저장</button>
        </div>
      </div>
    </div>
  );
};

export default TopicNameSheet;
