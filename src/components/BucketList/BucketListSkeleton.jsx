// src/components/BucketList/BucketListSkeleton.jsx
import React from 'react';
import Skeleton from '../common/Skeleton';

export const BucketItemSkeleton = () => (
  <div className="bucket-item-skeleton">
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <Skeleton height="24px" width="24px" borderRadius="4px" />
      <Skeleton height="20px" width="70%" borderRadius="6px" />
    </div>
    <Skeleton height="14px" width="40%" style={{ marginTop: '8px' }} borderRadius="4px" />
  </div>
);

export const BucketListSkeleton = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
    {Array(4).fill(null).map((_, i) => (
      <BucketItemSkeleton key={i} />
    ))}
  </div>
);

export default BucketItemSkeleton;
