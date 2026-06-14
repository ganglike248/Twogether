// src/components/Profile/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { toast } from 'react-toastify';
import { HiCamera, HiLockClosed, HiPencil } from 'react-icons/hi2';
import { db, auth } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import { uploadHeroImage, removeHeroImage } from '../../services/storageService';
import useHeroImage from '../../hooks/useHeroImage';
import ChangePasswordModal from './ChangePasswordModal';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, userDoc, coupleDoc, coupleId } = useAuthContext();

  // 텍스트 필드
  const [displayName, setDisplayName] = useState('');
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [origName, setOrigName] = useState('');
  const [origDate, setOrigDate] = useState('');

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showHeroDeleteModal, setShowHeroDeleteModal] = useState(false);

  const {
    pendingHeroFile,
    pendingHeroDelete,
    displayHeroUrl,
    heroInputRef,
    handleHeroClick,
    handleHeroFileChange,
    confirmHeroDelete,
    resetPending,
  } = useHeroImage(coupleDoc?.heroImageUrl || null);

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

  const isDirty =
    displayName !== origName ||
    anniversaryDate !== origDate ||
    pendingHeroFile !== null ||
    pendingHeroDelete;

  // React Router 네비게이션 차단 (nav바, 헤더, 뒤로가기 버튼 포함)
  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowUnsavedModal(true);
    }
  }, [blocker.state]);

  const handleHeroDelete = () => {
    setShowHeroDeleteModal(true);
  };

  const handleConfirmHeroDelete = () => {
    confirmHeroDelete();
    setShowHeroDeleteModal(false);
  };

  // ─── 저장 ─────────────────────────────────────────────────

  const saveProfile = async () => {
    if (!displayName.trim()) return false;
    setLoading(true);
    try {
      await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      await updateDoc(doc(db, 'users', user.uid), { displayName: displayName.trim() });
      if (coupleId && anniversaryDate) {
        await updateDoc(doc(db, 'couples', coupleId), { anniversaryDate });
      }

      if (pendingHeroFile) {
        const url = await uploadHeroImage(coupleId, pendingHeroFile);
        await updateDoc(doc(db, 'couples', coupleId), { heroImageUrl: url });
        resetPending();
      } else if (pendingHeroDelete) {
        await removeHeroImage(coupleId);
        await updateDoc(doc(db, 'couples', coupleId), { heroImageUrl: null });
        resetPending();
      }

      setOrigName(displayName.trim());
      setOrigDate(anniversaryDate);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return true;
    } catch (error) {
      console.error('[ProfilePage] 저장 실패:', error);
      toast.error(`저장 중 오류가 발생했습니다.\n${error?.message || String(error)}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await saveProfile();
  };

  // ─── 뒤로가기 / 모달 ────────────────────────────────────────

  const handleBack = () => {
    if (isDirty) {
      setShowUnsavedModal(true);
    } else {
      navigate(-1, { replace: true });
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
    const ok = await saveProfile();
    if (ok) {
      setShowUnsavedModal(false);
      if (blocker.state === 'blocked') {
        blocker.proceed();
      } else {
        navigate('/', { replace: true });
      }
    }
  };

  const isConnected = coupleDoc?.members?.length === 2;

  return (
    <div className="profile-page">
      <form className="profile-form" onSubmit={handleSave}>

        {/* 홈 화면 이미지 섹션 */}
        <div className="profile-section">
          <div className="profile-section-title">홈 화면 이미지</div>
          <div className="profile-hero-container">
            <div className="profile-hero-wrap" onClick={() => handleHeroClick(loading)}>
              {displayHeroUrl
                ? <img
                    src={displayHeroUrl}
                    alt="홈 이미지"
                    className="profile-hero-img"
                  />
                : <div className="profile-hero-placeholder" />
              }
              <div className={`profile-hero-overlay${loading ? ' uploading' : ''}`}>
                <HiCamera className="profile-hero-camera" />
                <span>변경</span>
              </div>
              <input
                ref={heroInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleHeroFileChange}
              />
            </div>
            <div className="profile-hero-info">
              <p className="profile-hero-info-desc">홈 화면 왼쪽에 표시되는 커플 사진입니다.</p>
              <ul className="profile-hero-info-list">
                <li>형식: JPG, PNG, WEBP, GIF</li>
                <li>최대 크기: 10MB</li>
                <li>세로 방향 사진 권장</li>
              </ul>
              {pendingHeroDelete && (
                <p className="profile-hero-pending-msg">사진이 제거됩니다 (저장 시 반영)</p>
              )}
              {pendingHeroFile && (
                <p className="profile-hero-pending-msg">새 사진이 선택됐습니다 (저장 시 반영)</p>
              )}
              {displayHeroUrl && (
                <button
                  type="button"
                  className="profile-hero-delete-btn"
                  onClick={handleHeroDelete}
                >
                  사진 제거
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 내 정보 섹션 */}
        <div className="profile-section">
          <div className="profile-section-title">내 정보</div>
          <div className="profile-field">
            <label className="profile-label">
              <HiPencil className="profile-label-icon" />
              닉네임 수정
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={20}
              placeholder="닉네임"
              required
              className="profile-input-editable"
            />
          </div>
        </div>

        {/* 보안 섹션 */}
        <div className="profile-section">
          <div className="profile-section-title">보안</div>
          <button
            type="button"
            className="profile-change-password-btn"
            onClick={() => setShowChangePasswordModal(true)}
            disabled={loading}
          >
            <HiLockClosed className="profile-field-icon" />
            비밀번호 변경
          </button>
        </div>


        {/* 저장 버튼 */}
        <button
          type="submit"
          className={`profile-save-btn${saved ? ' saved' : ''}`}
          disabled={loading}
        >
          {loading ? '저장 중...' : saved ? '저장됐어요 ✓' : '저장'}
        </button>

      </form>


      {/* 저장 확인 모달 */}
      {showUnsavedModal && (
        <div className="profile-modal-overlay">
          <div className="profile-modal-box">
            <p className="profile-modal-title">변경사항이 있어요</p>
            <p className="profile-modal-msg">저장하지 않고 나가시겠습니까?</p>
            <div className="profile-modal-actions">
              <button
                className="profile-modal-btn"
                onClick={handleCancelModal}
              >
                취소
              </button>
              <button
                className="profile-modal-btn discard"
                onClick={handleDiscardAndLeave}
              >
                저장 안 함
              </button>
              <button
                className="profile-modal-btn save"
                onClick={handleSaveAndLeave}
                disabled={loading}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 사진 삭제 확인 모달 */}
      {showHeroDeleteModal && (
        <div className="profile-modal-overlay">
          <div className="profile-modal-box">
            <p className="profile-modal-title">사진 제거</p>
            <p className="profile-modal-msg">홈 화면 사진을 제거하시겠습니까?</p>
            <div className="profile-modal-actions">
              <button
                className="profile-modal-btn"
                onClick={() => setShowHeroDeleteModal(false)}
              >
                취소
              </button>
              <button
                className="profile-modal-btn discard"
                onClick={handleConfirmHeroDelete}
              >
                제거
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 변경 모달 */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
    </div>
  );
};

export default ProfilePage;
