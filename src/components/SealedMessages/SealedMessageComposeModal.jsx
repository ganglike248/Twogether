import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { HiPencilSquare, HiXMark } from 'react-icons/hi2';
import { useAuthContext } from '../../contexts/AuthContext';
import useDoubleClickPrevention from '../../hooks/useDoubleClickPrevention';
import useAnalytics from '../../hooks/useAnalytics';
import { createSealedMessage } from '../../services/sealedMessageService';
import UnlockTimePicker from './UnlockTimePicker';
import './sealed-message-modal.css';

// 예약 시각 기본값: 지금부터 1시간 뒤를 가장 가까운 15분 단위로 올림 (checkSealedMessages가 15분마다만 돎)
const defaultUnlockAtLocal = () => {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d - tzOffset).toISOString().slice(0, 16);
};

const SealedMessageComposeModal = ({ onClose }) => {
  const { user, coupleId, partnerDoc } = useAuthContext();
  const { logEvent } = useAnalytics();
  const canClick = useDoubleClickPrevention(800);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [unlockMode, setUnlockMode] = useState('scheduled'); // 'scheduled' | 'manual'
  const [unlockAtLocal, setUnlockAtLocal] = useState(defaultUnlockAtLocal);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const isPastUnlock = unlockMode === 'scheduled' && unlockAtLocal && new Date(unlockAtLocal) <= new Date();

  const handleSubmit = async () => {
    if (!canClick()) return;
    if (!title.trim()) { toast.warning('제목을 입력해주세요.'); return; }
    if (!content.trim()) { toast.warning('내용을 입력해주세요.'); return; }
    if (!partnerDoc?.id) { toast.error('파트너 정보를 불러올 수 없습니다.'); return; }
    if (unlockMode === 'scheduled') {
      if (!unlockAtLocal) { toast.warning('공개 시각을 선택해주세요.'); return; }
      if (isPastUnlock) { toast.warning('이미 지난 시각은 예약할 수 없어요.'); return; }
    }

    setIsSubmitting(true);
    try {
      await createSealedMessage({
        coupleId,
        authorUid: user.uid,
        recipientUid: partnerDoc.id,
        title: title.trim(),
        content: content.trim(),
        imageFile,
        unlockAt: unlockMode === 'scheduled' && unlockAtLocal ? new Date(unlockAtLocal) : null,
      });
      logEvent('sealed_message_created', { hasImage: !!imageFile, unlockMode });
      toast.success('편지를 봉인했어요!');
      onClose();
    } catch (error) {
      console.error('봉인 편지 작성 실패:', error);
      toast.error('편지를 봉인하는 중 오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sm-modal-overlay" onClick={onClose}>
      <div className="sm-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="sm-modal-header">
          <HiPencilSquare className="sm-modal-icon" />
          <h2 className="sm-modal-title">편지 봉인하기</h2>
          <button className="sm-modal-close" onClick={onClose}>
            <HiXMark />
          </button>
        </div>
        <div className="sm-modal-body">
          <input
            className="sm-modal-input"
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={50}
          />
          <textarea
            className="sm-modal-textarea"
            placeholder="파트너에게 전할 이야기를 적어보세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
          />

          <div>
            <label className="sm-modal-label">사진 (선택)</label>
            <div className="sm-image-picker" style={{ marginTop: '0.5rem' }}>
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="첨부 미리보기" className="sm-image-preview" />
                  <button className="sm-image-remove" onClick={handleRemoveImage}>제거</button>
                </>
              ) : (
                <label className="sm-image-picker-label">
                  사진 선택
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="sm-modal-label">공개 방식</label>
            <div className="sm-unlock-mode" style={{ marginTop: '0.5rem' }}>
              <button
                className={`sm-unlock-mode-btn ${unlockMode === 'scheduled' ? 'active' : ''}`}
                onClick={() => setUnlockMode('scheduled')}
              >
                시각 예약
              </button>
              <button
                className={`sm-unlock-mode-btn ${unlockMode === 'manual' ? 'active' : ''}`}
                onClick={() => setUnlockMode('manual')}
              >
                직접 공개
              </button>
            </div>
          </div>

          {unlockMode === 'scheduled' ? (
            <>
              <UnlockTimePicker value={unlockAtLocal} onChange={setUnlockAtLocal} />
              {isPastUnlock ? (
                <p className="sm-time-warning">이미 지난 시각이에요. 다른 시각을 선택해주세요.</p>
              ) : (
                <p className="sm-time-hint">열람 알림은 선택한 시각에서 최대 5분 정도 오차가 생길 수 있어요.</p>
              )}
            </>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', margin: 0 }}>
              봉인 편지함에서 원할 때 직접 "지금 공개"를 눌러 열 수 있어요.
              나중에 시각 예약으로 바꿀 수도 있어요.
            </p>
          )}

          <div className="sm-modal-actions">
            <button className="sm-btn sm-btn-cancel" onClick={onClose}>취소</button>
            <button className="sm-btn sm-btn-primary" onClick={handleSubmit} disabled={isSubmitting || isPastUnlock}>
              {isSubmitting ? '봉인 중...' : '봉인하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SealedMessageComposeModal;
