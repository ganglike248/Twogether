// src/components/Calendar/CalendarSkeleton.jsx
import React from 'react';
import Skeleton from '../common/Skeleton';

const CalendarSkeleton = () => (
  <div className="calendar-skeleton">
    {/* 헤더 영역 */}
    <div className="calendar-header-skeleton">
      <Skeleton height="32px" width="200px" borderRadius="6px" />
    </div>

    {/* 요일 표시 */}
    <div className="calendar-weekdays-skeleton">
      {Array(7).fill(null).map((_, i) => (
        <div key={i} style={{ padding: '8px' }}>
          <Skeleton height="20px" borderRadius="4px" />
        </div>
      ))}
    </div>

    {/* 달력 그리드 (5주 x 7일) */}
    <div className="calendar-grid-skeleton">
      {Array(35).fill(null).map((_, i) => (
        <div key={i} style={{ padding: '8px' }}>
          <Skeleton height="60px" borderRadius="8px" />
        </div>
      ))}
    </div>
  </div>
);

export default CalendarSkeleton;
