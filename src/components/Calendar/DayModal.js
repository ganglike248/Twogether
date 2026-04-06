import React from 'react';
import { format, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import './DayModal.css';
import { subDays } from 'date-fns';

const DayModal = ({ isOpen, onClose, selectedDate, dayEvents, specialDays = [], onAddEvent, onEditEvent }) => {
  if (!isOpen || !selectedDate) return null;

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'M월 d일 EEEE', { locale: ko });
    } catch (error) {
      return dateString;
    }
  };

  const formatDateRange = (startDate, endDate) => {
    try {
      if (!endDate || startDate === endDate) {
        return format(new Date(startDate), 'M월 d일', { locale: ko });
      }
      const start = new Date(startDate);
      let end = new Date(endDate);
      // 종료일에서 1일 빼기
      end = subDays(end, 1);
      if (start.getTime() === end.getTime()) {
        return format(start, 'M월 d일', { locale: ko });
      } else {
        return `${format(start, 'M월 d일', { locale: ko })} ~ ${format(end, 'M월 d일', { locale: ko })}`;
      }
    } catch (error) {
      return `${startDate} ~ ${endDate}`;
    }
  };

  const getEventDuration = (startDate, endDate) => {
    if (!endDate || startDate === endDate) return '';
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = differenceInDays(end, start) + 1;
      return '';
    } catch (error) {
      return '';
    }
  };

  const getEventTypeIcon = (eventType) => {
    switch(eventType) {
      case 'boyfriend': return '🐶';
      case 'girlfriend': return '🐹';
      case 'couple': return '🥰';
      default: return '📅';
    }
  };

  const getEventTypeName = (eventType) => {
    switch(eventType) {
      case 'boyfriend': return '경락';
      case 'girlfriend': return '효정';
      case 'couple': return '데이트';
      default: return '일정';
    }
  };

  // 이벤트를 시작일 기준으로 정렬
  const sortedEvents = [...dayEvents].sort((a, b) => {
    const aStart = new Date(a.start);
    const bStart = new Date(b.start);
    return aStart - bStart;
  });

  return (
    <div className="day-modal-overlay">
      <div className="day-modal-container">
        <div className="day-modal-header">
          <div className="day-modal-date">
            <h2 className="day-modal-title">{formatDate(selectedDate)}</h2>
            <p className="day-modal-subtitle">
              {dayEvents.length > 0 ? `총 ${dayEvents.length}개의 일정` : '일정이 없습니다'}
            </p>
          </div>
          <button className="day-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="day-modal-content">
          {/* 공휴일·커플기념일 표시 */}
          {specialDays.length > 0 && (
            <div className="day-special-list">
              {specialDays.map((s, i) => (
                <div key={i} className={`day-special-item ${s.type}`}>
                  <span className="day-special-prefix">오늘은</span>
                  <span className="day-special-name">{s.name}</span>
                </div>
              ))}
            </div>
          )}

          {dayEvents.length === 0 ? (
            <div className="day-modal-empty">
              <div className="empty-icon">📅</div>
              <p className="empty-text">이 날에는 일정이 없습니다</p>
            </div>
          ) : (
              <div className="day-events-list">
                {sortedEvents
                  // 👇 이 부분 추가!
                  .filter(event => {
                    const eventStart = event.start.split('T')[0];
                    let eventEnd = event.end ? event.end.split('T')[0] : eventStart;
                    if (eventEnd !== eventStart) {
                      eventEnd = format(subDays(new Date(eventEnd), 1), 'yyyy-MM-dd');
                    }
                    return selectedDate >= eventStart && selectedDate <= eventEnd;
                  })
                  
                  .map((event) => {
                    const eventStart = event.start.split('T')[0];
                    const eventEnd = event.end ? event.end.split('T')[0] : eventStart;
                    const duration = getEventDuration(eventStart, eventEnd);

                    return (
                      <div
                        key={event.id}
                        className={`day-event-item ${event.extendedProps.eventType}`}
                        onClick={() => onEditEvent(event)}
                      >
                    <div className="event-icon">
                      {getEventTypeIcon(event.extendedProps.eventType)}
                    </div>
                    <div className="event-details">
                      <div className="event-title">{event.title}</div>
                      <div className="event-meta">
                        <span className={`event-type ${event.extendedProps.eventType}`}>
                          {getEventTypeName(event.extendedProps.eventType)}
                        </span>
                        {duration && (
                          <span className="event-duration">
                            {duration}
                          </span>
                        )}
                        <span className="event-date-range">
                          {formatDateRange(eventStart, eventEnd)}
                        </span>
                      </div>
                      {event.extendedProps.description && (
                        <div className="event-description">
                          {event.extendedProps.description}
                        </div>
                      )}
                    </div>
                    <div className="event-arrow">›</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="day-modal-footer">
          <button 
            className="add-event-btn"
            onClick={() => onAddEvent(selectedDate)}
          >
            <span className="add-icon">+</span>
            {formatDate(selectedDate)}에 일정 추가
          </button>
        </div>
      </div>
    </div>
  );
};

export default DayModal;
