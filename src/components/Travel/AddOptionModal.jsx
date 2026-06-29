// src/components/Travel/AddOptionModal.jsx
import React, { useState } from 'react';
import { MdClose } from 'react-icons/md';
import { toast } from 'react-toastify';
import './AddOptionModal.css';

const AddOptionModal = ({ isOpen, onClose, onSave, loading }) => {
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    price: '',
    images: [],
  });
  const [imageInput, setImageInput] = useState('');

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddImage = () => {
    if (imageInput.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, imageInput.trim()],
      }));
      setImageInput('');
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('선택지 제목을 입력해주세요.');
      return;
    }

    try {
      await onSave({
        id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: formData.title.trim(),
        url: formData.url.trim() || '',
        description: formData.description.trim() || '',
        price: formData.price.trim() || '',
        images: formData.images,
        scores: [],
        totalScore: 0,
      });

      setFormData({ title: '', url: '', description: '', price: '', images: [] });
      setImageInput('');
      onClose();
      toast.success('옵션이 추가되었습니다.');
    } catch (error) {
      console.error('Error adding option:', error);
      toast.error('옵션 추가 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="add-option-modal-overlay">
      <div className="add-option-modal-container">
        <div className="aom-header">
          <h2 className="aom-title">새로운 옵션 추가</h2>
          <button className="aom-close" onClick={onClose}>
            <MdClose size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="aom-form">
          {/* 제목 */}
          <div className="aom-form-group">
            <label className="aom-label">제목 (필수)</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="예: 더 클래식 명동"
              className="aom-input"
              autoFocus
            />
          </div>

          {/* URL */}
          <div className="aom-form-group">
            <label className="aom-label">URL</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => handleChange('url', e.target.value)}
              placeholder="https://example.com"
              className="aom-input"
            />
          </div>

          {/* 설명 */}
          <div className="aom-form-group">
            <label className="aom-label">설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="숙소 설명, 메뉴 정보 등"
              className="aom-textarea"
              rows="3"
            />
          </div>

          {/* 가격 */}
          <div className="aom-form-group">
            <label className="aom-label">가격</label>
            <input
              type="text"
              value={formData.price}
              onChange={(e) => handleChange('price', e.target.value)}
              placeholder="예: ₩150,000/박"
              className="aom-input"
            />
          </div>

          {/* 이미지들 */}
          <div className="aom-form-group">
            <label className="aom-label">
              이미지 URL
              <span className="aom-label-hint">이미지 꾹 누르기(우클릭) → '이미지 주소 복사' 선택</span>
            </label>
            <div className="aom-image-input-group">
              <input
                type="url"
                value={imageInput}
                onChange={(e) => setImageInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="aom-input"
                onKeyPress={(e) => e.key === 'Enter' && handleAddImage()}
              />
              <button
                type="button"
                onClick={handleAddImage}
                className="aom-add-image-btn"
                disabled={loading}
              >
                추가
              </button>
            </div>

            {/* 추가된 이미지 목록 */}
            {formData.images.length > 0 && (
              <div className="aom-images-list">
                {formData.images.map((img, idx) => (
                  <div key={idx} className="aom-image-item">
                    <span className="aom-image-url">{img}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="aom-remove-image-btn"
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="aom-actions">
            <button
              type="button"
              className="aom-btn cancel"
              onClick={onClose}
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className="aom-btn submit"
              disabled={loading}
            >
              {loading ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOptionModal;
