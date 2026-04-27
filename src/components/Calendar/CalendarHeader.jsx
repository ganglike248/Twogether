import React from 'react';

const formatMonthTitle = (date) =>
  `${date.getFullYear()}년 ${date.getMonth() + 1}월`;

const CalendarHeader = ({
  currentDate,
  isCurrentMonth,
  onPrevMonth,
  onNextMonth,
  onGoToday,
  onShowEditLog,
}) => {
  return (
    <div className="calendar-header">
      <div className="calendar-header-nav">
        <button className="cal-nav-btn" onClick={onPrevMonth}>‹</button>
        <button className="cal-nav-btn" onClick={onNextMonth}>›</button>
      </div>
      <span className="calendar-title">{formatMonthTitle(currentDate)}</span>
      <div className="calendar-header-actions">
        <button
          className={`cal-action-btn${isCurrentMonth ? ' active' : ''}`}
          onClick={onGoToday}
        >
          오늘
        </button>
        <button
          className="cal-action-btn"
          onClick={onShowEditLog}
        >
          수정기록
        </button>
      </div>
    </div>
  );
};

export default CalendarHeader;
