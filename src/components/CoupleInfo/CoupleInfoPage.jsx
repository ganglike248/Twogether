import React, { useState, useEffect } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { HiUser, HiHeart, HiEnvelope } from 'react-icons/hi2';
import { useAuthContext } from '../../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../../firebase';
import { toast } from 'react-toastify';
import './CoupleInfoPage.css';

const CoupleInfoPage = () => {
  const navigate = useNavigate();
  const { user, userDoc, partnerDoc, coupleDoc } = useAuthContext();
  const [displayName, setDisplayName] = useState('');
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [origName, setOrigName] = useState('');
  const [origDate, setOrigDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const isConnected = coupleDoc?.members?.length === 2;

  useEffect(() => {
    if (userDoc) {
      const name = userDoc.displayName || '';
      setDisplayName(name);
      setOrigName(name);
    }
  }, [userDoc]);

  useEffect(() => {
    if (coupleDoc) {
      const date = coupleDoc.anniversaryDate || '';
      setAnniversaryDate(date);
      setOrigDate(date);
    }
  }, [coupleDoc]);

  const isDirty = displayName !== origName || anniversaryDate !== origDate;

  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowUnsavedModal(true);
    }
  }, [blocker.state]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error('이름을 입력해주세요.');
      return;
    }
    if (!anniversaryDate) {
      toast.error('연애 시작일을 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      await updateDoc(doc(db, 'users', user.uid), { displayName: displayName.trim() });
      if (coupleDoc?.id) {
        await updateDoc(doc(db, 'couples', coupleDoc.id), { anniversaryDate });
      }
      setOrigName(displayName.trim());
      setOrigDate(anniversaryDate);
      toast.success('커플 정보가 저장되었습니다.');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error(`저장 중 오류가 발생했습니다.\n${error?.message || String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelModal = () => {
    setShowUnsavedModal(false);
    if (blocker.state === 'blocked') blocker.reset();
  };

  const handleDiscardAndLeave = () => {
    setShowUnsavedModal(false);
    if (blocker.state === 'blocked') {
      blocker.proceed();
    } else {
      navigate(-1, { replace: true });
    }
  };

  const handleSaveAndLeave = async () => {
    if (!displayName.trim()) {
      toast.error('이름을 입력해주세요.');
      return;
    }
    if (!anniversaryDate) {
      toast.error('연애 시작일을 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      await updateDoc(doc(db, 'users', user.uid), { displayName: displayName.trim() });
      if (coupleDoc?.id) {
        await updateDoc(doc(db, 'couples', coupleDoc.id), { anniversaryDate });
      }
      setShowUnsavedModal(false);
      if (blocker.state === 'blocked') {
        blocker.proceed();
      } else {
        navigate(-1, { replace: true });
      }
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error(`저장 중 오류가 발생했습니다.\n${error?.message || String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="couple-info-page">
      <p className="couple-info-section-label" style={{ marginTop: '0.875rem', marginBottom: '1rem' }}>커플 정보</p>

      {/* 내 정보 + 파트너 (2열) */}
      <div className="couple-info-members-row">
        {/* 나 */}
        <div className="couple-info-member-col">
          <div className="couple-info-section">
            <div className="couple-info-member-heading">나</div>
            <div className="couple-info-field-compact">
              <label className="couple-info-label">
                <HiUser className="couple-info-label-icon" />
                이름
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={20}
                placeholder="이름"
              />
            </div>
            <div className="couple-info-field-compact">
              <label className="couple-info-label">
                <HiEnvelope className="couple-info-label-icon" />
                이메일
              </label>
              <input
                type="text"
                value={user?.email || ''}
                disabled
                className="couple-info-disabled"
              />
            </div>
          </div>
        </div>

        {/* 하트 구분자 */}
        <div className="couple-info-members-heart">
          <HiHeart className="couple-info-heart-icon" />
        </div>

        {/* 파트너 */}
        <div className="couple-info-member-col">
          <div className="couple-info-section">
            <div className="couple-info-member-heading">상대방</div>
            {isConnected && partnerDoc ? (
              <>
                <div className="couple-info-field-compact">
                  <label className="couple-info-label">
                    <HiUser className="couple-info-label-icon" />
                    이름
                  </label>
                  <input
                    type="text"
                    value={partnerDoc.displayName || ''}
                    disabled
                    className="couple-info-disabled"
                  />
                </div>
                <div className="couple-info-field-compact">
                  <label className="couple-info-label">
                    <HiEnvelope className="couple-info-label-icon" />
                    이메일
                  </label>
                  <input
                    type="text"
                    value={partnerDoc.email || ''}
                    disabled
                    className="couple-info-disabled"
                  />
                </div>
              </>
            ) : (
              <div className="couple-info-waiting">
                <span className="couple-info-waiting-emoji">⏳</span>
                <span className="couple-info-waiting-text">연결 대기 중</span>
                {coupleDoc?.inviteCode && (
                  <span className="couple-info-invite-code">{coupleDoc.inviteCode}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 기념일 정보 */}
      <p className="couple-info-section-label">기념일</p>
      <div className="couple-info-section">
        <div className="couple-info-field">
          <label className="couple-info-label">
            <HiHeart className="couple-info-label-icon" />
            연애 시작일
          </label>
          <input
            type="date"
            value={anniversaryDate}
            onChange={(e) => setAnniversaryDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
          <span className="couple-info-hint">변경하면 D+day가 다시 계산됩니다</span>
        </div>
        {coupleDoc?.inviteCode && isConnected && (
          <div className="couple-info-field">
            <label className="couple-info-label">
              <HiHeart className="couple-info-label-icon" />
              초대 코드
            </label>
            <input
              type="text"
              value={coupleDoc.inviteCode}
              disabled
              className="couple-info-disabled couple-info-code"
            />
          </div>
        )}
      </div>

      {/* 저장 버튼 */}
      <button
        onClick={handleSave}
        disabled={loading || !isDirty}
        className="couple-info-save-btn"
      >
        {loading ? '저장 중...' : '저장'}
      </button>

      {/* 변경사항 미저장 모달 */}
      {showUnsavedModal && (
        <div className="couple-info-modal-overlay">
          <div className="couple-info-modal-box">
            <p className="couple-info-modal-title">변경사항이 있어요</p>
            <p className="couple-info-modal-msg">저장하지 않고 나가시겠습니까?</p>
            <div className="couple-info-modal-actions">
              <button
                className="couple-info-modal-btn"
                onClick={handleCancelModal}
              >
                취소
              </button>
              <button
                className="couple-info-modal-btn discard"
                onClick={handleDiscardAndLeave}
              >
                저장 안 함
              </button>
              <button
                className="couple-info-modal-btn save"
                onClick={handleSaveAndLeave}
                disabled={loading}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoupleInfoPage;
