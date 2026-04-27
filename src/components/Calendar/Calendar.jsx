// src/components/Calendar/Calendar.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import EventModal from './EventModal';
import DayModal from './DayModal';
import EditLogModal from '../EditLog/EditLogModal';
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';
import { createEvent, updateEvent, deleteEvent } from '../../services/eventService';
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
  const { user, coupleId, coupleDoc } = useAuthContext();

  // Data fetching
  const { events, cycles, isLoading } = useCalendarData(coupleId);

  // State management
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEditLog, setShowEditLog] = useState(false);
  const [selectedEventForLog, setSelectedEventForLog] = useState(null);
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

  // Event data transformation
  const { specialDaysMap, allEvents } = useCalendarEvents(
    currentDate,
    events,
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
      toast.error('일정 수정 중 오류가 발생했습니다.');
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
      toast.error('일정 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteEvent(eventId, user?.uid, coupleId);
      setIsModalOpen(false);
    } catch {
      toast.error('일정 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleAddPeriod = async (startDate, periodLength) => {
    try {
      await createCycle({ startDate, periodLength }, user?.uid, coupleId);
    } catch {
      toast.error('생리 기록 중 오류가 발생했습니다.');
    }
  };

  const handleDeletePeriod = async (cycleId) => {
    try {
      await deleteCycle(cycleId);
    } catch {
      toast.error('생리 기록 삭제 중 오류가 발생했습니다.');
    }
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

  const handleDateClick = (info) => {
    setSelectedDate(info.dateStr);
    setIsDayModalOpen(true);
  };

  const handleMoreLinkClick = (info) => {
    setSelectedDate(info.date.toISOString().split('T')[0]);
    setIsDayModalOpen(true);
    return 'stop';
  };

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

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">캘린더를 불러오는 중...</p>
        </div>
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
