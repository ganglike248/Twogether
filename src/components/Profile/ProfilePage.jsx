// src/components/Profile/ProfilePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { toast } from 'react-toastify';
import { HiArrowLeft, HiUser, HiHeart, HiEnvelope, HiCamera, HiInformationCircle } from 'react-icons/hi2';
import CycleSettingsModal from './CycleSettingsModal';
import { db, auth } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import { uploadHeroImage, removeHeroImage } from '../../services/storageService';
import './ProfilePage.css';

const MAX_IMAGE_SIZE_MB = 10;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, userDoc, coupleDoc, coupleId, partnerDoc } = useAuthContext();

  // 텍스트 필드
  const [displayName, setDisplayName] = useState('');
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [origName, setOrigName] = useState('');
  const [origDate, setOrigDate] = useState('');

  const [showCycleModal, setShowCycleModal] = useState(false);

  // 사진 (임시 상태 — 저장 버튼 누를 때만 실제 반영)
  const [pendingHeroFile, setPendingHeroFile] = useState(null);   // 새 파일
  const [pendingHeroDelete, setPendingHeroDelete] = useState(false); // 삭제 예약
  const [heroPreviewUrl, setHeroPreviewUrl] = useState(null);     // 미리보기 blob URL
  const heroInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showHeroDeleteModal, setShowHeroDeleteModal] = useState(false);

  // Firestore의 현재 저장된 이미지 URL
  const heroImageUrl = coupleDoc?.heroImageUrl || null;

  // 화면에 표시할 이미지: 삭제 예약이면 null, 새 파일 미리보기 우선, 없으면 저장된 URL
  const displayHeroUrl = pendingHeroDelete ? null : (heroPreviewUrl || heroImageUrl);

  // blob URL 정리
  useEffect(() => {
    return () => {
      if (heroPreviewUrl) URL.revokeObjectURL(heroPreviewUrl);
    };
  }, [heroPreviewUrl]);

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

  // ─── 사진 핸들러 ───────────────────────────────────────────

  const handleHeroClick = () => {
    if (!loading) heroInputRef.current?.click();
  };

  const handleHeroFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 파일 크기 검증
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`파일 크기는 ${MAX_IMAGE_SIZE_MB}MB 이하여야 합니다.`);
      e.target.value = '';
      return;
    }

    // 파일 타입 검증 (type이 비어있을 경우 통과 — storageService에서 재검증)
    if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다. (JPG, PNG, WEBP, GIF)');
      e.target.value = '';
      return;
    }

    if (heroPreviewUrl) URL.revokeObjectURL(heroPreviewUrl);
    setPendingHeroFile(file);
    setPendingHeroDelete(false);
    setHeroPreviewUrl(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleHeroDelete = () => {
    setShowHeroDeleteModal(true);
  };

  const confirmHeroDelete = () => {
    if (heroPreviewUrl) {
      URL.revokeObjectURL(heroPreviewUrl);
      setHeroPreviewUrl(null);
    }
    setPendingHeroFile(null);
    setPendingHeroDelete(true);
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
        if (heroPreviewUrl) URL.revokeObjectURL(heroPreviewUrl);
        setPendingHeroFile(null);
        setHeroPreviewUrl(null);
      } else if (pendingHeroDelete) {
        await removeHeroImage(coupleId);
        await updateDoc(doc(db, 'couples', coupleId), { heroImageUrl: null });
        setPendingHeroDelete(false);
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
      navigate(-1);
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
      navigate(-1);
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
      <div className="profile-header">
        <button className="profile-back" onClick={handleBack}>
          <HiArrowLeft />
        </button>
        <h1 className="profile-title">프로필 설정</h1>
      </div>

      <form className="profile-form" onSubmit={handleSave}>

        {/* 홈 화면 이미지 */}
        <p className="profile-section-label">홈 화면 이미지</p>
        <div className="profile-hero-row">
          <div className="profile-hero-wrap" onClick={handleHeroClick}>
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

        {/* 내 정보 + 상대방 (2열) */}
        <div className="profile-members-row">
          {/* 나 */}
          <div className="profile-member-col">
            <div className="profile-section">
              <div className="profile-member-heading">나</div>
              <div className="profile-field-compact">
                <label className="profile-label">
                  <HiUser className="profile-label-icon" />
                  닉네임
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  maxLength={20}
                  placeholder="닉네임"
                  required
                />
              </div>
              <div className="profile-field-compact">
                <label className="profile-label">
                  <HiEnvelope className="profile-label-icon" />
                  이메일
                </label>
                <input
                  type="text"
                  value={userDoc?.email || ''}
                  disabled
                  className="profile-disabled"
                />
              </div>
            </div>
          </div>

          {/* 하트 구분자 */}
          <div className="profile-members-heart">
            <HiHeart className="profile-heart-icon" />
          </div>

          {/* 상대방 */}
          <div className="profile-member-col">
            <div className="profile-section">
              <div className="profile-member-heading">상대방</div>
              {isConnected && partnerDoc ? (
                <>
                  <div className="profile-field-compact">
                    <label className="profile-label">
                      <HiUser className="profile-label-icon" />
                      닉네임
                    </label>
                    <input
                      type="text"
                      value={partnerDoc.displayName || ''}
                      disabled
                      className="profile-disabled"
                    />
                  </div>
                  <div className="profile-field-compact">
                    <label className="profile-label">
                      <HiEnvelope className="profile-label-icon" />
                      이메일
                    </label>
                    <input
                      type="text"
                      value={partnerDoc.email || ''}
                      disabled
                      className="profile-disabled"
                    />
                  </div>
                </>
              ) : (
                <div className="profile-waiting">
                  <span className="profile-waiting-emoji">⏳</span>
                  <span className="profile-waiting-text">연결 대기 중</span>
                  {coupleDoc?.inviteCode && (
                    <span className="profile-invite-code">{coupleDoc.inviteCode}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 커플 정보 */}
        <p className="profile-section-label">커플 정보</p>
        <div className="profile-section">
          <div className="profile-field">
            <label className="profile-label">
              <HiHeart className="profile-label-icon" />
              연애 시작일
            </label>
            <input
              type="date"
              value={anniversaryDate}
              onChange={e => setAnniversaryDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            <span className="profile-hint">변경하면 D+day와 기념일이 다시 계산됩니다</span>
          </div>
          {coupleDoc?.inviteCode && isConnected && (
            <div className="profile-field">
              <label className="profile-label">
                <HiHeart className="profile-label-icon" />
                초대 코드
              </label>
              <input
                type="text"
                value={coupleDoc.inviteCode}
                disabled
                className="profile-disabled profile-code"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          className="profile-cycle-btn"
          onClick={() => setShowCycleModal(true)}
        >
          <span className="profile-cycle-btn-icon">
            {coupleDoc?.cycleSettings?.enabled ? (coupleDoc.cycleSettings.icon || '🌸') : '🌸'}
          </span>
          <span className="profile-cycle-btn-text">
            {coupleDoc?.cycleSettings?.enabled ? '생리주기 설정 중 ✓' : '생리주기 사용하기'}
          </span>
          <span className="profile-cycle-btn-arrow">›</span>
        </button>

        <button
          type="submit"
          className={`profile-save-btn${saved ? ' saved' : ''}`}
          disabled={loading}
        >
          {loading ? '저장 중...' : saved ? '저장됐어요 ✓' : '저장'}
        </button>

        <button
          type="button"
          className="profile-onboarding-btn"
          onClick={() => navigate('/', { replace: true, state: { showTutorial: true } })}
        >
          <HiInformationCircle className="profile-onboarding-icon" />
          앱 소개 다시 보기
        </button>

      </form>

      <CycleSettingsModal
        isOpen={showCycleModal}
        onClose={() => setShowCycleModal(false)}
      />

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
                onClick={confirmHeroDelete}
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
