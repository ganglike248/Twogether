// src/components/Travel/TravelCardSkeleton.jsx
import React from 'react';
import Skeleton from '../../common/Skeleton';

export const TravelCardSkeleton = () => (
  <div className="travel-card-skeleton">
    <Skeleton height="150px" borderRadius="12px" />
    <Skeleton height="24px" style={{ marginTop: '12px' }} borderRadius="6px" />
    <Skeleton height="16px" width="60%" style={{ marginTop: '8px' }} borderRadius="6px" />
  </div>
);

export const TravelPlanSkeleton = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
    {Array(3).fill(null).map((_, i) => (
      <TravelCardSkeleton key={i} />
    ))}
  </div>
);

export default TravelCardSkeleton;
