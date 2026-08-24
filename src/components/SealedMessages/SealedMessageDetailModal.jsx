import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { HiEnvelopeOpen, HiXMark, HiLockClosed } from 'react-icons/hi2';
import { useAuthContext } from '../../contexts/AuthContext';
import useDoubleClickPrevention from '../../hooks/useDoubleClickPrevention';
import {
  getSealedMessageContent,
  updateUnlockAt,
  unlockSealedMessageNow,
  deleteSealedMessage,
} from '../../services/sealedMessageService';
import UnlockTimePicker from './UnlockTimePicker';
import './sealed-message-modal.css';

const toLocalInputValue = (timestamp) => {
  if (!timestamp) return '';
  const d = timestamp.toDate();
  d.setSeconds(0, 0);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d - tzOffset).toISOString().slice(0, 16);
};

const SealedMessageDetailModal = ({ message, onClose }) => {
  const { user, coupleId } = useAuthContext();
  const canClick = useDoubleClickPrevention(800);

  const isAuthor = message.authorUid === user?.uid;
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlockAtLocal, setUnlockAtLocal] = useState(() => toLocalInputValue(message.unlockAt));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSealedMessageContent(message.id)
      .then((data) => { if (!cancelled) setContent(data); })
      .catch((error) => {
        console.error('편지 내용 조회 실패:', error);
        if (!cancelled) toast.error('편지 내용을 불러올 수 없습니다.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [message.id]);

  const isPastUnlock = unlockAtLocal && new Date(unlockAtLocal) <= new Date();

  const handleSaveUnlockAt = async () => {
    if (!canClick()) return;
    if (isPastUnlock) { toast.warning('이미 지난 시각은 예약할 수 없어요.'); return; }
    setIsSaving(true);
    try {
      await updateUnlockAt(message.id, unlockAtLocal ? new Date(unlockAtLocal) : null);
      toast.success('예약 시각을 수정했어요.');
    } catch (error) {
      console.error('예약 시각 수정 실패:', error);
      toast.error('예약 시각 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canClick()) return;
    if (!window.confirm('편지를 삭제할까요? 되돌릴 수 없어요.')) return;
    setIsDeleting(true);
    try {
      await deleteSealedMessage(message.id, coupleId);
      toast.success('편지를 삭제했어요.');
      onClose();
    } catch (error) {
      console.error('편지 삭제 실패:', error);
      toast.error('삭제하는 중 오류가 발생했습니다.');
      setIsDeleting(false);
    }
  };

  const handleUnlockNow = async () => {
    if (!canClick()) return;
    if (!window.confirm('지금 바로 공개할까요? 한번 공개하면 되돌릴 수 없어요.')) return;
    setIsSaving(true);
    try {
      await unlockSealedMessageNow(message.id);
      toast.success('편지를 공개했어요!');
      onClose();
    } catch (error) {
      console.error('즉시 공개 실패:', error);
      toast.error('공개하는 중 오류가 발생했습니다.');
      setIsSaving(false);
    }
  };

  return (
    <div className="sm-modal-overlay" onClick={onClose}>
      <div className="sm-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="sm-modal-header">
          <HiEnvelopeOpen className="sm-modal-icon" />
          <h2 className="sm-modal-title">{message.title}</h2>
          <button className="sm-modal-close" onClick={onClose}>
            <HiXMark />
          </button>
        </div>
        <div className="sm-modal-body">
          {loading ? (
            <p style={{ color: 'var(--text-sub)', fontSize: '0.85rem' }}>불러오는 중...</p>
          ) : !content ? (
            <div className="sm-detail-locked">
              <HiLockClosed className="sm-detail-locked-icon" />
              <span>아직 봉인 중이에요</span>
            </div>
          ) : (
            <>
              {content.imageUrl && (
                <img src={content.imageUrl} alt="첨부 사진" className="sm-detail-image" />
              )}
              <p className="sm-detail-content">{content.content}</p>
              <p className="sm-detail-meta">
                {message.createdAt && format(message.createdAt.toDate(), 'yyyy.M.d HH:mm', { locale: ko })} 작성
                {message.isUnlocked && message.unlockedAt && (
                  <> · {format(message.unlockedAt.toDate(), 'yyyy.M.d HH:mm', { locale: ko })} 공개</>
                )}
                {!message.isUnlocked && ' · 아직 나만 볼 수 있어요'}
              </p>
            </>
          )}

          {isAuthor && !message.isUnlocked && (
            <div className="sm-author-controls">
              <label className="sm-modal-label">예약 시각 수정</label>
              <UnlockTimePicker value={unlockAtLocal} onChange={setUnlockAtLocal} />
              {isPastUnlock ? (
                <p className="sm-time-warning">이미 지난 시각이에요. 다른 시각을 선택해주세요.</p>
              ) : (
                <p className="sm-time-hint">열람 알림은 선택한 시각에서 최대 5분 정도 오차가 생길 수 있어요.</p>
              )}
              <div className="sm-modal-actions" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                <button className="sm-btn sm-btn-cancel" onClick={handleSaveUnlockAt} disabled={isSaving || isPastUnlock}>
                  시각 저장
                </button>
                <button className="sm-btn sm-btn-unlock" onClick={handleUnlockNow} disabled={isSaving}>
                  지금 공개
                </button>
              </div>
            </div>
          )}

          {isAuthor && (
            <button className="sm-delete-text" onClick={handleDelete} disabled={isDeleting}>
              편지 삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SealedMessageDetailModal;
