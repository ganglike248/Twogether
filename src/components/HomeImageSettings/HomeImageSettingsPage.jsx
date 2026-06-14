import React, { useState } from 'react';
import { HiCamera } from 'react-icons/hi2';
import { useAuthContext } from '../../contexts/AuthContext';
import { uploadHeroImage, removeHeroImage } from '../../services/storageService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-toastify';
import useHeroImage from '../../hooks/useHeroImage';
import './HomeImageSettingsPage.css';

const HomeImageSettingsPage = () => {
  const { coupleDoc, coupleId } = useAuthContext();
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const {
    pendingHeroFile,
    pendingHeroDelete,
    displayHeroUrl,
    hasPending,
    heroInputRef,
    handleHeroClick,
    handleHeroFileChange,
    confirmHeroDelete,
    resetPending,
  } = useHeroImage(coupleDoc?.heroImageUrl || null);

  const handleSave = async () => {
    setIsUploading(true);
    try {
      if (pendingHeroFile) {
        const url = await uploadHeroImage(coupleId, pendingHeroFile);
        await updateDoc(doc(db, 'couples', coupleId), { heroImageUrl: url });
        resetPending();
        toast.success('배경 이미지가 변경되었습니다.');
      } else if (pendingHeroDelete) {
        await removeHeroImage(coupleId);
        await updateDoc(doc(db, 'couples', coupleId), { heroImageUrl: null });
        resetPending();
        toast.success('배경 이미지가 제거되었습니다.');
      }
    } catch (error) {
      console.error('Failed to update image:', error);
      toast.error('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    confirmHeroDelete();
    setShowDeleteModal(false);
  };

  return (
    <div className="home-image-settings-page">
      <p className="profile-section-label" style={{ marginTop: '0.875rem', marginBottom: '1rem' }}>홈 배경 설정</p>

      {/* 홈 화면 이미지 */}
      <p className="profile-section-label">홈 배경 이미지</p>
      <div className="profile-hero-row">
        <div className="profile-hero-wrap" onClick={() => handleHeroClick(isUploading)}>
          {displayHeroUrl ? (
            <img src={displayHeroUrl} alt="홈 이미지" className="profile-hero-img" />
          ) : (
            <div className="profile-hero-placeholder" />
          )}
          <div className={`profile-hero-overlay${isUploading ? ' uploading' : ''}`}>
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
          <p className="profile-hero-info-title">홈 화면 대표 사진</p>
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
          {displayHeroUrl && !pendingHeroFile && (
            <button
              type="button"
              className="profile-hero-delete-btn"
              onClick={handleDelete}
            >
              사진 제거
            </button>
          )}
        </div>
      </div>

      {/* 저장 버튼 */}
      <button
        onClick={handleSave}
        disabled={!hasPending || isUploading}
        className="profile-save-btn"
      >
        {isUploading ? '저장 중...' : '저장'}
      </button>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="profile-modal-overlay">
          <div className="profile-modal-box">
            <p className="profile-modal-title">사진 제거</p>
            <p className="profile-modal-msg">홈 화면 사진을 제거하시겠습니까?</p>
            <div className="profile-modal-actions">
              <button
                className="profile-modal-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                취소
              </button>
              <button
                className="profile-modal-btn discard"
                onClick={handleConfirmDelete}
              >
                제거
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeImageSettingsPage;
