// src/components/BucketList/BucketCheckCard.jsx
// 계획한 날이 지난 '하고 싶은 것' — "○○, 했어요?" (보드 맨 위 + 홈 '오늘' 탭 맨 위). 가장 오래된 1개만.
// [했어요] → 했어요 시트(/bucket?modal=done), [아직이에요] → 계획만 풀고 목록엔 그대로(캘린더 일정은 지움).
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MdCheck } from 'react-icons/md';
import { useAuthContext } from '../../contexts/AuthContext';
import { getPendingBucketChecks, dayDiff } from '../../services/bucket/bucketLogic';
import { unplanBucket } from '../../services/bucket/bucketService';
import { formatMonthDay } from '../../utils/dateFormat';
import { getLocalDateStr } from '../../utils/dataUtils';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import './BucketCheckCard.css';

const BucketCheckCard = ({ bucketList, className = '' }) => {
  const { user, coupleId } = useAuthContext();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const todayStr = getLocalDateStr();
  const [b] = getPendingBucketChecks(bucketList, todayStr);
  if (!b) return null;

  const ago = dayDiff(b.plannedDate, todayStr);
  const notYet = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await unplanBucket(b, user?.uid, coupleId);
      toast.info('계획만 풀었어요. 목록엔 그대로 있어요');
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, '잠시 후 다시 시도해주세요.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`home-card bk-check ${className}`} aria-label="했어요?">
      <p className="bk-check-k">{ago <= 1 ? '어제 하기로 한 것' : `${formatMonthDay(b.plannedDate)}에 하기로 한 것`}</p>
      <h2 className="bk-check-t">{b.title},<br />했어요?</h2>
      <div className="bk-check-acts">
        <button type="button" className="bk-check-btn" onClick={notYet} disabled={busy}>아직이에요</button>
        <button
          type="button"
          className="bk-check-btn primary"
          onClick={() => navigate(`/bucket?modal=done&id=${b.id}`, { state: { modal: true } })}
        >
          <MdCheck aria-hidden="true" />했어요
        </button>
      </div>
    </section>
  );
};

export default BucketCheckCard;
