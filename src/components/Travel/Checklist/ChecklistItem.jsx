// src/components/Travel/Checklist/ChecklistItem.jsx
// 체크리스트 항목 — 남은 준비는 항목마다 카드 한 장(ChecklistItem),
// 준비 완료는 한 카드 안에 줄로 나열(CompletedChecklistRow, 누가·언제 완료했는지 표시)
import React from 'react';
import { format } from 'date-fns';
import { MdClose, MdEdit } from 'react-icons/md';
import './ChecklistItem.css';

const PRIORITY = {
  high: { label: '높음', className: 'high' },
  medium: { label: '중간', className: 'medium' },
  low: { label: '낮음', className: 'low' },
};

const CheckMark = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5 9-10" />
  </svg>
);

const ChecklistItem = ({ item, onToggle, onDelete, onEdit }) => {
  const priority = PRIORITY[item.priority] || PRIORITY.medium;
  const subParts = [
    item.dueDate ? `${format(new Date(item.dueDate), 'MM.dd')}까지` : null,
    item.description || null,
  ].filter(Boolean);

  return (
    <div className="ci-card">
      <button className="ci-check" onClick={onToggle} aria-label={`${item.title} 완료로 표시`}>
        <span className="ci-check-circle" />
      </button>
      <div className="ci-text">
        <span className="ci-title">{item.title}</span>
        {subParts.length > 0 && <span className="ci-sub">{subParts.join(' · ')}</span>}
      </div>
      <span className="ci-side">
        <span className={`ci-priority ${priority.className}`}>{priority.label}</span>
        <button className="ci-icon-btn edit" onClick={() => onEdit(item)} aria-label="수정">
          <MdEdit />
        </button>
        <button className="ci-icon-btn delete" onClick={onDelete} aria-label="삭제">
          <MdClose />
        </button>
      </span>
    </div>
  );
};

export const CompletedChecklistRow = ({ item, completerName, onToggle, onDelete }) => {
  const meta = [
    completerName || null,
    item.completedAt ? format(new Date(item.completedAt), 'MM.dd') : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="ci-done-row">
      <button className="ci-check" onClick={onToggle} aria-label={`${item.title} 완료 취소`}>
        <span className="ci-check-circle done"><CheckMark /></span>
      </button>
      <span className="ci-done-title">{item.title}</span>
      <span className="ci-done-side">
        {meta && <span className="ci-done-meta">{meta}</span>}
        <button className="ci-icon-btn done-delete" onClick={onDelete} aria-label="삭제">
          <MdClose />
        </button>
      </span>
    </div>
  );
};

export default ChecklistItem;
