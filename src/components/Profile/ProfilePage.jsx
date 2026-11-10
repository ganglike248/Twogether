// src/components/Profile/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { toast } from 'react-toastify';
import { HiCamera, HiPhoto, HiPencil } from 'react-icons/hi2';
import { MdCheck } from 'react-icons/md';
import { db, auth } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import { uploadHeroImage, removeHeroImage } from '../../services/storageService';
import useHeroImage from '../../hooks/useHeroImage';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import { MenuPageHeader } from '../common/MenuPage';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, userDoc, coupleDoc, coupleId } = useAuthContext();

  // 텍스트 필드
  const [displayName, setDisplayName] = useState('');
  const [origName, setOrigName] = useState('');

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showHeroDeleteModal, setShowHeroDeleteModal] = useState(false);

  const {
    pendingHeroFile,
    isProcessingHeroImage,
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

  const isDirty =
    displayName !== origName ||
    pendingHeroFile !== null ||
    pendingHeroDelete;

  // React Router 네비게이션 차단 (nav바, 헤더, 뒤로가기 버튼 포함). 단, 같은 페이지
  // (/profile) 안에서 ?modal=password만 붙었다 떨어지는 이동(비밀번호 변경 모달 열기/닫기)은
  // 실제로 페이지를 벗어나는 게 아니므로 차단 대상에서 제외 — 안 그러면 프로필을 수정하다가
  // 비밀번호 변경 버튼만 눌러도 "저장 안 하고 나가시겠습니까?"가 뜨는 오탐이 생김.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!isDirty) return false;
    if (nextLocation.pathname === currentLocation.pathname) return false;
    return true;
  });

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
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return true;
    } catch (error) {
      console.error('[ProfilePage] 저장 실패:', error);
      toast.error(`저장 중 오류가 발생했습니다.\n${getFriendlyErrorMessage(error)}`);
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
    } else {
      if (blocker.state === 'blocked') blocker.reset();
    }
  };

  const isConnected = coupleDoc?.members?.length === 2;

  // ─── 연결된 계정 (구글 로그인, v0.4.30~) ──────────────────────
  return (
    <div className="profile-page menu-page">
      <MenuPageHeader title="프로필" />
      <form className="profile-form" onSubmit={handleSave}>

        {/* 홈 화면 이미지 섹션 */}
        <div className="profile-section">
          <div className="profile-section-title">홈 화면 이미지</div>
          <div className="profile-hero-container">
            <div className="profile-hero-wrap" onClick={() => handleHeroClick(loading || isProcessingHeroImage)}>
              {displayHeroUrl
                ? <img
                    src={displayHeroUrl}
                    alt="홈 이미지"
                    className="profile-hero-img"
                  />
                : <div className="profile-hero-placeholder" aria-label="사진 없음 — 눌러서 추가"><HiPhoto className="profile-hero-placeholder-icon" aria-hidden="true" /></div>
              }
              <div className={`profile-hero-overlay${(loading || isProcessingHeroImage) ? ' uploading' : ''}`}>
                <HiCamera className="profile-hero-camera" />
                <span>{isProcessingHeroImage ? '변환 중...' : '변경'}</span>
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
        <div className="profile-section profile-nickname-section">
          {/* 섹션 제목과 입력칸 라벨이 '내 정보'/'닉네임 수정'으로 겹쳐 보여서 제목 하나로 합침 */}
          <label className="profile-section-title" htmlFor="profile-nickname">닉네임 변경</label>
          <div className="profile-field">
            {/* 카드 안에 박스를 또 두지 않고 카드 자체가 입력칸 — 연필 칩으로 고칠 수 있음을, 포커스 시 카드 테두리로 입력 중임을 표시 */}
            <div className="profile-nickname-row">
              <input
                id="profile-nickname"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={20}
                placeholder="닉네임"
                required
                className="profile-input-editable profile-nickname-input"
              />
              <span className="profile-nickname-pencil" aria-hidden="true"><HiPencil /></span>
            </div>
            {displayName.trim() && displayName !== origName && (
              <p className="profile-field-hint" role="status">닉네임을 바꾸려면 아래 '저장'을 눌러 주세요.</p>
            )}
          </div>
        </div>



        {/* 저장 버튼 */}
        <button
          type="submit"
          className={`profile-save-btn${saved ? ' saved' : ''}`}
          disabled={loading}
        >
          {loading ? '저장 중...' : saved ? <><MdCheck className="inline-check" color="#51cf66" />저장됐어요</> : '저장'}
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

    </div>
  );
};

export default ProfilePage;
