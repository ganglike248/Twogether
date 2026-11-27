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
  onOpenMonthPicker,
}) => {
  return (
    <div className="calendar-header">
      <div className="calendar-header-nav">
        <button className="cal-nav-btn" onClick={onPrevMonth} aria-label="이전 달">‹</button>
        <button className="cal-nav-btn" onClick={onNextMonth} aria-label="다음 달">›</button>
      </div>
      {/* 누르면 연·월 바로 가기 창 */}
      <button type="button" className="calendar-title-btn" onClick={onOpenMonthPicker} aria-label={`${formatMonthTitle(currentDate)}, 다른 달 고르기`}>
        <span className="calendar-title">{formatMonthTitle(currentDate)}</span>
        <span className="calendar-title-caret" aria-hidden="true">⌄</span>
      </button>
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
