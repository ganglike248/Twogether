// src/components/Travel/AddOptionModal.jsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { MdClose, MdAutoFixHigh } from 'react-icons/md';
import { toast } from 'react-toastify';
import { formatInputNumber, normalizeIfPureNumber } from '../../../utils/numberFormat';
import { extractUrl } from '../../../utils/appLinkUtils';
import { parseSharedText } from '../../../utils/sharedTextParser';
import { getFriendlyErrorMessage } from '../../../utils/errorMessages';
import { fetchLinkPreview } from '../../../services/linkPreviewService';
import './AddOptionModal.css';

const EMPTY_FORM = { title: '', url: '', address: '', description: '', price: '', images: [] };

// 비어 있는 칸만 채움 — 사용자가 이미 적은 내용은 덮어쓰지 않음(사용자 결정)
const fillEmpty = (prev, values, overwriteField = null) => {
  const next = { ...prev };
  Object.entries(values).forEach(([field, value]) => {
    if (!value) return;
    if (field === overwriteField || !prev[field].trim()) next[field] = value;
  });
  return next;
};

const AddOptionModal = ({ isOpen, onClose, onSave, loading }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [imageInput, setImageInput] = useState('');
  const [fetchingPreview, setFetchingPreview] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    const processedValue = field === 'price' ? formatInputNumber(value) : value;
    setFormData(prev => ({ ...prev, [field]: processedValue }));
  };

  // 링크/제목 칸 붙여넣기: 공유 문구면 제목/주소/링크로 나눠서 채움
  // 붙여넣은 칸 자체는 그 값으로 교체하고, 나머지 칸은 비어 있을 때만 채움
  const handleSharedPaste = (field) => (e) => {
    const parsed = parseSharedText(e.clipboardData?.getData('text'));
    if (!parsed) return; // 알아볼 수 없는 텍스트 → 기본 붙여넣기
    e.preventDefault();
    setFormData(prev => fillEmpty(prev, parsed, field));
  };

  const pastedUrl = extractUrl(formData.url);

  const handleFetchPreview = async () => {
    if (!pastedUrl || fetchingPreview) return;
    setFetchingPreview(true);
    try {
      const preview = await fetchLinkPreview(pastedUrl);
      const applyPreview = (prev) => {
        const next = fillEmpty(prev, {
          title: preview.title,
          address: preview.address,
          description: preview.description,
        });
        if (preview.imageUrl && !prev.images.includes(preview.imageUrl)) {
          next.images = [...prev.images, preview.imageUrl];
        }
        return next;
      };
      // 안내 문구용 판단은 응답 시점 폼 기준(업데이트 함수 안의 값은 렌더 전까지 계산되지 않음)
      const expected = applyPreview(formData);
      const changed = ['title', 'address', 'description'].some(f => expected[f] !== formData[f])
        || expected.images.length !== formData.images.length;
      setFormData(applyPreview);
      if (changed) toast.success('링크 정보를 불러왔어요.');
      else toast.info('비어 있는 칸이 없어서 바뀐 내용이 없어요.');
    } catch (error) {
      console.error('Error fetching link preview:', error);
      toast.error(getFriendlyErrorMessage(error, '링크 정보를 불러오지 못했어요. 직접 입력해주세요.'));
    } finally {
      setFetchingPreview(false);
    }
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
        address: formData.address.trim() || '',
        description: formData.description.trim() || '',
        price: normalizeIfPureNumber(formData.price),
        images: formData.images,
        scores: [],
        totalScore: 0,
      });

      setFormData(EMPTY_FORM);
      setImageInput('');
      onClose();
    } catch (error) {
      console.error('Error adding option:', error);
      toast.error('옵션 추가 중 오류가 발생했습니다.');
    }
  };

  return createPortal(
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
              onPaste={handleSharedPaste('title')}
              placeholder="예: 더 클래식 명동"
              className="aom-input"
            />
          </div>

          {/* 링크 — 자유 입력(공유 문구가 섞여도 저장 가능), 표시/클릭 시 http(s) 부분만 추출 */}
          <div className="aom-form-group">
            <label className="aom-label">
              링크
              <span className="aom-label-hint">공유 링크나 공유 문구를 그대로 붙여넣으세요</span>
            </label>
            <input
              type="text"
              inputMode="url"
              value={formData.url}
              onChange={(e) => handleChange('url', e.target.value)}
              onPaste={handleSharedPaste('url')}
              placeholder="https://naver.me/..."
              className="aom-input"
            />
            <button
              type="button"
              className="aom-fetch-btn"
              onClick={handleFetchPreview}
              disabled={!pastedUrl || fetchingPreview || loading}
            >
              <MdAutoFixHigh size={16} />
              {fetchingPreview ? '불러오는 중...' : '정보 불러오기'}
            </button>
          </div>

          {/* 주소 — 일정에 추가할 때 '위치'로 옮겨짐 */}
          <div className="aom-form-group">
            <label className="aom-label">주소</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="예: 서울 중구 명동길 14"
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
            <label className="aom-label">가격 (원)</label>
            <input
              type="text"
              inputMode="numeric"
              value={formData.price}
              onChange={(e) => handleChange('price', e.target.value)}
              placeholder="예: 150,000"
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
              <div className="aom-images-preview">
                {formData.images.map((img, idx) => (
                  <div key={idx} className="aom-image-preview-item">
                    <img src={img} alt={`Preview ${idx + 1}`} className="aom-image-thumb" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="aom-remove-image-btn"
                      disabled={loading}
                      title="이미지 제거"
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
    </div>,
    document.body
  );
};

export default AddOptionModal;
