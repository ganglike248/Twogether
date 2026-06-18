// src/components/Home/HomeSkeleton.jsx
import React from 'react';
import Skeleton from '../common/Skeleton';

export const StatsBarSkeleton = () => (
  <div className="stats-bar-skeleton">
    <div style={{ flex: 1 }}>
      <Skeleton height="16px" width="60%" borderRadius="4px" />
      <Skeleton height="24px" width="80%" style={{ marginTop: '8px' }} borderRadius="6px" />
    </div>
    <div style={{ flex: 1 }}>
      <Skeleton height="16px" width="60%" borderRadius="4px" />
      <Skeleton height="24px" width="80%" style={{ marginTop: '8px' }} borderRadius="6px" />
    </div>
  </div>
);

export const EventCardSkeleton = () => (
  <div className="event-card-skeleton">
    <Skeleton height="60px" borderRadius="8px" />
  </div>
);

export const HomeSkeleton = () => (
  <div className="home-skeleton">
    {/* 히어로 이미지 */}
    <Skeleton height="200px" borderRadius="12px" />

    {/* 통계 바 */}
    <div style={{ marginTop: '20px' }}>
      <StatsBarSkeleton />
    </div>

    {/* 다음 일정 */}
    <div style={{ marginTop: '24px' }}>
      <Skeleton height="20px" width="100px" borderRadius="6px" />
      <Skeleton height="60px" style={{ marginTop: '12px' }} borderRadius="8px" />
    </div>

    {/* 이번 달 일정 */}
    <div style={{ marginTop: '24px' }}>
      <Skeleton height="20px" width="120px" borderRadius="6px" />
      {Array(3).fill(null).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export default HomeSkeleton;
