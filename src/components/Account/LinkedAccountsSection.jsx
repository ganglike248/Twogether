// src/components/Account/LinkedAccountsSection.jsx
// 연결된 계정(구글) 연동/해제 + "이미 다른 계정에 걸린 구글 계정" 충돌 정리 모달.
// v1.0.26에서 프로필 화면에서 계정 화면(/account)으로 그대로 옮김(로직 변경 없음) — 상세 배경은 CLAUDE.md "구글 로그인" 섹션.
import React, { useState } from 'react';
import { GoogleAuthProvider } from 'firebase/auth';
import { toast } from 'react-toastify';
import { HiLink, HiLinkSlash } from 'react-icons/hi2';
import { FcGoogle } from 'react-icons/fc';
import { useAuthContext } from '../../contexts/AuthContext';
import {
  linkGoogleAccount,
  unlinkGoogleAccount,
  inspectConflictingGoogleAccount,
  deleteEmptyConflictingAccount,
  deleteCurrentAccountAndSwitchToGoogle,
} from '../../services/authService';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import '../Profile/ProfilePage.css';
import '../common/AppModal.css';

const LinkedAccountsSection = () => {
  const { user, coupleId } = useAuthContext();
  const [googleLinkLoading, setGoogleLinkLoading] = useState(false);
  const [showUnlinkGoogleModal, setShowUnlinkGoogleModal] = useState(false);
  // 구글 연동 시 credential이 이미 다른 계정에 걸려있는 충돌 상황 정리용
  const [googleConflict, setGoogleConflict] = useState(null);
  // null | { pendingCredential, currentEmail, otherAccount: null|{uid,email,displayName,hasCoupleData}, inspecting, resolving, error }
  const [conflictChoice, setConflictChoice] = useState(null); // 'other' | 'current' — 삭제 대상
  const [conflictConfirming, setConflictConfirming] = useState(false);

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
          console.error('[LinkedAccounts] 충돌 계정 조회 실패:', inspectError);
          setGoogleConflict(prev => prev && {
            ...prev,
            inspecting: false,
            error: '상대 계정 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
          });
        }
      } else if (!(error.message || '').toLowerCase().includes('cancel')) {
        console.error('[LinkedAccounts] 구글 계정 연동 실패:', error);
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
      console.error('[LinkedAccounts] 계정 정리 실패:', error);
      toast.error(getFriendlyErrorMessage(error, '처리 중 오류가 발생했습니다.'));
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
      console.error('[LinkedAccounts] 구글 계정 연동 해제 실패:', error);
      toast.error('연동 해제 중 오류가 발생했습니다.');
    } finally {
      setGoogleLinkLoading(false);
    }
  };

  return (
    <>
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
    </>
  );
};

export default LinkedAccountsSection;
