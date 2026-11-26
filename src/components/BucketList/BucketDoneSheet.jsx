// src/components/BucketList/BucketDoneSheet.jsx
// [했어요] — 날짜(오늘·어제·고르기, 미래 불가) + 한 줄 후기(선택). mode='date'면 이룬 날짜 고치기만(후기 없음).
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import BucketSheet from './BucketSheet';
import { isRepeat, doneCountOf, addDaysStr, isFutureDate } from '../../services/bucket/bucketLogic';
import { formatMonthDay } from '../../utils/dateFormat';

const BucketDoneSheet = ({ bucket, mode = 'done', todayStr, onClose, onSubmit }) => {
  const open = !!bucket;
  const yesterday = addDaysStr(todayStr, -1);
  const [date, setDate] = useState(todayStr);
  const [picking, setPicking] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const start = mode === 'date' && bucket.completedAt ? bucket.completedAt
      : (bucket.plannedDate && bucket.plannedDate <= todayStr ? bucket.plannedDate : todayStr);
    setDate(start);
    setPicking(start !== todayStr && start !== yesterday);
    setNote('');
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bucket?.id, mode]);

  if (!open) return null;
  const repeat = isRepeat(bucket);

  const submit = async () => {
    if (!date) return;
    if (isFutureDate(date, todayStr)) { toast.warning('미래 날짜는 선택할 수 없어요'); return; }
    setBusy(true);
    const ok = await onSubmit(bucket, { date, note });
    if (!ok) setBusy(false);
  };

  const title = mode === 'date' ? '언제 이뤘어요?' : `${bucket.title}, 했어요!`;

  return (
    <BucketSheet
      open={open}
      onClose={onClose}
      label={title}
      footer={<button type="button" className="bk-wide-btn" onClick={submit} disabled={busy || !date}>{mode === 'date' ? '날짜 바꾸기' : '기록하기'}</button>}
    >
      <h2 className="bk-sheet-t">{title}</h2>
      {mode === 'date' && <p className="bk-sheet-sub">{bucket.title}</p>}
      <p className="bk-label">언제 했어요?</p>
      <div className="bk-dates">
        <button type="button" className={!picking && date === todayStr ? 'on' : ''} onClick={() => { setDate(todayStr); setPicking(false); }}>오늘 {formatMonthDay(todayStr)}</button>
        <button type="button" className={!picking && date === yesterday ? 'on' : ''} onClick={() => { setDate(yesterday); setPicking(false); }}>어제</button>
        <button type="button" className={picking ? 'on' : ''} onClick={() => setPicking(true)}>날짜 고르기</button>
      </div>
      {picking && (
        <input className="bk-input" type="date" value={date} max={todayStr} onChange={e => setDate(e.target.value)} aria-label="한 날짜" />
      )}
      {mode !== 'date' && (
        <>
          <label className="bk-label" htmlFor="bk-done-note">한 줄 남길까요? (선택)</label>
          <input id="bk-done-note" className="bk-input" value={note} onChange={e => setNote(e.target.value)} maxLength={100} placeholder="예: 다음엔 3단계 도전" />
          <p className="bk-info">
            {repeat
              ? `목록에 그대로 남고 ${doneCountOf(bucket) + 1}번째 기록이 돼요`
              : "'이룬 것'으로 넘어가고 연말 랩업에 담겨요"}
          </p>
        </>
      )}
    </BucketSheet>
  );
};

export default BucketDoneSheet;
