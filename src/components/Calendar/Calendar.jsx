// src/components/Calendar/Calendar.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import EventModal from './EventModal';
import DayModal from './DayModal';
import EditLogModal from '../EditLog/EditLogModal';
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';
import CalendarSkeleton from './CalendarSkeleton';
import {
  createEvent, updateEvent, deleteEvent,
  createPersonalEvent, updatePersonalEvent, deletePersonalEvent,
  convertEventType
} from '../../services/eventService';
import { createCycle, deleteCycle } from '../../services/cycleService';
import { useAuthContext } from '../../contexts/AuthContext';
import { useCalendarData } from '../../hooks/useCalendarData';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import { useCalendarNavigation } from '../../hooks/useCalendarNavigation';
import './Calendar.css';

const addDaysToStr = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const Calendar = () => {
  const navigatePage = useNavigate();
  const { user, coupleId, coupleDoc, userDoc, partnerDoc, myRole } = useAuthContext();

  // Data fetching
  const { events, cycles, isLoading } = useCalendarData(coupleId, user?.uid);

  // 사용자 정의 색상 적용
  const eventsWithCustomColors = useMemo(() => {
    const userColors = userDoc?.eventTypeColors || {};
    const partnerColors = partnerDoc?.eventTypeColors || {};

    return events.map(event => {
      const eventType = event.extendedProps?.eventType;
      let color = event.color;

      if (event.extendedProps?.isPersonal) {
        color = userColors.personal || '#4ECDC4';
      } else if (eventType === 'boyfriend') {
        color = (myRole === 'boyfriend' ? userColors.boyfriend : partnerColors.boyfriend) || '#c7ceea';
      } else if (eventType === 'girlfriend') {
        color = (myRole === 'girlfriend' ? userColors.girlfriend : partnerColors.girlfriend) || '#b5ead7';
      }

      return { ...event, color };
    });
  }, [events, userDoc, partnerDoc, myRole]);

  // State management
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEditLog, setShowEditLog] = useState(false);
  const [selectedEventForLog, setSelectedEventForLog] = useState(null);
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'personal' | 'couple'
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Navigation and touch handling
  const navigation = useCalendarNavigation(currentDate, setCurrentDate);
  const {
    sliderViewRef,
    sliderStyle,
    navigate,
    goToday,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = navigation;

  // Filter events by view mode
  const filteredEvents = useMemo(() => {
    if (viewMode === 'personal') {
      return eventsWithCustomColors.filter(e => e.extendedProps?.eventType === 'personal' || e.extendedProps?.isPersonal);
    }
    if (viewMode === 'couple') {
      return eventsWithCustomColors.filter(e => e.extendedProps?.eventType !== 'personal' && !e.extendedProps?.isPersonal);
    }
    return eventsWithCustomColors; // 'all'
  }, [eventsWithCustomColors, viewMode]);

  // Event data transformation
  const { specialDaysMap, allEvents } = useCalendarEvents(
    currentDate,
    filteredEvents,
    cycles,
    coupleDoc
  );

  // Search params handling
  const [searchParams, setSearchParams] = useSearchParams();
  const pendingDateRef = useRef(null);


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

  // Months for 3-month slider
  const months = useMemo(() => [
    new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
    new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
  ], [currentDate]);

  const handleAddEventFromDay = useCallback((date) => {
    setSelectedEvent({ start: date, end: date, allDay: true });
    setIsDayModalOpen(false);
    setIsModalOpen(true);
  }, []);

  const handleEditEventFromDay = useCallback((event) => {
    try {
      if (event.extendedProps?.isTrip) {
        navigatePage(`/travel/${event.id}`);
        setIsDayModalOpen(false);
        return;
      }

      const getDateString = (dateValue) => {
        if (typeof dateValue === 'string') return dateValue.split('T')[0];
        if (dateValue instanceof Date) return dateValue.toISOString().split('T')[0];
        return '';
      };

      const startDate = getDateString(event.start);
      const endDate = event.end ? getDateString(event.end) : startDate;
      const isPersonalEvent = event.extendedProps?.isPersonal || false;
      setSelectedEvent({
        id: event.id, title: event.title,
        start: startDate, end: endDate,
        description: event.extendedProps?.description || '',
        eventType: isPersonalEvent ? myRole : (event.extendedProps?.eventType || 'couple'),
        isPersonal: isPersonalEvent,
        imageUrls: event.extendedProps?.imageUrls || []
      });
      setIsDayModalOpen(false);
      setIsModalOpen(true);
    } catch {
      toast.error('일정 수정 중 오류가 발생했습니다.');
    }
  }, [myRole, events, navigatePage]);

  const handleSaveEvent = useCallback(async (eventData) => {
    try {
      if (!eventData.start || !eventData.end || !eventData.title)
        throw new Error('Event data is incomplete!');
      const uid = user?.uid;
      const isPersonal = eventData.isPersonal === true;

      if (eventData.id) {
        const wasPersonal = events.find(e => e.id === eventData.id)?.extendedProps?.isPersonal || false;

        if (wasPersonal !== isPersonal) {
          // 개인 ↔ 공유 전환: writeBatch로 원자적 변환 (중간 실패 시 데이터 소실 방지)
          const overrides = {
            title: eventData.title,
            description: eventData.description,
            start: eventData.start,
            end: eventData.end,
          };
          await convertEventType(eventData.id, wasPersonal, eventData.eventType, uid, coupleId, overrides);
        } else if (isPersonal) {
          await updatePersonalEvent(eventData.id, eventData, uid, coupleId);
        } else {
          await updateEvent(eventData.id, eventData, uid, coupleId);
        }
      } else {
        if (isPersonal) {
          await createPersonalEvent(eventData, uid, coupleId);
        } else {
          await createEvent(eventData, uid, coupleId);
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error('일정 저장 중 오류가 발생했습니다.');
    }
  }, [events, user?.uid, coupleId]);

  const handleDeleteEvent = useCallback(async (eventId) => {
    try {
      // filteredEvents 대신 events 사용: 탭 필터에 관계없이 원본 속성으로 판별
      const event = events.find(e => e.id === eventId);
      if (event?.extendedProps?.isPersonal) {
        await deletePersonalEvent(eventId);
      } else {
        await deleteEvent(eventId, user?.uid, coupleId);
      }
      setIsModalOpen(false);
    } catch {
      toast.error('일정 삭제 중 오류가 발생했습니다.');
    }
  }, [events, user?.uid, coupleId]);

  const handleAddPeriod = useCallback(async (startDate, periodLength) => {
    try {
      await createCycle({ startDate, periodLength }, user?.uid, coupleId);
    } catch {
      toast.error('생리 기록 중 오류가 발생했습니다.');
    }
  }, [user?.uid, coupleId]);

  const handleDeletePeriod = useCallback(async (cycleId) => {
    try {
      await deleteCycle(cycleId);
    } catch {
      toast.error('생리 기록 삭제 중 오류가 발생했습니다.');
    }
  }, []);


  const getDayEvents = () => {
    if (!selectedDate) return [];
    const getDateString = (dateValue) => {
      if (typeof dateValue === 'string') return dateValue.split('T')[0];
      if (dateValue instanceof Date) return dateValue.toISOString().split('T')[0];
      return '';
    };
    return events.filter(event => {
      const eventStart = getDateString(event.start);
      const eventEnd = event.end ? getDateString(event.end) : eventStart;
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

  const handleDateClick = useCallback((info) => {
    setSelectedDate(info.dateStr);
    setIsDayModalOpen(true);
  }, []);

  const handleMoreLinkClick = useCallback((info) => {
    setSelectedDate(info.date.toISOString().split('T')[0]);
    setIsDayModalOpen(true);
    return 'stop';
  }, []);

  return (
    <div className="calendar-container">
      <CalendarHeader
        currentDate={currentDate}
        isCurrentMonth={isCurrentMonth}
        onPrevMonth={() => navigate('prev')}
        onNextMonth={() => navigate('next')}
        onGoToday={goToday}
        onShowEditLog={() => { setSelectedEventForLog(null); setShowEditLog(true); }}
      />

      {/* 캘린더 탭 필터 */}
      <div className="calendar-tabs">
        <button
          className={`calendar-tab ${viewMode === 'all' ? 'active' : ''}`}
          onClick={() => setViewMode('all')}
        >
          전체
        </button>
        <button
          className={`calendar-tab ${viewMode === 'personal' ? 'active' : ''}`}
          onClick={() => setViewMode('personal')}
        >
          개인
        </button>
        <button
          className={`calendar-tab ${viewMode === 'couple' ? 'active' : ''}`}
          onClick={() => setViewMode('couple')}
        >
          커플
        </button>
      </div>

      {isLoading ? (
        <CalendarSkeleton />
      ) : (
        <CalendarGrid
          months={months}
          allEvents={allEvents}
          specialDaysMap={specialDaysMap}
          sliderStyle={sliderStyle}
          sliderViewRef={sliderViewRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDateClick={handleDateClick}
          onMoreLinkClick={handleMoreLinkClick}
        />
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
