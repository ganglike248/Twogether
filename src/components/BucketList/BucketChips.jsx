// src/components/BucketList/BucketChips.jsx — 카드·시트 공통 작은 칩(종류·카테고리·공감)
import React from 'react';
import { MdRepeat, MdStar, MdFavorite } from 'react-icons/md';
import { getCategoryColor, getCategoryTextColor, getCategoryDisplayName, isKnownCategory } from '../../services/categoryColorService';
import { isRepeat, KIND_SHORT } from '../../services/bucket/bucketLogic';

export const KindChip = ({ bucket, suffix = '' }) => (isRepeat(bucket)
  ? <span className="bk-chip rep"><MdRepeat aria-hidden="true" />{KIND_SHORT.repeat}{suffix}</span>
  : <span className="bk-chip once"><MdStar aria-hidden="true" />{KIND_SHORT.once}{suffix}</span>);

export const CategoryChip = ({ category, customCategories }) => (isKnownCategory(category, customCategories)
  ? (
    <span className="bk-chip cat" style={{ '--bk-cat': getCategoryColor(category, customCategories), '--bk-cat-text': getCategoryTextColor(category, customCategories) }}>
      {getCategoryDisplayName(category, customCategories)}
    </span>
  ) : null);

export const BothLikedChip = () => <span className="bk-chip love"><MdFavorite aria-hidden="true" />둘 다 하고 싶어요</span>;
