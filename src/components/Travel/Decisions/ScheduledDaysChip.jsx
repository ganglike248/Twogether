// src/components/Travel/Decisions/ScheduledDaysChip.jsx
// 이 후보로 만든 일정이 들어 있는 날 — "Day 2" / "Day 1 · 3". 일정 쪽(schedule.sourceOptionId)에서 거꾸로 계산하므로
// 일정을 지우면 표시도 같이 사라짐.
import React from 'react';
import { MdEvent } from 'react-icons/md';

const ScheduledDaysChip = ({ days }) => {
  if (!days || days.length === 0) return null;
  return (
    <span className="op-days-chip">
      <MdEvent />Day {days.join(' · ')} 일정
    </span>
  );
};

export default ScheduledDaysChip;
