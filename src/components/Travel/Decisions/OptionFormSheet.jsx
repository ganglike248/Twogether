// src/components/Travel/Decisions/OptionFormSheet.jsx
// 후보 추가/수정 시트 (예전 AddOptionModal + EditOptionModal을 하나로 통합).
// - 추가: 상단 "링크로 자동 채우기" 카드(입력값이 곧 저장 링크) → 또는 직접 입력 → 사진·제목·설명·주소·가격
// - 수정: 링크 카드 없이 사진·제목·설명·링크·주소·가격 (사용자가 정한 순서)
// 정보 불러오기/공유 문구 붙여넣기는 비어 있는 칸만 채움(사용자 결정 — 이미 적은 내용은 덮어쓰지 않음)
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { formatInputNumber, normalizeIfPureNumber } from '../../../utils/numberFormat';
import { extractUrl } from '../../../utils/appLinkUtils';
import { parseSharedText } from '../../../utils/sharedTextParser';
import { fetchLinkPreview } from '../../../services/linkPreviewService';
import LinkFillCard from './LinkFillCard';
import PhotoAddSheet from './PhotoAddSheet';
import './OptionFormSheet.css';
import AutoGrowTextarea from '../../common/AutoGrowTextarea';

const EMPTY_FORM = { title: '', url: '', address: '', description: '', price: '', images: [] };

const fillEmpty = (prev, values, overwriteField = null) => {
  const next = { ...prev };
  Object.entries(values).forEach(([field, value]) => {
    if (!value) return;
    if (field === overwriteField || !prev[field].trim()) next[field] = value;
  });
  return next;
};

const toForm = (option) => ({
  title: option.title || '',
  url: option.url || '',
  address: option.address || '',
  description: option.description || '',
  price: option.price ? formatInputNumber(String(option.price)) : '',
  images: option.images || [],
});

