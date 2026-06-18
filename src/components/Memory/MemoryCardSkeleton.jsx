// src/components/Memory/MemoryCardSkeleton.jsx
import React from 'react';
import Skeleton from '../common/Skeleton';

export const MemoryCardSkeleton = () => (
  <div className="memory-card-skeleton">
    <Skeleton height="200px" borderRadius="12px" />
    <Skeleton height="20px" style={{ marginTop: '12px' }} borderRadius="6px" />
    <Skeleton height="16px" width="80%" style={{ marginTop: '8px' }} borderRadius="6px" />
  </div>
);

export const MemoryListSkeleton = () => (
  <div className="memories-grid">
    {Array(6).fill(null).map((_, i) => (
      <MemoryCardSkeleton key={i} />
    ))}
  </div>
);

export default MemoryCardSkeleton;
