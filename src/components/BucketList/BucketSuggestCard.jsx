// src/components/BucketList/BucketSuggestCard.jsx
// "이번 주말 이거 어때요?" — rankSuggestions 순서로 1장, [다른 거]로 넘김. 계획 없는 진행 중 항목이 없으면 안 보임.
import React, { useState } from 'react';
import { MdEvent, MdCheck, MdRefresh } from 'react-icons/md';
import { formatMonthDay } from '../../utils/dateFormat';
import { isRepeat, doneCountOf, bothLiked, createdDateStr, dayDiff } from '../../services/bucket/bucketLogic';
import { KindChip, CategoryChip, BothLikedChip } from './BucketChips';
import { pressable } from '../../utils/pressable';

const BucketSuggestCard = ({ suggestions, todayStr, customCategories, onOpen, onPlan, onDone }) => {
  const [index, setIndex] = useState(0);
  if (!suggestions.length) return null;
  const b = suggestions[index % suggestions.length];
  const n = doneCountOf(b);
  const created = createdDateStr(b);
  const since = isRepeat(b)
    ? (b.lastDoneAt ? `마지막 · ${formatMonthDay(b.lastDoneAt)}` : '아직 안 해봤어요')
    : (created ? `담은 지 ${Math.max(0, dayDiff(created, todayStr))}일` : '');

  return (
    <section className="bk-sug" aria-label="추천">
      <span className="bk-tape" aria-hidden="true" />
      <div className="bk-sug-head">
        <p className="bk-lab">이번 주말 이거 어때요?</p>
        {suggestions.length > 1 && (
          <button type="button" className="bk-text-btn" onClick={() => setIndex(i => i + 1)}><MdRefresh aria-hidden="true" />다른 거</button>
        )}
      </div>
      <h3 className="bk-sug-t" {...pressable(() => onOpen(b))}>{b.title}</h3>
      <div className="bk-meta">
        <KindChip bucket={b} suffix={isRepeat(b) && n > 0 ? ` · ${n}번 함` : ''} />
        <CategoryChip category={b.category} customCategories={customCategories} />
        {bothLiked(b) && <BothLikedChip />}
        {since && <span className="bk-meta-tx">{since}</span>}
      </div>
      <div className="bk-acts">
        <button type="button" className="bk-btn" onClick={() => onPlan(b)}><MdEvent aria-hidden="true" />언제 할까?</button>
        <button type="button" className="bk-btn primary" onClick={() => onDone(b)}><MdCheck aria-hidden="true" />했어요</button>
      </div>
    </section>
  );
};

export default BucketSuggestCard;
