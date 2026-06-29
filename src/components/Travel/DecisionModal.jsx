// src/components/Travel/DecisionModal.jsx
import React, { useState } from 'react';
import { MdClose, MdHotel, MdRestaurant, MdEmojiFlags, MdDirectionsCar, MdPushPin } from 'react-icons/md';
import { toast } from 'react-toastify';
import './DecisionModal.css';

const categories = [
  { value: 'accommodation', label: '숙소', icon: MdHotel },
  { value: 'restaurant', label: '식당', icon: MdRestaurant },
  { value: 'activity', label: '액티비티', icon: MdEmojiFlags },
  { value: 'transport', label: '교통', icon: MdDirectionsCar },
  { value: 'custom', label: '기타', icon: MdPushPin },
];

const DecisionModal = ({ isOpen, onClose, tripId, coupleId, onSave }) => {
  const [formData, setFormData] = useState({
    category: 'accommodation',
    title: '',
    description: '',
  });

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCategoryChange = (e) => {
    setFormData(prev => ({ ...prev, category: e.target.value }));
  };

  const handleTitleChange = (e) => {
    setFormData(prev => ({ ...prev, title: e.target.value }));
  };

  const handleDescriptionChange = (e) => {
    setFormData(prev => ({ ...prev, description: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('카테고리 제목을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        category: formData.category,
        title: formData.title,
        description: formData.description,
        options: [],
      });
    } catch (error) {
      console.error('Error creating decision:', error);
      toast.error('카테고리 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="decision-modal-overlay">
      <div className="decision-modal-container">
        <div className="decision-modal-header">
          <h2 className="decision-modal-title">새로운 비교 주제 추가</h2>
          <button className="decision-modal-close" onClick={onClose}>
            <MdClose size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="decision-modal-form">
          {/* 카테고리 */}
          <div className="dm-form-group">
            <label className="dm-label">카테고리</label>
            <select
              value={formData.category}
              onChange={handleCategoryChange}
              className="dm-select"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* 제목 */}
          <div className="dm-form-group">
            <label className="dm-label">주제 (예: 숙소 선택)</label>
            <input
              type="text"
              value={formData.title}
              onChange={handleTitleChange}
              placeholder="예: 서울 숙소 비교"
              className="dm-input"
            />
          </div>

          {/* 설명 */}
          <div className="dm-form-group">
            <label className="dm-label">설명 (선택)</label>
            <input
              type="text"
              value={formData.description}
              onChange={handleDescriptionChange}
              placeholder="예: 강남역 근처 5성 호텔"
              className="dm-input"
            />
          </div>


          {/* 버튼 */}
          <div className="dm-actions">
            <button
              type="button"
              className="dm-btn cancel"
              onClick={onClose}
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className="dm-btn submit"
              disabled={loading}
            >
              {loading ? '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DecisionModal;
