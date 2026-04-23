// src/components/Calendar/Calendar.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import EventModal from './EventModal';
import DayModal from './DayModal';
import EditLogModal from '../EditLog/EditLogModal';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { createEvent, updateEvent, deleteEvent } from '../../services/eventService';
import { createCycle, deleteCycle } from '../../services/cycleService';
import { getSpecialDaysMap } from '../../utils/koreanHolidays';
import { useAuthContext } from '../../contexts/AuthContext';
import './Calendar.css';

const formatMonthTitle = (date) =>
  `${date.getFullYear()}년 ${date.getMonth() + 1}월`;

const getMonthKey = (date) =>
  `${date.getFullYear()}-${date.getMonth()}`;

// 날짜 문자열에 N일을 더해 새 날짜 문자열 반환 (FullCalendar exclusive end용)
const addDaysToStr = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const Calendar = () => {
  const { user, coupleId, coupleDoc } = useAuthContext();
  const [events, setEvents] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditLog, setShowEditLog] = useState(false);
  const [selectedEventForLog, setSelectedEventForLog] = useState(null);
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [dragX, setDragX] = useState(0);
  const [transitionDuration, setTransitionDuration] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const pendingDateRef = useRef(null);
  const touchStartXRef = useRef(null);
  const sliderViewRef = useRef(null);

  // 일정 구독
  useEffect(() => {
    if (!coupleId) return;
    const eventsRef = query(
      collection(db, 'events'),
      where('coupleId', '==', coupleId)
    );
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => {
        const data = doc.data();
        let color, textColor;
        switch (data.eventType) {
          case 'boyfriend':
            color = 'var(--color-boyfriend)'; textColor = '#757575'; break;
          case 'girlfriend':
            color = 'var(--color-girlfriend)'; textColor = '#757575'; break;
          case 'couple':
          default:
            color = 'var(--color-couple)'; textColor = '#757575'; break;
        }
        return {
          id: doc.id, title: data.title, start: data.start, end: data.end,
          allDay: true, color, textColor,
          extendedProps: {
            description: data.description,
            eventType: data.eventType,
            imageUrls: data.imageUrls || []
          }
        };
      });
      setEvents(eventsData);
      setIsLoading(false);
    }, () => setIsLoading(false));
    return () => unsubscribe();
  }, [coupleId]);

  // 생리 기록 구독
  useEffect(() => {
    if (!coupleId) return;
    const cyclesRef = query(
      collection(db, 'cycles'),
      where('coupleId', '==', coupleId)
    );
    const unsubscribe = onSnapshot(cyclesRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCycles(data);
    });
    return () => unsubscribe();
  }, [coupleId]);

  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      pendingDateRef.current = dateParam.split('T')[0];
      setSearchParams({}, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading && pendingDateRef.current) {
      setSelectedDate(pendingDateRef.current);
      setIsDayModalOpen(true);
      pendingDateRef.current = null;
    }
  }, [isLoading]);

  const months = useMemo(() => [
    new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
    new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
  ], [currentDate]);

  const specialDaysMap = useMemo(() => {
    const y = currentDate.getFullYear();
    return getSpecialDaysMap([y - 1, y, y + 1]);
  }, [currentDate]);

  const specialDayEvents = useMemo(() => {
    const result = [];
    specialDaysMap.forEach((specials, dateStr) => {
      const primary = specials.find((s) => s.type === 'holiday') || specials[0];
      result.push({
        id: `special-${dateStr}`,
        title: primary.name,
        start: dateStr,
        allDay: true,
        extendedProps: { isSpecial: true, specialType: primary.type },
      });
    });
    return result;
  }, [specialDaysMap]);

  // 생리 기록 → 이벤트 변환
  const periodEvents = useMemo(() => {
    const settings = coupleDoc?.cycleSettings;
    if (!settings?.enabled) return [];

    const cl = settings.cycleLength || 28;
    const pl = settings.periodLength || 5;
    const icon = settings.icon || '🌸';
    const label = settings.label || '생리';
    const color = settings.color || '#ffd6e0';
    const showFertile = settings.showFertile || false;
    const showOvulation = settings.showOvulation || false;

    const result = [];

    // 실제 생리 기록 → 이벤트 바
    cycles.forEach(cycle => {
      result.push({
        id: `period-actual-${cycle.id}`,
        title: icon,
        start: cycle.startDate,
        end: addDaysToStr(cycle.startDate, cycle.periodLength || pl),
        allDay: true,
        backgroundColor: color,
        borderColor: color,
        textColor: '#555',
        classNames: ['period-event'],
        extendedProps: { isPeriod: true, periodId: cycle.id },
      });
    });

    // 가장 최근 기록 기준으로 예정일·가임기·배란일 계산
    if (cycles.length > 0) {
      const sorted = [...cycles].sort((a, b) =>
        (b.startDate || '').localeCompare(a.startDate || '')
      );
      const mostRecent = sorted[0];
      const base = mostRecent.startDate;

      // 다음 예정일
      const nextStart = addDaysToStr(base, cl);
      result.push({
        id: 'period-predicted',
        title: '예정',
        start: nextStart,
        end: addDaysToStr(nextStart, pl),
        allDay: true,
        backgroundColor: color,
        borderColor: color,
        textColor: '#555',
        classNames: ['period-predicted-event'],
        extendedProps: { isPeriodPredicted: true },
      });

      // 가임기 (현재 사이클 기준)
      if (showFertile && cl - 19 >= 0) {
        result.push({
          id: 'cycle-fertile',
          title: '가임기',
          start: addDaysToStr(base, cl - 19),
          end: addDaysToStr(base, cl - 12),
          allDay: true,
          backgroundColor: 'rgba(180, 153, 255, 0.25)',
          borderColor: '#9B59B6',
          textColor: '#7b3fb0',
          classNames: ['cycle-meta-event'],
          extendedProps: { isCycleMeta: true },
        });
      }

      // 배란일
      if (showOvulation) {
        result.push({
          id: 'cycle-ovulation',
          title: '배란일',
          start: addDaysToStr(base, cl - 14),
          allDay: true,
          backgroundColor: 'rgba(155, 89, 182, 0.2)',
          borderColor: '#9B59B6',
          textColor: '#7b3fb0',
          classNames: ['cycle-meta-event'],
          extendedProps: { isCycleMeta: true },
        });
      }
    }

    return result;
  }, [cycles, coupleDoc]);

  const allEvents = useMemo(
    () => [...specialDayEvents, ...periodEvents, ...events],
    [events, specialDayEvents, periodEvents]
  );

  const getViewWidth = () =>
    sliderViewRef.current?.offsetWidth || window.innerWidth;

  const doNavigate = (dir, duration = 320) => {
    setTransitionDuration(duration);
    setDragX(dir === 'next' ? -getViewWidth() : getViewWidth());
    setTimeout(() => {
      setTransitionDuration(0);
      setCurrentDate(prev =>
        new Date(prev.getFullYear(), prev.getMonth() + (dir === 'next' ? 1 : -1), 1)
      );
      setDragX(0);
      setIsNavigating(false);
    }, duration);
  };

  const navigate = (dir) => {
    if (isNavigating) return;
    setIsNavigating(true);
    doNavigate(dir, 450);
  };

  const goToday = () => {
    const today = new Date();
    const todayFirst = new Date(today.getFullYear(), today.getMonth(), 1);
    if (todayFirst.getTime() !== currentDate.getTime()) {
      const dir = todayFirst > currentDate ? 'next' : 'prev';
      if (!isNavigating) {
        setIsNavigating(true);
        doNavigate(dir, false);
      }
    }
  };

  const handleTouchStart = (e) => {
    if (isNavigating) return;
    touchStartXRef.current = e.touches[0].clientX;
    setTransitionDuration(0);
  };

  const handleTouchMove = (e) => {
    if (touchStartXRef.current === null) return;
    const diff = e.touches[0].clientX - touchStartXRef.current;
    setDragX(diff);
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    const threshold = getViewWidth() * 0.22;
    if (Math.abs(diff) > threshold && !isNavigating) {
      setIsNavigating(true);
      const remaining = getViewWidth() - Math.abs(diff);
      const duration = Math.max(350, Math.round(remaining / getViewWidth() * 500));
      doNavigate(diff < 0 ? 'next' : 'prev', duration);
    } else {
      setTransitionDuration(800);
      setDragX(0);
      setTimeout(() => setTransitionDuration(0), 800);
    }
    touchStartXRef.current = null;
  };

  const handleDateClick = (info) => {
    setSelectedDate(info.dateStr);
    setIsDayModalOpen(true);
  };

  const handleAddEventFromDay = (date) => {
    setSelectedEvent({ start: date, end: date, allDay: true });
    setIsDayModalOpen(false);
    setIsModalOpen(true);
  };

  const handleEditEventFromDay = (event) => {
    try {
      const startDate = event.start.split('T')[0];
      const endDate = event.end ? event.end.split('T')[0] : startDate;
      setSelectedEvent({
        id: event.id, title: event.title,
        start: startDate, end: endDate,
        description: event.extendedProps?.description || '',
        eventType: event.extendedProps?.eventType || 'couple',
        imageUrls: event.extendedProps?.imageUrls || []
      });
      setIsDayModalOpen(false);
      setIsModalOpen(true);
    } catch {
      alert('일정 수정 중 오류가 발생했습니다.');
    }
  };

  const handleSaveEvent = async (eventData) => {
    try {
      if (!eventData.start || !eventData.end || !eventData.title)
        throw new Error('Event data is incomplete!');
      const uid = user?.uid;
      if (eventData.id) await updateEvent(eventData.id, eventData, uid, coupleId);
      else await createEvent(eventData, uid, coupleId);
      setIsModalOpen(false);
    } catch {
      alert('일정 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteEvent(eventId, user?.uid, coupleId);
      setIsModalOpen(false);
    } catch {
      alert('일정 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleAddPeriod = async (startDate, periodLength) => {
    try {
      await createCycle({ startDate, periodLength }, user?.uid, coupleId);
    } catch {
      alert('생리 기록 중 오류가 발생했습니다.');
    }
  };

  const handleDeletePeriod = async (cycleId) => {
    try {
      await deleteCycle(cycleId);
    } catch {
      alert('생리 기록 삭제 중 오류가 발생했습니다.');
    }
  };

  const eventClassNames = (arg) => {
    const ep = arg.event.extendedProps;
    if (ep.isPeriod) return ['period-event'];
    if (ep.isPeriodPredicted) return ['period-predicted-event'];
    if (ep.isCycleMeta) return ['cycle-meta-event'];
    if (ep.isSpecial) return ['special-day-event', ep.specialType];
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

  const getDayEvents = () => {
    if (!selectedDate) return [];
    return events.filter(event => {
      const eventStart = event.start.split('T')[0];
      const eventEnd = event.end ? event.end.split('T')[0] : eventStart;
      return selectedDate >= eventStart && selectedDate <= eventEnd;
    });
  };

  const getDayPeriods = () => {
    if (!selectedDate) return [];
    return cycles.filter(cycle => {
      const pl = cycle.periodLength || coupleDoc?.cycleSettings?.periodLength || 5;
      const endDateStr = addDaysToStr(cycle.startDate, pl - 1);
      return selectedDate >= cycle.startDate && selectedDate <= endDateStr;
    });
  };

  const getDaySpecials = () =>
    selectedDate ? (specialDaysMap.get(selectedDate) || []) : [];

  const isCurrentMonth =
    currentDate.getFullYear() === new Date().getFullYear() &&
    currentDate.getMonth() === new Date().getMonth();

  const sliderStyle = {
    transform: `translateX(calc(-33.3333% + ${dragX}px))`,
    transition: transitionDuration > 0
      ? `transform ${transitionDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`
      : 'none',
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="calendar-header-nav">
          <button className="cal-nav-btn" onClick={() => navigate('prev')}>‹</button>
          <button className="cal-nav-btn" onClick={() => navigate('next')}>›</button>
        </div>
        <span className="calendar-title">{formatMonthTitle(currentDate)}</span>
        <div className="calendar-header-actions">
          <button
            className={`cal-action-btn${isCurrentMonth ? ' active' : ''}`}
            onClick={goToday}
          >
            오늘
          </button>
          <button
            className="cal-action-btn"
            onClick={() => { setSelectedEventForLog(null); setShowEditLog(true); }}
          >
            수정기록
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">캘린더를 불러오는 중...</p>
        </div>
      ) : (
        <div
          className="calendar-slider-view"
          ref={sliderViewRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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
                  dateClick={handleDateClick}
                  eventClassNames={eventClassNames}
                  eventDidMount={eventDidMount}
                  dayMaxEvents={true}
                  moreLinkClick={(info) => {
                    setSelectedDate(info.date.toISOString().split('T')[0]);
                    setIsDayModalOpen(true);
                    return 'stop';
                  }}
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
      )}

      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        event={selectedEvent}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
      <DayModal
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        selectedDate={selectedDate}
        dayEvents={getDayEvents()}
        specialDays={getDaySpecials()}
        onAddEvent={handleAddEventFromDay}
        onEditEvent={handleEditEventFromDay}
        dayPeriods={getDayPeriods()}
        cycleSettings={coupleDoc?.cycleSettings}
        onAddPeriod={handleAddPeriod}
        onDeletePeriod={handleDeletePeriod}
      />
      <EditLogModal
        isOpen={showEditLog}
        onClose={() => setShowEditLog(false)}
        eventId={selectedEventForLog}
      />
    </div>
  );
};

export default Calendar;
