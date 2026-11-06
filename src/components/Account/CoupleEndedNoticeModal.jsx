// src/components/Account/CoupleEndedNoticeModal.jsx
// 상대가 연결을 해제했거나 탈퇴했을 때, 남은 사람이 다음에 앱을 열면 한 번 보는 안내(커플 연결 화면에 마운트).
// 해제/탈퇴를 구분하지 않고 같은 문구(사용자 결정). 서버가 users/{uid}.coupleEndedNotice를 남기고, [확인]으로 지움.
import React, { useState } from 'react';
import { HiArrowDownTray } from 'react-icons/hi2';
import { useAuthContext } from '../../contexts/AuthContext';
import useRecordSave from '../../hooks/useRecordSave';
import { dismissCoupleEndedNotice } from '../../services/coupleLifecycleService';
import './account.css';

const CoupleEndedNoticeModal = ({ formerCouples, loading }) => {
  const { user, userDoc } = useAuthContext();
  const { saving, saveFormer } = useRecordSave();
  const [closing, setClosing] = useState(false);

  const notice = userDoc?.coupleEndedNotice;
  // 목록을 받기 전엔 띄우지 않음(보관 중인지 몰라 문구가 바뀌며 깜빡이는 것 방지)
  if (!notice?.coupleId || closing || loading) return null;

  // 보관 기간이 이미 지났으면 저장 버튼 없이 안내만
  const retained = formerCouples?.find((c) => c.coupleId === notice.coupleId);

  const handleClose = async () => {
    setClosing(true);
    try {
      await dismissCoupleEndedNotice(user.uid);
    } catch (error) {
      console.error('해제 안내 닫기 실패:', error); // 다음에 한 번 더 보일 뿐이라 조용히 넘어감
    }
  };

  return (
    <div className="acc-overlay">
      <div className="acc-card" role="dialog" aria-modal="true" aria-labelledby="ended-title">
        <p className="acc-title" id="ended-title">커플 연결이 해제됐어요</p>
        {retained ? (
          <>
            <p className="acc-text">
              지금까지의 기록은 <strong>{retained.daysLeft}일 동안</strong> 보관돼요. 그동안 기록을 파일로 저장해 둘 수 있어요.
              보관 기간이 지나면 모든 기록이 삭제돼요.
            </p>
            <div className="acc-save-box">
              <p>함께한 일정·여행·편지를 한 문서로 모아 저장해요.</p>
              <button type="button" className="acc-save-btn" onClick={() => saveFormer(retained.coupleId)} disabled={!!saving}>
                <HiArrowDownTray />
                {saving ? '기록을 모으는 중…' : '기록 파일 저장'}
              </button>
            </div>
          </>
        ) : (
          <p className="acc-text">새 커플을 시작하거나 초대 코드로 다시 연결할 수 있어요.</p>
        )}
        <div className="acc-actions">
          <button type="button" className="btn btn-primary" onClick={handleClose} disabled={!!saving}>확인</button>
        </div>
      </div>
    </div>
  );
};

export default CoupleEndedNoticeModal;
