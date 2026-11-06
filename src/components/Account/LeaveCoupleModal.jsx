// src/components/Account/LeaveCoupleModal.jsx
// 커플 연결 해제 마지막 확인 (커플 정보 화면 → /couple-info?modal=leave).
// 정책: 해제 즉시 두 사람 모두 커플 기록을 못 봄, 30일 보관 + 해제한 사람만 취소 가능, 30일 뒤 완전 삭제.
// 해제 직전에 사람이 읽을 수 있는 기록 파일을 저장해 두도록 안내(사용자 요청).
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { HiArrowDownTray } from 'react-icons/hi2';
import { leaveCouple } from '../../services/coupleLifecycleService';
import useRecordSave from '../../hooks/useRecordSave';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import './account.css';

const LeaveCoupleModal = ({ isOpen, onClose, partnerName }) => {
  const navigate = useNavigate();
  const { saving, saveCurrent } = useRecordSave();
  const [leaving, setLeaving] = useState(false);

  if (!isOpen) return null;

  const handleLeave = async () => {
    if (leaving) return;
    setLeaving(true);
    try {
      await leaveCouple();
      toast.success('커플 연결을 해제했어요');
      // 사용자 문서의 coupleId가 비워져 ProtectedRoute도 커플 연결 화면으로 보내지만, 기다리지 않고 바로 이동
      navigate('/couple-setup', { replace: true });
    } catch (error) {
      console.error('커플 연결 해제 실패:', error);
      toast.error(getFriendlyErrorMessage(error, '연결을 해제하지 못했어요. 잠시 후 다시 시도해주세요.'));
      setLeaving(false);
    }
  };

  const busy = leaving || !!saving;

  return (
    <div className="acc-overlay" onClick={() => !busy && onClose()}>
      <div className="acc-card" role="dialog" aria-modal="true" aria-labelledby="leave-title" onClick={(e) => e.stopPropagation()}>
        <p className="acc-title" id="leave-title">커플 연결을 해제할까요?</p>
        <ul className="acc-list">
          <li>해제하면 두 사람 모두 <strong>우리 기록(일정·여행·버킷리스트·봉인 편지)</strong>을 볼 수 없게 돼요. 개인 일정은 그대로 남아요.</li>
          <li>기록은 <strong>30일 동안</strong> 보관되고, 그 안에는 연결 해제를 취소할 수 있어요.</li>
          <li>30일이 지나면 모든 기록이 <strong>완전히 삭제</strong>되고 되돌릴 수 없어요.</li>
        </ul>
        <div className="acc-save-box">
          <p>{partnerName ? `${partnerName}님과 함께한 기록` : '함께한 기록'}을 간직하고 싶다면 파일로 저장해 두세요.</p>
          <button type="button" className="acc-save-btn" onClick={saveCurrent} disabled={busy}>
            <HiArrowDownTray />
            {saving === 'current' ? '기록을 모으는 중…' : '기록 파일 저장'}
          </button>
        </div>
        <div className="acc-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>취소</button>
          <button type="button" className="btn btn-danger" onClick={handleLeave} disabled={busy}>
            {leaving ? '해제하는 중…' : '연결 해제'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveCoupleModal;