const OptionFormSheet = ({ mode, topicTitle, option, onSave, onClose }) => {
  const isEdit = mode === 'edit';
  const [formData, setFormData] = useState(() => (isEdit ? toForm(option) : EMPTY_FORM));
  const [linkStatus, setLinkStatus] = useState('input'); // 'input' | 'filled' | 'failed'
  const [linkChanged, setLinkChanged] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);

  const setField = (field, value) => {
    const processed = field === 'price' ? formatInputNumber(value) : value;
    setFormData(prev => ({ ...prev, [field]: processed }));
  };

  // 공유 문구(네이버지도 등) 붙여넣기 → 제목/주소/링크로 나눠 채움. 붙여넣은 칸만 교체, 나머지는 빈 칸만
  const handleSharedPaste = (field) => (e) => {
    const parsed = parseSharedText(e.clipboardData?.getData('text'));
    if (!parsed) return;
    e.preventDefault();
    setFormData(prev => fillEmpty(prev, parsed, field));
  };

  const linkUrl = extractUrl(formData.url);

  const handleChangeLink = (value) => {
    setField('url', value);
    if (linkStatus === 'failed') setLinkStatus('input');
  };

  const handleFetch = async () => {
    if (!linkUrl || fetching) return;
    setFetching(true);
    try {
      const preview = await fetchLinkPreview(linkUrl);
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
      // 안내 문구용 판단은 응답 시점 폼 기준
      const expected = applyPreview(formData);
      setLinkChanged(['title', 'address', 'description'].some(f => expected[f] !== formData[f])
        || expected.images.length !== formData.images.length);
      setFormData(applyPreview);
      setLinkStatus('filled');
    } catch (error) {
      console.error('Error fetching link preview:', error);
      setLinkStatus('failed');
    } finally {
      setFetching(false);
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleAddImage = (url) => {
    setFormData(prev => ({ ...prev, images: [...prev.images, url] }));
    setPhotoSheetOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    if (saving) return;

    const fields = {
      title: formData.title.trim(),
      url: formData.url.trim(),
      address: formData.address.trim(),
      description: formData.description.trim(),
      price: normalizeIfPureNumber(formData.price),
      images: formData.images,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await onSave(fields);
      } else {
        await onSave({
          id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...fields,
          scores: [],
          totalScore: 0,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = !!formData.title.trim() && !saving;
  const submitLabel = isEdit ? (saving ? '저장 중...' : '저장') : (saving ? '추가 중...' : '후보 추가');

  return createPortal(
    <div className="ofs-overlay">
      <form className="ofs-sheet" onSubmit={handleSubmit} role="dialog" aria-label={isEdit ? '후보 수정' : '후보 추가'}>
        <div className="ofs-grabber" />
        <div className="ofs-header">
          <span />
          <span className="ofs-header-text">
            <span className="ofs-header-title">{isEdit ? '후보 수정' : '후보 추가'}</span>
            {topicTitle && <span className="ofs-header-sub">{topicTitle}</span>}
          </span>
          <button type="button" className="ofs-close" onClick={onClose} aria-label="닫기">×</button>
        </div>

        <div className="ofs-scroll">
          {!isEdit && (
            <>
              <LinkFillCard
                url={formData.url}
                status={linkStatus}
                changed={linkChanged}
                fetching={fetching}
                canFetch={!!linkUrl}
                onChangeUrl={handleChangeLink}
                onPasteUrl={handleSharedPaste('url')}
                onFetch={handleFetch}
                onEdit={() => setLinkStatus('input')}
              />
              {linkStatus !== 'filled' && (
                <div className="ofs-divider">
                  <span />{linkStatus === 'failed' ? '직접 입력' : '또는 직접 입력'}<span />
                </div>
              )}
            </>
          )}

          <div className="ofs-field">
            <span className="ofs-label">
              사진{formData.images.length > 0 && <span className="ofs-label-count"> · {formData.images.length}장</span>}
            </span>
            <div className="ofs-photos">
              {formData.images.map((src, idx) => (
                <span key={`${src}-${idx}`} className="ofs-photo">
                  <img src={src} alt={`사진 ${idx + 1}`} />
                  {idx === 0 && <span className="ofs-photo-main">대표</span>}
                  <button type="button" className="ofs-photo-remove" onClick={() => handleRemoveImage(idx)} aria-label="사진 제거">×</button>
                </span>
              ))}
              <button type="button" className="ofs-photo-add" onClick={() => setPhotoSheetOpen(true)}>
                <span className="ofs-photo-add-plus">＋</span>사진 추가
              </button>
            </div>
          </div>

          <label className="ofs-field">
            <span className="ofs-label">제목 <span className="ofs-required">*</span></span>
            <input
              type="text"
              className="ofs-input"
              value={formData.title}
              onChange={(e) => setField('title', e.target.value)}
              onPaste={handleSharedPaste('title')}
              placeholder="예: 경포 오션뷰 호텔"
            />
          </label>

          <label className="ofs-field">
            <span className="ofs-label">설명</span>
            <AutoGrowTextarea
              className={`ofs-textarea ${isEdit ? 'tall' : ''}`}
              value={formData.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="숙소 설명, 메뉴 정보 등"
            />
          </label>

          {isEdit && (
            <label className="ofs-field">
              <span className="ofs-label">링크</span>
              <input
                type="text"
                inputMode="url"
                className="ofs-input link"
                value={formData.url}
                onChange={(e) => setField('url', e.target.value)}
                onPaste={handleSharedPaste('url')}
                placeholder="https://naver.me/..."
              />
            </label>
          )}

          <label className="ofs-field">
            <span className="ofs-label">주소</span>
            <input
              type="text"
              className="ofs-input"
              value={formData.address}
              onChange={(e) => setField('address', e.target.value)}
              placeholder="예: 강원 강릉시 창해로 307"
            />
          </label>

          <label className="ofs-field">
            <span className="ofs-label">가격</span>
            <span className="ofs-price-wrap">
              <input
                type="text"
                inputMode="numeric"
                className="ofs-input price"
                value={formData.price}
                onChange={(e) => setField('price', e.target.value)}
                placeholder="150,000"
              />
              <span className={`ofs-price-unit ${formData.price ? 'filled' : ''}`}>원</span>
            </span>
          </label>
        </div>

        <div className="ofs-footer">
          <button type="button" className="ofs-btn cancel" onClick={onClose} disabled={saving}>취소</button>
          <button type="submit" className="ofs-btn submit" disabled={!canSubmit}>{submitLabel}</button>
        </div>
      </form>

      {photoSheetOpen && (
        <PhotoAddSheet
          existing={formData.images}
          onAdd={handleAddImage}
          onClose={() => setPhotoSheetOpen(false)}
        />
      )}
    </div>,
    document.body
  );
};

export default OptionFormSheet;
