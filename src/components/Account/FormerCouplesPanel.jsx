// src/components/Account/FormerCouplesPanel.jsx
// 연결이 해제돼 30일 동안 보관 중인 이전 커플 카드 — [기록 파일 저장] + (해제한 사람이고 아무도 새로 연결 안 했을 때만)
// [연결 해제 취소]. 커플 연결 화면, 데이터 백업 화면, 회원 탈퇴 화면에서 공용.
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { HiArrowDownTray } from 'react-icons/hi2';
import ConfirmModal from '../common/ConfirmModal';
import useRecordSave from '../../hooks/useRecordSave';
import { cancelLeaveCouple } from '../../services/coupleLifecycleService';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import './account.css';

const fmt = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

const FormerCouplesPanel = ({ couples, onChanged, allowCancel = true }) => {
  const { saving, saveFormer } = useRecordSave();
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  if (!couples?.length) return null;

  const handleCancel = async () => {
    if (!cancelTarget || cancelling) return;
    setCancelling(true);
    try {
      await cancelLeaveCouple(cancelTarget.coupleId);
      toast.success(`${cancelTarget.partnerName}님과 다시 연결됐어요`);
      setCancelTarget(null);
      // 사용자 문서의 coupleId가 다시 채워지면 커플 연결 화면이 알아서 홈으로 보냄
      onChanged?.();
    } catch (error) {
      console.error('연결 해제 취소 실패:', error);
      toast.error(getFriendlyErrorMessage(error, '취소하지 못했어요. 잠시 후 다시 시도해주세요.'));
      setCancelTarget(null);
      onChanged?.(); // 상대가 새로 연결해서 취소 불가가 된 경우 등 — 최신 상태로 다시 불러옴
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="acc-former">
      {couples.map((c) => (
        <div className="acc-former-card" key={c.coupleId}>
          <div className="acc-former-head">
            <span className="acc-former-name">{c.partnerName}님과의 기록이 보관 중이에요</span>
            <span className="acc-former-days">{c.daysLeft}일 남음</span>
          </div>
          <p className="acc-former-desc">
            {fmt(c.dissolvedAt)}에 연결이 해제됐어요. {fmt(c.purgeAfter)}에 모든 기록이 삭제돼요.
          </p>
          <div className="acc-former-actions">
            <button type="button" className="btn btn-secondary" onClick={() => saveFormer(c.coupleId)} disabled={!!saving}>
              <HiArrowDownTray style={{ marginRight: '0.3rem', verticalAlign: '-2px' }} />
              {saving === c.coupleId ? '기록을 모으는 중…' : '기록 파일 저장'}
            </button>
            {allowCancel && c.canCancel && (
              <button type="button" className="btn btn-primary" onClick={() => setCancelTarget(c)} disabled={!!saving}>
                연결 해제 취소
              </button>
            )}
          </div>
        </div>
      ))}

      <ConfirmModal
        isOpen={!!cancelTarget}
        title="연결 해제를 취소할까요?"
        message={cancelTarget ? `${cancelTarget.partnerName}님과 다시 연결되고, 지금까지의 기록을 그대로 볼 수 있어요.` : ''}
        confirmText={cancelling ? '연결하는 중…' : '다시 연결'}
        danger={false}
        confirmDisabled={cancelling}
        onConfirm={handleCancel}
        onCancel={() => !cancelling && setCancelTarget(null)}
      />
    </div>
  );
};

export default FormerCouplesPanel;
