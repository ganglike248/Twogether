import React, { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

const getMonthKey = (date) =>
  `${date.getFullYear()}-${date.getMonth()}`;

const CalendarGrid = ({
  months,
  allEvents,
  specialDaysMap,
  sliderStyle,
  sliderViewRef,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onDateClick,
  onMoreLinkClick,
}) => {
  const eventClassNames = (arg) => {
    const ep = arg.event.extendedProps;
    if (ep.isPeriod) return ['period-event'];
    if (ep.isPeriodPredicted) return ['period-predicted-event'];
    if (ep.isCycleMeta) return ['cycle-meta-event'];
    if (ep.isSpecial) return ['special-day-event', ep.specialType];
    if (ep.isTrip) return ['trip-event'];
    switch (ep.eventType) {
      case 'boyfriend': return ['boyfriend-event'];
      case 'girlfriend': return ['girlfriend-event'];
      default: return ['couple-event'];
    }
  };

  const eventDidMount = (info) => {
    const ep = info.event.extendedProps;
    if (ep.isPeriod || ep.isPeriodPredicted || ep.isCycleMeta) return;
    if (ep.isSpecial) return;
    if (ep.eventType === 'girlfriend') info.el.style.fontWeight = 'bold';
    info.el.style.pointerEvents = 'none';
  };

  const dayCellClassNames = (arg) => {
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${arg.date.getFullYear()}-${pad(arg.date.getMonth() + 1)}-${pad(arg.date.getDate())}`;
    const specials = specialDaysMap.get(dateStr);
    if (!specials?.length) return [];
    return [specials.some((s) => s.type === 'holiday') ? 'day-holiday' : 'day-couple'];
  };

  return (
    <div
      className="calendar-slider-view"
      ref={sliderViewRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="calendar-slider-track" style={sliderStyle}>
        {months.map((month) => (
          <div key={getMonthKey(month)} className="calendar-slider-panel">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              initialDate={month}
              headerToolbar={false}
              dayCellContent={(arg) => arg.dayNumberText.replace('일', '')}
              dayCellClassNames={dayCellClassNames}
              selectable={false}
              events={allEvents}
              dateClick={onDateClick}
              eventClassNames={eventClassNames}
              eventDidMount={eventDidMount}
              dayMaxEvents={true}
              moreLinkClick={onMoreLinkClick}
              height="100%"
              locale="ko"
              longPressDelay={0}
              selectLongPressDelay={0}
              eventInteractive={false}
              displayEventTime={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarGrid;
