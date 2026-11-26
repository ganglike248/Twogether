// src/components/BucketList/BucketPlanSheet.jsx
// [언제 할까?] — 날짜만 고르면 캘린더에 커플 일정 생성. 이미 계획이 있으면 날짜 바꾸기.
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import BucketSheet from './BucketSheet';
import { weekendChoices } from '../../services/bucket/bucketLogic';
import { formatMonthDay } from '../../utils/dateFormat';

const BucketPlanSheet = ({ bucket, todayStr, onClose, onSubmit }) => {
  const open = !!bucket;
  const { thisWeekend, nextWeekend } = weekendChoices(todayStr);
  const [date, setDate] = useState(thisWeekend);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const start = bucket.plannedDate && bucket.plannedDate >= todayStr ? bucket.plannedDate : thisWeekend;
    setDate(start);
    setPicking(start !== thisWeekend && start !== nextWeekend);
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bucket?.id]);

  if (!open) return null;
  const replanning = !!bucket.plannedDate;

  const submit = async () => {
    if (!date) return;
    if (date < todayStr) { toast.warning('지난 날짜는 고를 수 없어요'); return; }
    if (replanning && date === bucket.plannedDate) { onClose(); return; }
    setBusy(true);
    const ok = await onSubmit(bucket, date);
    if (!ok) setBusy(false);
  };

  return (
    <BucketSheet
      open={open}
      onClose={onClose}
      label="언제 할까요?"
      footer={<button type="button" className="bk-wide-btn" onClick={submit} disabled={busy || !date}>{replanning ? '날짜 바꾸기' : '일정 만들기'}</button>}
    >
      <h2 className="bk-sheet-t">언제 할까요?</h2>
      <p className="bk-sheet-sub">{bucket.title}</p>
      <div className="bk-dates">
        <button type="button" className={!picking && date === thisWeekend ? 'on' : ''} onClick={() => { setDate(thisWeekend); setPicking(false); }}>
          {thisWeekend === todayStr ? '오늘' : '이번 주말'} {formatMonthDay(thisWeekend)}
        </button>
        <button type="button" className={!picking && date === nextWeekend ? 'on' : ''} onClick={() => { setDate(nextWeekend); setPicking(false); }}>
          다음 주말 {formatMonthDay(nextWeekend)}
        </button>
        <button type="button" className={picking ? 'on' : ''} onClick={() => setPicking(true)}>날짜 고르기</button>
      </div>
      {picking && (
        <input className="bk-input" type="date" value={date} min={todayStr} onChange={e => setDate(e.target.value)} aria-label="할 날짜" />
      )}
      <p className="bk-info">캘린더에 커플 일정으로 추가돼요. 그날이 지나면 &quot;했어요?&quot;로 물어볼게요.</p>
    </BucketSheet>
  );
};

export default BucketPlanSheet;
