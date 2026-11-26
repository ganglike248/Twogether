// src/components/BucketList/BucketCard.jsx — 보드의 작은 카드(누르면 상세 시트)
import React from 'react';
import { MdFavorite, MdFavoriteBorder, MdEvent } from 'react-icons/md';
import { pressable } from '../../utils/pressable';
import { formatMonthDay } from '../../utils/dateFormat';
import { bucketMetaText, likeUids } from '../../services/bucket/bucketLogic';
import { KindChip, CategoryChip } from './BucketChips';

const BucketCard = React.memo(({ bucket, uid, todayStr, customCategories, onOpen }) => {
  const likes = likeUids(bucket);
  const mine = likes.includes(uid);
  return (
    <div className={`bk-card${bucket.plannedDate ? ' planned' : ''}`} {...pressable(() => onOpen(bucket))}>
      <b className="bk-card-t">{bucket.title}</b>
      <div className="bk-meta">
        <KindChip bucket={bucket} />
        <CategoryChip category={bucket.category} customCategories={customCategories} />
      </div>
      <div className="bk-card-foot">
        <span className={bucket.plannedDate ? 'bk-planned' : ''}>
          {bucket.plannedDate && <MdEvent aria-hidden="true" />}
          {bucketMetaText(bucket, todayStr, formatMonthDay)}
        </span>
        {likes.length > 0 && (
          <span className="bk-love" aria-label={`하고 싶어요 ${likes.length}`}>
            {mine || likes.length > 1 ? <MdFavorite aria-hidden="true" /> : <MdFavoriteBorder aria-hidden="true" />}
            {likes.length > 1 ? 2 : ''}
          </span>
        )}
      </div>
    </div>
  );
});

BucketCard.displayName = 'BucketCard';
export default BucketCard;
