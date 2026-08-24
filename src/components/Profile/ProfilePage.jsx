// src/components/Profile/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useBlocker, useSearchParams } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile, GoogleAuthProvider } from 'firebase/auth';
import { toast } from 'react-toastify';
import { HiCamera, HiLockClosed, HiPencil, HiLink, HiLinkSlash } from 'react-icons/hi2';
import { MdCheck } from 'react-icons/md';
import { FcGoogle } from 'react-icons/fc';
import { db, auth } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import { uploadHeroImage, removeHeroImage } from '../../services/storageService';
import {
  linkGoogleAccount,
  unlinkGoogleAccount,
  inspectConflictingGoogleAccount,
  deleteEmptyConflictingAccount,
  deleteCurrentAccountAndSwitchToGoogle,
} from '../../services/authService';
import useHeroImage from '../../hooks/useHeroImage';
import ChangePasswordModal from './ChangePasswordModal';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userDoc, coupleDoc, coupleId } = useAuthContext();
  const [googleLinkLoading, setGoogleLinkLoading] = useState(false);
  const [showUnlinkGoogleModal, setShowUnlinkGoogleModal] = useState(false);
  // 구글 연동 시 credential이 이미 다른 계정에 걸려있는 충돌 상황 정리용
  const [googleConflict, setGoogleConflict] = useState(null);
  // null | { pendingCredential, currentEmail, otherAccount: null|{uid,email,displayName,hasCoupleData}, inspecting, resolving, error }
  const [conflictChoice, setConflictChoice] = useState(null); // 'other' | 'current' — 삭제 대상
  const [conflictConfirming, setConflictConfirming] = useState(false);

  // 텍스트 필드
  const [displayName, setDisplayName] = useState('');
  const [origName, setOrigName] = useState('');

  // 모달 열림 상태를 useState 대신 ?modal= 쿼리에서 파생 — 손수 만든 pushState/popstate 훅
  // (useModalBackButton) 없이 React Router가 히스토리를 전담하게 함(캘린더와 같은 이유).
  const [searchParams] = useSearchParams();
  const showChangePasswordModal = searchParams.get('modal') === 'password';
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
    } else {
      if (blocker.state === 'blocked') blocker.reset();
    }
  };

  const isConnected = coupleDoc?.members?.length === 2;

  // ─── 연결된 계정 (구글 로그인, v0.4.30~) ──────────────────────
  const providerIds = user?.providerData?.map(p => p.providerId) || [];
  const isGoogleLinked = providerIds.includes('google.com');
  // 마지막 남은 로그인 수단인 경우 — Firebase는 이걸 서버에서 막아주지 않음(해제해도 에러
  // 없이 성공하고, 다음 로그아웃부터 이 계정에 로그인할 방법이 없어질 뿐). 그래서 버튼을
  // 막는 대신 확인 모달로 결과를 미리 경고함 — "구글로 가입했다가 실수로 새 계정이 생겨서,
  // 그 orphan 계정에서 구글을 떼어내 원래 계정에 옮겨 달아야 하는" 케이스에 필요한 탈출구.
  const isLastLoginMethod = providerIds.length <= 1;

  const handleLinkGoogle = async () => {
    setGoogleLinkLoading(true);
    try {
      await linkGoogleAccount();
      toast.success('구글 계정이 연동됐어요.');
    } catch (error) {
      if (error.code === 'auth/credential-already-in-use') {
        // 이 구글 계정, 이미 다른 계정(대부분 실수로 만들어진 빈 계정)에 연동돼 있음 —
        // 어느 쪽이 진짜 데이터가 있는 계정인지 확인해서 정리 방법을 안내
        const pendingCredential = GoogleAuthProvider.credentialFromError(error);
        setGoogleConflict({
          pendingCredential,
          currentEmail: user?.email || '',
          otherAccount: null,
          inspecting: true,
          resolving: false,
          error: '',
        });
        try {
          const otherAccount = await inspectConflictingGoogleAccount(pendingCredential);
          setGoogleConflict(prev => prev && { ...prev, otherAccount, inspecting: false });
        } catch (inspectError) {
          console.error('[ProfilePage] 충돌 계정 조회 실패:', inspectError);
          setGoogleConflict(prev => prev && {
            ...prev,
            inspecting: false,
            error: '상대 계정 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
          });
        }
      } else if (!(error.message || '').toLowerCase().includes('cancel')) {
        console.error('[ProfilePage] 구글 계정 연동 실패:', error);
        toast.error('구글 계정 연동 중 오류가 발생했습니다.');
      }
    } finally {
      setGoogleLinkLoading(false);
    }
  };

  const closeGoogleConflict = () => {
    setGoogleConflict(null);
    setConflictChoice(null);
    setConflictConfirming(false);
  };

  // which: 'other'(충돌 상대 계정을 삭제) | 'current'(지금 계정을 삭제하고 구글 계정으로 전환)
  const requestResolveConflict = (which) => {
    setConflictChoice(which);
    setConflictConfirming(true);
  };

  const executeResolveConflict = async () => {
    if (!googleConflict || !conflictChoice) return;
    setGoogleConflict(prev => prev && { ...prev, resolving: true });
    try {
      if (conflictChoice === 'other') {
        await deleteEmptyConflictingAccount(googleConflict.pendingCredential, googleConflict.otherAccount.uid);
        await linkGoogleAccount(); // credential이 풀렸으니 다시 시도하면 이번엔 정상 연동됨
        toast.success('빈 계정을 정리하고 구글 계정을 연동했어요.');
      } else {
        await deleteCurrentAccountAndSwitchToGoogle(googleConflict.pendingCredential);
        toast.success('계정을 전환했어요.');
      }
      closeGoogleConflict();
    } catch (error) {
      console.error('[ProfilePage] 계정 정리 실패:', error);
      toast.error(error.message || '처리 중 오류가 발생했습니다.');
      setGoogleConflict(prev => prev && { ...prev, resolving: false });
      setConflictConfirming(false);
    }
  };

  // otherAccount 조회가 끝난 뒤에만 계산됨 — coupleId(현재 계정)와 hasCoupleData(상대 계정)
  // 조합으로 자동 판정: 하나만 비어있으면 그것만 삭제 대상(고민 불필요), 둘 다 비어있으면
  // 소프트웨어가 판단할 수 없어 사용자가 직접 골라야 함(choose), 둘 다 데이터 있으면 차단.
  const conflictResolution = (() => {
    if (!googleConflict?.otherAccount) return null;
    const otherHasData = googleConflict.otherAccount.hasCoupleData;
    const currentHasData = !!coupleId;
    if (currentHasData && otherHasData) return 'blocked';
    if (currentHasData && !otherHasData) return 'delete-other';
    if (!currentHasData && otherHasData) return 'delete-current';
    return 'choose';
  })();

  const requestUnlinkGoogle = () => {
    setShowUnlinkGoogleModal(true);
  };

  const confirmUnlinkGoogle = async () => {
    setShowUnlinkGoogleModal(false);
    setGoogleLinkLoading(true);
    try {
      await unlinkGoogleAccount();
      toast.success('구글 계정 연동이 해제됐어요.');
    } catch (error) {
      console.error('[ProfilePage] 구글 계정 연동 해제 실패:', error);
      toast.error('연동 해제 중 오류가 발생했습니다.');
    } finally {
      setGoogleLinkLoading(false);
    }
  };

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
            onClick={() => navigate('/profile?modal=password', { state: { modal: true } })}
            disabled={loading}
          >
            <HiLockClosed className="profile-field-icon" />
            비밀번호 변경
          </button>
        </div>

        {/* 연결된 계정 섹션 */}
        <div className="profile-section">
          <div className="profile-section-title">연결된 계정</div>
          <div className="profile-linked-account">
            <div className="profile-linked-account-info">
              <FcGoogle className="profile-linked-account-icon" />
              <div>
                <p className="profile-linked-account-name">구글</p>
                <p className="profile-linked-account-status">
                  {isGoogleLinked ? '연동됨' : '연동 안 됨'}
                </p>
              </div>
            </div>
            {isGoogleLinked ? (
              <button
                type="button"
                className="profile-linked-account-btn unlink"
                onClick={requestUnlinkGoogle}
                disabled={googleLinkLoading}
              >
                <HiLinkSlash className="profile-field-icon" />
                연동 해제
              </button>
            ) : (
              <button
                type="button"
                className="profile-linked-account-btn"
                onClick={handleLinkGoogle}
                disabled={googleLinkLoading}
              >
                <HiLink className="profile-field-icon" />
                연동하기
              </button>
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

      {/* 구글 계정 연동 해제 확인 모달 */}
      {showUnlinkGoogleModal && (
        <div className="profile-modal-overlay">
          <div className="profile-modal-box">
            <p className="profile-modal-title">구글 계정 연동 해제</p>
            {isLastLoginMethod ? (
              <p className="profile-modal-msg">
                이 계정에 남은 로그인 수단이 구글뿐이에요. 지금 해제하면 로그아웃 후
                <strong> 이 계정으로 다시 로그인할 방법이 없어져요.</strong> 그래도 해제할까요?
              </p>
            ) : (
              <p className="profile-modal-msg">구글 계정 연동을 해제하시겠습니까?</p>
            )}
            <div className="profile-modal-actions">
              <button
                className="profile-modal-btn"
                onClick={() => setShowUnlinkGoogleModal(false)}
              >
                취소
              </button>
              <button
                className="profile-modal-btn discard"
                onClick={confirmUnlinkGoogle}
              >
                해제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 구글 계정 충돌 정리 모달 — 연동하려는 구글 계정이 이미 다른 계정에 걸려있는 경우 */}
      {googleConflict && (
        <div className="profile-modal-overlay">
          <div className="profile-modal-box">
            <p className="profile-modal-title">구글 계정 연동 충돌</p>

            {googleConflict.inspecting ? (
              <p className="profile-modal-msg">계정 정보를 확인하는 중...</p>
            ) : googleConflict.error ? (
              <>
                <p className="profile-modal-msg">{googleConflict.error}</p>
                <div className="profile-modal-actions">
                  <button className="profile-modal-btn" onClick={closeGoogleConflict}>닫기</button>
                </div>
              </>
            ) : conflictConfirming ? (
              <>
                <p className="profile-modal-msg">
                  <strong>
                    {conflictChoice === 'current' ? googleConflict.currentEmail : googleConflict.otherAccount.email}
                  </strong> 계정이 영구히 삭제됩니다. 이 작업은 되돌릴 수 없어요. 정말 진행하시겠습니까?
                </p>
                <div className="profile-modal-actions">
                  <button
                    className="profile-modal-btn"
                    onClick={() => setConflictConfirming(false)}
                    disabled={googleConflict.resolving}
                  >
                    취소
                  </button>
                  <button
                    className="profile-modal-btn discard"
                    onClick={executeResolveConflict}
                    disabled={googleConflict.resolving}
                  >
                    {googleConflict.resolving ? '처리 중...' : '삭제하고 진행'}
                  </button>
                </div>
              </>
            ) : conflictResolution === 'blocked' ? (
              <>
                <p className="profile-modal-msg">
                  이 구글 계정은 이미 다른 계정({googleConflict.otherAccount.email})에 연동되어 있는데,
                  두 계정 모두 커플 데이터가 있어서 여기서 자동으로 정리할 수 없어요.
                  business9498@gmail.com 으로 문의해주세요.
                </p>
                <div className="profile-modal-actions">
                  <button className="profile-modal-btn" onClick={closeGoogleConflict}>닫기</button>
                </div>
              </>
            ) : conflictResolution === 'choose' ? (
              <>
                <p className="profile-modal-msg">
                  이 구글 계정은 이미 다른 빈 계정에 연동되어 있어요. 계정 선택하기 —
                  이 작업은 되돌릴 수 없으니 신중하게 선택해주세요.
                </p>
                <div className="profile-modal-actions vertical">
                  <button
                    className="profile-modal-btn"
                    onClick={() => requestResolveConflict('current')}
                  >
                    구글 ({googleConflict.otherAccount.email}) 계정 유지 — 지금 계정 삭제
                  </button>
                  <button
                    className="profile-modal-btn"
                    onClick={() => requestResolveConflict('other')}
                  >
                    이메일 ({googleConflict.currentEmail}) 계정 유지 — 구글 계정 삭제
                  </button>
                </div>
                <button className="profile-google-conflict-cancel" onClick={closeGoogleConflict}>취소</button>
              </>
            ) : (
              <>
                <p className="profile-modal-msg">
                  {conflictResolution === 'delete-other' ? (
                    <>이 구글 계정은 이미 빈 계정({googleConflict.otherAccount.email})에 연동되어 있어요.
                      그 계정을 삭제하고 지금 계정에 연동할까요?</>
                  ) : (
                    <>지금 계정은 비어있고, 이 구글 계정에는 이미 데이터가 있는 계정
                      ({googleConflict.otherAccount.email})이 연동돼 있어요.
                      지금 계정을 삭제하고 그 계정으로 전환할까요?</>
                  )}
                </p>
                <div className="profile-modal-actions">
                  <button className="profile-modal-btn" onClick={closeGoogleConflict}>취소</button>
                  <button
                    className="profile-modal-btn discard"
                    onClick={() => requestResolveConflict(conflictResolution === 'delete-other' ? 'other' : 'current')}
                  >
                    계속
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 비밀번호 변경 모달 */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => {
          // location.key === 'default'면 이 세션에서 첫 진입(딥링크/새로고침)이라
          // navigate(-1)이 앱 밖으로 나갈 수 있어 대신 /profile로 보냄.
          if (location.key === 'default') {
            navigate('/profile', { replace: true });
          } else {
            navigate(-1);
          }
        }}
      />
    </div>
  );
};

export default ProfilePage;
