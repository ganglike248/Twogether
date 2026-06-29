// src/components/Travel/ChecklistModal.jsx
import React, { useState } from 'react';
import { MdClose, MdCircle } from 'react-icons/md';
import { toast } from 'react-toastify';
import './ChecklistModal.css';

const ChecklistModal = ({ isOpen, onClose, onSave, editingItem }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
  });
  const [loading, setLoading] = useState(false);

  // 수정 모드 초기화
  React.useEffect(() => {
    if (editingItem) {
      setFormData({
        title: editingItem.title || '',
        description: editingItem.description || '',
        priority: editingItem.priority || 'medium',
        dueDate: editingItem.dueDate ? new Date(editingItem.dueDate).toISOString().split('T')[0] : '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
      });
    }
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const isEditing = !!editingItem;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('항목명을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const saveData = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        dueDate: formData.dueDate ? new Date(formData.dueDate).getTime() : null,
      };

      if (isEditing) {
        // 수정 모드: itemId 포함
        await onSave({
          ...saveData,
          itemId: editingItem.id,
        });
      } else {
        // 추가 모드
        await onSave(saveData);
      }
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('항목 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checklist-modal-overlay">
      <div className="checklist-modal-container">
        <div className="checklist-modal-header">
          <h2 className="checklist-modal-title">
            {isEditing ? '항목 수정' : '새 항목 추가'}
          </h2>
          <button className="checklist-modal-close" onClick={onClose}>
            <MdClose size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="checklist-modal-form">
          {/* 항목명 */}
          <div className="cm-form-group">
            <label className="cm-label">항목명 (필수)</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="예: 항공권 예약"
              className="cm-input"
              autoFocus
            />
          </div>

          {/* 설명 */}
          <div className="cm-form-group">
            <label className="cm-label">설명 (선택)</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="예: 인천-오사카 왕복"
              className="cm-input"
            />
          </div>

          {/* 우선순위 */}
          <div className="cm-form-group">
            <label className="cm-label">우선순위</label>
            <select
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              className="cm-select"
            >
              <option value="high">높음</option>
              <option value="medium">중간</option>
              <option value="low">낮음</option>
            </select>
          </div>

          {/* 마감일 */}
          <div className="cm-form-group">
            <label className="cm-label">마감일 (선택)</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleChange('dueDate', e.target.value)}
              className="cm-input"
            />
          </div>

          {/* 버튼 */}
          <div className="cm-actions">
            <button
              type="button"
              className="cm-btn cancel"
              onClick={onClose}
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className="cm-btn submit"
              disabled={loading}
            >
              {loading ? '저장 중...' : isEditing ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChecklistModal;
