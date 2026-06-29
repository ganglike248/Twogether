// src/components/Travel/EditOptionModal.jsx
import React, { useState } from 'react';
import { MdClose } from 'react-icons/md';
import './EditOptionModal.css';

const EditOptionModal = ({ isOpen, onClose, option, onSave }) => {
  const [formData, setFormData] = useState({
    title: option.title || '',
    url: option.url || '',
    description: option.description || '',
    price: option.price || '',
    image: option.image || '',
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        title: formData.title.trim(),
        url: formData.url.trim() || '',
        description: formData.description.trim() || '',
        price: formData.price.trim() || '',
        image: formData.image.trim() || '',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-option-modal-overlay">
      <div className="edit-option-modal-container">
        <div className="eom-header">
          <h2 className="eom-title">옵션 수정</h2>
          <button className="eom-close" onClick={onClose}>
            <MdClose size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="eom-form">
          {/* 제목 */}
          <div className="eom-form-group">
            <label className="eom-label">제목</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="예: 더 클래식 명동"
              className="eom-input"
              autoFocus
            />
          </div>

          {/* URL */}
          <div className="eom-form-group">
            <label className="eom-label">URL</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => handleChange('url', e.target.value)}
              placeholder="https://example.com"
              className="eom-input"
            />
          </div>

          {/* 설명 */}
          <div className="eom-form-group">
            <label className="eom-label">설명</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="숙소 설명, 메뉴 정보 등"
              className="eom-input"
            />
          </div>

          {/* 가격 */}
          <div className="eom-form-group">
            <label className="eom-label">가격</label>
            <input
              type="text"
              value={formData.price}
              onChange={(e) => handleChange('price', e.target.value)}
              placeholder="예: ₩150,000/박"
              className="eom-input"
            />
          </div>

          {/* 이미지 URL */}
          <div className="eom-form-group">
            <label className="eom-label">이미지 URL</label>
            <input
              type="url"
              value={formData.image}
              onChange={(e) => handleChange('image', e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="eom-input"
            />
          </div>

          {/* 버튼 */}
          <div className="eom-actions">
            <button
              type="button"
              className="eom-btn cancel"
              onClick={onClose}
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className="eom-btn submit"
              disabled={loading}
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOptionModal;
