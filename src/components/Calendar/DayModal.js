import React, { useEffect, useRef } from "react";
import { format, subDays } from "date-fns";
import { ko } from "date-fns/locale";
import "./DayModal.css";
import { useAuthContext } from "../../contexts/AuthContext";
import EmptyState from "../common/EmptyState";
import { MdCalendarToday } from "react-icons/md";

const DayModal = ({
  isOpen,
  onClose,
  selectedDate,
  dayEvents,
  specialDays = [],
  onAddEvent,
  onEditEvent,
}) => {
  const { getMemberName } = useAuthContext();
  const openedAtRef = useRef(0);

  useEffect(() => {
    if (isOpen) openedAtRef.current = Date.now();
  }, [isOpen]);

  if (!isOpen || !selectedDate) return null;

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "M월 d일 EEEE", { locale: ko });
    } catch {
      return dateString;
    }
  };

  const getDateString = (dateValue) => {
    if (typeof dateValue === "string") return dateValue.split("T")[0];
    if (dateValue instanceof Date) return dateValue.toISOString().split("T")[0];
    return "";
  };

  const formatDateRange = (startDate, endDate) => {
    try {
      const start = getDateString(startDate);
      const end = getDateString(endDate);
      if (!end || start === end) {
        return format(new Date(start), "M월 d일", { locale: ko });
      }
      const startObj = new Date(start);
      let endObj = subDays(new Date(end), 1);
      if (startObj.getTime() === endObj.getTime()) {
        return format(startObj, "M월 d일", { locale: ko });
      }
      return `${format(startObj, "M월 d일", { locale: ko })} ~ ${format(
        endObj,
        "M월 d일",
        { locale: ko },
      )}`;
    } catch {
      return `${startDate} ~ ${endDate}`;
    }
  };

  const getEventTypeIcon = (eventType, isTrip) => {
    if (isTrip) return "✈️";
    switch (eventType) {
      case "boyfriend":
        return "🐶";
      case "girlfriend":
        return "🐹";
      case "couple":
        return "🥰";
      case "personal":
        return "🔒";
      default:
        return <MdCalendarToday size={18} color="#4dabf7" />;
    }
  };

  const getEventTypeName = (eventType, isTrip) => {
    if (isTrip) return "여행";
    if (eventType === "couple") return "데이트";
    if (eventType === "boyfriend" || eventType === "girlfriend")
      return getMemberName(eventType);
    if (eventType === "personal") return "개인";
    return "일정";
  };

  const sortedEvents = [...dayEvents].sort(
    (a, b) => new Date(a.start) - new Date(b.start),
  );

  const handleOverlayClick = () => {
    // 방금 열렸다면(캘린더 날짜 탭 뒤 iOS가 합성하는 ghost click) 무시 — 모달이 열리자마자
    // 닫혀 번쩍이는 것을 방지. 명시적으로 배경을 눌러 닫는 정상 동작은 300ms 뒤부터 유효.
    if (Date.now() - openedAtRef.current < 300) return;
    onClose();
  };

  return (
    <div className="day-modal-overlay" onClick={handleOverlayClick}>
      <div className="day-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="day-modal-header">
          <div className="day-modal-date">
            <h2 className="day-modal-title">{formatDate(selectedDate)}</h2>
            <p className="day-modal-subtitle">
              {dayEvents.length > 0
                ? `총 ${dayEvents.length}개의 일정`
                : "일정이 없습니다"}
            </p>
          </div>
          <button className="day-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="day-modal-content">
          {/* 공휴일·커플기념일 */}
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

          {/* 일반 일정 */}
          {dayEvents.length === 0 ? (
            <EmptyState
              icon={<MdCalendarToday size={56} color="#4dabf7" />}
              title="이 날에는 일정이 없습니다"
              text="새로운 일정을 추가하거나 추억을 기록해보세요!"
            />
          ) : (
            <div className="day-events-list">
              {sortedEvents
                .filter((event) => {
                  const eventStart = getDateString(event.start);
                  let eventEnd = event.end
                    ? getDateString(event.end)
                    : eventStart;
                  if (eventEnd !== eventStart) {
                    eventEnd = format(
                      subDays(new Date(eventEnd), 1),
                      "yyyy-MM-dd",
                    );
                  }
                  return selectedDate >= eventStart && selectedDate <= eventEnd;
                })
                .map((event) => {
                  const eventStart = getDateString(event.start);
                  const eventEnd = event.end
                    ? getDateString(event.end)
                    : eventStart;
                  const isTrip = event.extendedProps?.isTrip;
                  const eventTypeClass = isTrip
                    ? "trip"
                    : event.extendedProps?.eventType;
                  return (
                    <div
                      key={event.id}
                      className={`day-event-item ${eventTypeClass}`}
                      onClick={() => onEditEvent(event)}
                    >
                      <div className="event-icon-section">
                        <div className="event-icon">
                          {getEventTypeIcon(
                            event.extendedProps?.eventType,
                            isTrip,
                          )}
                        </div>
                        <div className="event-type-name">
                          {getEventTypeName(
                            event.extendedProps?.eventType,
                            isTrip,
                          )}
                        </div>
                      </div>
                      <div className="event-details">
                        <div className="event-title">{event.title}</div>
                        <div className="event-meta">
                          <span className={`event-type ${eventTypeClass}`}>
                            {getEventTypeName(
                              event.extendedProps?.eventType,
                              isTrip,
                            )}
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
          {/* 일정 추가 */}
          <div className="day-modal-footer-buttons">
            <button
              className="add-event-btn"
              onClick={() => onAddEvent(selectedDate)}
            >
              <span className="add-icon">+</span>
              일정 추가
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayModal;
