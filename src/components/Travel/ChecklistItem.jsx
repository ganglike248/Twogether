// src/components/Travel/ChecklistItem.jsx
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MdEdit, MdClose, MdCheckCircle } from 'react-icons/md';
import './ChecklistItem.css';

const priorityConfig = {
  high: { label: '높음', color: '#ff6b6b' },
  medium: { label: '중간', color: '#ffa940' },
  low: { label: '낮음', color: '#4dabf7' },
};

const ChecklistItem = ({ item, onToggle, onDelete, onEdit }) => {
  const priorityInfo = priorityConfig[item.priority] || priorityConfig.medium;

  const getCompletedInfo = () => {
    if (!item.completed) return null;
    const timeAgo = formatDistanceToNow(new Date(item.completedAt), {
      locale: ko,
      addSuffix: true,
    });
    return timeAgo;
  };

  return (
    <div className={`checklist-item ${item.completed ? 'completed' : ''}`}>
      {/* 체크박스 */}
      <input
        type="checkbox"
        className="ci-checkbox"
        checked={item.completed}
        onChange={onToggle}
      />

      {/* 콘텐츠 */}
      <div className="ci-content">
        <div className="ci-header">
          <h4 className="ci-title">{item.title}</h4>
          {item.priority && (
            <span className="ci-priority" style={{ color: priorityInfo.color }}>
              {priorityInfo.label}
            </span>
          )}
        </div>

        {item.description && (
          <p className="ci-description">{item.description}</p>
        )}

        {item.completed && (
          <p className="ci-completed-info">
            <MdCheckCircle style={{ display: 'inline', marginRight: '0.25rem', fontSize: '0.875rem' }} />
            {getCompletedInfo()}
          </p>
        )}

        {item.dueDate && !item.completed && (
          <p className="ci-due-date">
            마감: {new Date(item.dueDate).toLocaleDateString('ko-KR')}
          </p>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="ci-actions">
        <button
          className="ci-edit-btn"
          onClick={() => onEdit(item)}
          title="수정"
        >
          <MdEdit />
        </button>
        <button
          className="ci-delete-btn"
          onClick={onDelete}
          title="삭제"
        >
          <MdClose />
        </button>
      </div>
    </div>
  );
};

export default ChecklistItem;
