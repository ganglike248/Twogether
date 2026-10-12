// src/components/Calendar/Calendar.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation, matchPath } from 'react-router-dom';
import { toast } from 'react-toastify';
import EventModal from './EventModal';
import DayModal from './DayModal';
import EditLogModal from '../EditLog/EditLogModal';
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';
import CalendarSkeleton from './CalendarSkeleton';
import FloatingActionMenu from '../Travel/FloatingActionMenu';
import {
  createEvent, updateEvent, deleteEvent,
  createPersonalEvent, updatePersonalEvent, deletePersonalEvent,
  convertEventType
} from '../../services/eventService';
import {
  createRecurringEvent, updateRecurringEvent, deleteRecurringEvent
} from '../../services/recurrenceService';
import { getLocalDateStr, getEventDayRange } from '../../utils/dataUtils';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import { useAuthContext } from '../../contexts/AuthContext';
import { useCalendarData } from '../../hooks/useCalendarData';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import { useCalendarNavigation } from '../../hooks/useCalendarNavigation';
import './Calendar.css';

// Firestore 쓰기 promise는 서버 응답(ack)이 와야 resolve되는데, 연결이 멈추면(약한 신호, iOS 백그라운드
// 복귀 직후 등) 타임아웃 없이 계속 pending — 그동안 저장 버튼이 무한로딩에 걸렸음(2026-10-12 확인).
// 변경 자체는 즉시 로컬 캐시에 반영되고 연결 회복 시 자동 전송되므로, 이 시간까지만 기다리고 모달을 닫음.
const SAVE_ACK_TIMEOUT_MS = 3000;

// promise를 최대 ms까지만 기다림 — 시간 초과 시 reject하지 않고 { timedOut: true }만 반환(작업은 계속 진행).
const waitAtMost = (promise, ms) => {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: true }), ms);
  });
  return Promise.race([promise.then(() => ({ timedOut: false })), timeout])
    .finally(() => clearTimeout(timer));
};

const Calendar = () => {
  const navigatePage = useNavigate();
  const { user, coupleId, userDoc, partnerDoc, myRole } = useAuthContext();

  // Data fetching
  const { events, isLoading } = useCalendarData(coupleId, user?.uid);

  // 사용자 정의 색상 적용
  const eventsWithCustomColors = useMemo(() => {
    const userColors = userDoc?.eventTypeColors || {};
    const partnerColors = partnerDoc?.eventTypeColors || {};

    return events.map(event => {
      const eventType = event.extendedProps?.eventType;
      let color = event.color;

      if (event.extendedProps?.isPersonal) {
        color = userColors.personal;
      } else if (eventType === 'boyfriend') {
        color = myRole === 'boyfriend' ? userColors.boyfriend : partnerColors.boyfriend;
      } else if (eventType === 'girlfriend') {
        color = myRole === 'girlfriend' ? userColors.girlfriend : partnerColors.girlfriend;
      }

      return { ...event, color };
    });
  }, [events, userDoc, partnerDoc, myRole]);

  // State management
  const location = useLocation();
  // 모달 열림 상태는 더 이상 useState가 아니라 URL(location.pathname)에서 파생됨 — 손수 만든
  // pushState/popstate 훅(useModalBackButton)을 걷어내고 React Router가 히스토리를 전담하게
  // 하기 위함(모달 닫은 뒤 번쩍거림, 가로 스크롤 시 엉뚱한 화면 노출 버그의 근본 원인이었음).
  const dayMatch = matchPath('/calendar/day/:date', location.pathname);
  const eventNewMatch = matchPath('/calendar/event/new/:date', location.pathname);
  const eventEditMatch = matchPath('/calendar/event/:eventId', location.pathname);
  const logMatch = matchPath('/calendar/log', location.pathname);

  const isDayModalOpen = !!dayMatch;
  const selectedDate = dayMatch?.params?.date ?? null;
  // 수정 대상 이벤트는 events가 아직 로딩 중이면 열지 않음 — 데이터 도착 전 "빈 새 일정
  // 작성" 폼이 스치듯 보이는 걸 방지 (기존 ?date= 딥링크가 !isLoading을 기다리던 것과 동일한 이유).
  const isModalOpen = !!(eventNewMatch || (eventEditMatch && !isLoading));
  const showEditLog = !!logMatch;

  // 모달 열기/닫기 내비게이션 재진입 잠금 + 마지막으로 해석된 수정 대상 이벤트 캐시
  const navLockRef = useRef(false);
  const navLockTimerRef = useRef(null);
  const lastResolvedEventRef = useRef(null);

  // 라우트에서 파생한 "수정 대상 이벤트". events가 이 id를 잠깐 놓치는 순간에도
  // (백그라운드 복귀 시 onSnapshot 캐시 재emit, 파트너의 동시 수정/삭제 등) 직전에
  // 해석해둔 같은 id의 객체를 그대로 재사용해, 열려 있는 '수정' 폼이 빈 '새 일정' 폼으로
  // 리셋되며 번쩍이는 것을 막는다. 내용이 실제로 안 바뀌었으면 레퍼런스도 유지해
  // EventModal의 폼 재초기화(useEffect [event]) 자체를 줄인다.
  const eventNewDate = eventNewMatch?.params?.date ?? null;
  const eventEditId = eventEditMatch?.params?.eventId ?? null;
  const selectedEvent = useMemo(() => {
    try {
      if (eventNewDate) {
        return { start: eventNewDate, end: eventNewDate, allDay: true };
      }
      if (eventEditId) {
        const ev = events.find(e => e.id === eventEditId);
        if (!ev) {
          const cached = lastResolvedEventRef.current;
          return cached && cached.id === eventEditId ? cached : null;
        }
        const getDateString = (dateValue) => {
          if (typeof dateValue === 'string') return dateValue.split('T')[0];
          if (dateValue instanceof Date) return dateValue.toISOString().split('T')[0];
          return '';
        };
        const startDate = getDateString(ev.start);
        const endDate = ev.end ? getDateString(ev.end) : startDate;
        const isPersonalEvent = ev.extendedProps?.isPersonal || false;
        const resolved = {
          id: ev.id, title: ev.title,
          start: startDate, end: endDate,
          description: ev.extendedProps?.description || '',
          eventType: isPersonalEvent ? myRole : (ev.extendedProps?.eventType || 'couple'),
          isPersonal: isPersonalEvent,
          imageUrls: ev.extendedProps?.imageUrls || [],
          recurrence: ev.extendedProps?.recurrence || null
        };
        const prev = lastResolvedEventRef.current;
        if (
          prev &&
          prev.id === resolved.id &&
          prev.title === resolved.title &&
          prev.start === resolved.start &&
          prev.end === resolved.end &&
          prev.description === resolved.description &&
          prev.eventType === resolved.eventType &&
          prev.isPersonal === resolved.isPersonal &&
          (prev.imageUrls?.length || 0) === (resolved.imageUrls?.length || 0) &&
          JSON.stringify(prev.recurrence ?? null) === JSON.stringify(resolved.recurrence ?? null)
        ) {
          return prev;
        }
        lastResolvedEventRef.current = resolved;
        return resolved;
      }
      return null;
    } catch {
      return null;
    }
  }, [eventNewDate, eventEditId, events, myRole]);

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
  const { specialDaysMap, allEvents } = useCalendarEvents(currentDate, filteredEvents);

  // Search params handling
  const [searchParams, setSearchParams] = useSearchParams();
  const pendingDateRef = useRef(null);
  // EventModal(일정 추가/수정)의 'X'를 닫을 때, 실기기에서 손가락이 살짝 밀리거나
  // 습관성으로 한 번 더 탭하면 모달 오버레이가 걷히며 드러나는 CalendarHeader의
  // '수정기록' 버튼까지 같이 눌리는 문제가 있었음 — EventModal이 닫힌 직후 짧은 시간
  // (0.5초) 안의 수정기록 클릭은 그 여파로 보고 무시해서 방지 (2026-08-10).
  const eventModalClosedAtRef = useRef(0);

  // iOS WebKit에서 navigate(-1)(history.go)은 비동기라, 이전 전환이 끝나기 전에 새 push/pop이
  // 겹치면 히스토리 스택이 꼬여 모달이 안 닫히거나(캘린더 터치 먹통) 번쩍인다. 한 번에 하나의
  // 모달 전환만 허용하고, location이 실제로 바뀌면(전환 완료) 잠금을 푼다.
  const lockNav = useCallback(() => {
    navLockRef.current = true;
    if (navLockTimerRef.current) clearTimeout(navLockTimerRef.current);
    // 되돌아갈 히스토리가 없어 popstate가 끝내 안 오는 예외 상황에서도 잠금이 영구히
    // 남지 않도록 하는 안전장치.
    navLockTimerRef.current = setTimeout(() => { navLockRef.current = false; }, 700);
  }, []);

  useEffect(() => {
    navLockRef.current = false;
    if (navLockTimerRef.current) {
      clearTimeout(navLockTimerRef.current);
      navLockTimerRef.current = null;
    }
  }, [location.key, location.pathname]);

  // 모달 닫기 = 그 모달을 열며 쌓인 히스토리 엔트리로 "뒤로가기". 단, 뒤로 갈 앱 내 엔트리가
  // 없으면(history.state.idx === 0 — 모달 경로로 바로 딥링크/새로고침 진입했거나, replace 이동만
  // 거쳐 모달 엔트리가 히스토리의 맨 처음이 된 경우) navigate(-1)이 아무 일도 안 하거나 앱 밖으로
  // 나가버려서 모달이 닫히지 않음(X/배경/취소 전부 무반응으로 갇히던 버그, 2026-10-12 재현/수정)
  // — 이 경우 캘린더 기본 화면으로 replace. location.key === 'default'는 idx가 없는 예외 대비.
  const closeModal = useCallback(() => {
    if (navLockRef.current) return;
    lockNav();
    const historyIdx = window.history.state?.idx;
    if (location.key === 'default' || !historyIdx) {
      navigatePage('/calendar', { replace: true });
    } else {
      navigatePage(-1);
    }
  }, [navigatePage, location.key, lockNav]);

  // EventModal 전용 닫기 — 'X'/취소/오버레이 클릭으로 닫을 때만 오클릭 방지 타임스탬프를
  // 남김(저장/삭제 성공으로 닫힐 때는 기존처럼 타임스탬프를 남기지 않음).
  const handleCloseEventModal = useCallback(() => {
    eventModalClosedAtRef.current = Date.now();
    closeModal();
  }, [closeModal]);

  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      pendingDateRef.current = dateParam.split('T')[0];
      setSearchParams({}, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ?date= 딥링크(홈 카드, 추억 상세 등에서 진입) — 위에서 쿼리를 걷어낸 /calendar 엔트리 위에
  // DayModal을 push로 쌓음. replace로 바꿔치면 모달을 닫을 때(X/뒤로가기) 캘린더가 아니라 진입 전
  // 화면(홈 등)으로 돌아가 버림 — 모달만 닫히고 캘린더에 남도록 /calendar 엔트리를 살려둠.
  useEffect(() => {
    if (!isLoading && pendingDateRef.current) {
      const dateStr = pendingDateRef.current;
      pendingDateRef.current = null;
      navigatePage(`/calendar/day/${dateStr}`, { state: { modal: true } });
    }
  }, [isLoading, navigatePage]);

  // 캘린더 슬라이더가 보여주는 월을 DayModal 라우트의 날짜에 맞춤 — 위 딥링크 리다이렉트뿐
  // 아니라 /calendar/day/:date를 북마크·새로고침으로 직접 열었을 때도 동작하게 함.
  useEffect(() => {
    if (!dayMatch?.params?.date) return;
    const [y, m] = dayMatch.params.date.split('-').map(Number);
    setCurrentDate(prev =>
      (prev.getFullYear() === y && prev.getMonth() === m - 1) ? prev : new Date(y, m - 1, 1)
    );
  }, [dayMatch?.params?.date]);

  // Months for 3-month slider
  const months = useMemo(() => [
    new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
    new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
  ], [currentDate]);

  // DayModal 안 "+ 일정 추가"에서 옴 — DayModal의 히스토리 엔트리를 대체(replace)해서,
  // 닫을 때 DayModal로 안 돌아가고 바로 캘린더로 나가는 기존 동작을 그대로 유지.
  const handleAddEventFromDay = useCallback((date) => {
    if (navLockRef.current) return;
    lockNav();
    navigatePage(`/calendar/event/new/${date}`, { replace: true, state: { modal: true } });
  }, [navigatePage, lockNav]);

  // FAB 콜백: 새 일정 추가 — 빈 캘린더에서 여는 것이라 새 히스토리 엔트리를 쌓음(push).
  const handleFABAddEvent = useCallback(() => {
    if (navLockRef.current) return;
    lockNav();
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const date = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${date}`;
    navigatePage(`/calendar/event/new/${dateStr}`, { state: { modal: true } });
  }, [navigatePage, lockNav]);

  const handleEditEventFromDay = useCallback((event) => {
    if (navLockRef.current) return;
    lockNav();
    if (event.extendedProps?.isTrip) {
      navigatePage(`/travel/${event.id}`);
      return;
    }
    // DayModal 안에서 일정을 눌러 여는 것이라 위 handleAddEventFromDay와 동일하게 replace.
    navigatePage(`/calendar/event/${event.id}`, { replace: true, state: { modal: true } });
  }, [navigatePage, lockNav]);

  const handleSaveEvent = useCallback(async (eventData) => {
    if (!eventData.start || !eventData.end || !eventData.title) {
      toast.error('일정 저장 중 오류가 발생했습니다.\n일정 정보가 올바르지 않습니다.');
      return;
    }
    const uid = user?.uid;
    const isPersonal = eventData.isPersonal === true;

    const saveTask = (async () => {
      if (eventData.recurrenceScope) {
        // 반복 일정의 기존 인스턴스 수정 — "이 일정만/이후 모두/전체" 중 EventModal에서 고른 범위대로 적용
        await updateRecurringEvent({
          eventId: eventData.id,
          seriesId: eventData.seriesId,
          scope: eventData.recurrenceScope,
          rule: eventData.recurrenceRule,
          template: eventData.recurrenceTemplate,
          isPersonal,
          userId: uid,
          coupleId,
          instanceDateStr: eventData.instanceDateStr,
        });
      } else if (!eventData.id && eventData.recurrenceRule) {
        // 새 반복 일정 생성 (인스턴스들을 한 번에 배치 생성)
        await createRecurringEvent({
          rule: eventData.recurrenceRule,
          template: eventData.recurrenceTemplate,
          userId: uid,
          coupleId,
          isPersonal,
        });
      } else if (eventData.id) {
        const wasPersonal = events.find(e => e.id === eventData.id)?.extendedProps?.isPersonal || false;

        if (wasPersonal !== isPersonal) {
          // 개인 ↔ 공유 전환: writeBatch로 원자적 변환 (중간 실패 시 데이터 소실 방지)
          const overrides = {
            title: eventData.title,
            description: eventData.description,
            start: eventData.start,
            end: eventData.end,
            // 빠뜨리면 전환된 새 문서에 isDday가 안 들어가 디데이 표시가 사라짐(2026-10-12 발견/수정)
            isDday: eventData.isDday === true,
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
    })();

    const saveErrorMessage = (error) =>
      `일정 저장 중 오류가 발생했습니다.\n${getFriendlyErrorMessage(error)}`;

    try {
      const { timedOut } = await waitAtMost(saveTask, SAVE_ACK_TIMEOUT_MS);
      if (timedOut) {
        // 변경은 이미 로컬 캐시(보낼 목록)에 들어가 있고 연결이 돌아오면 Firestore가 자동 전송함 —
        // 버튼을 무한로딩에 묶어두지 않고 모달을 닫음. 뒤늦게 서버가 거부하면 그때 에러 토스트.
        saveTask.catch((error) => toast.error(saveErrorMessage(error)));
        closeModal();
        toast.info('연결이 불안정해 저장이 지연되고 있어요.\n연결되면 자동으로 반영돼요.');
        return;
      }
      closeModal();
      toast.success(eventData.id ? '일정이 수정되었습니다.' : '일정이 추가되었습니다.');
    } catch (error) {
      toast.error(saveErrorMessage(error));
    }
  }, [events, user?.uid, coupleId, closeModal]);

  const handleDeleteEvent = useCallback(async (eventId, scope, seriesId) => {
    try {
      // filteredEvents 대신 events 사용: 탭 필터에 관계없이 원본 속성으로 판별
      const event = events.find(e => e.id === eventId);
      const isPersonal = event?.extendedProps?.isPersonal || false;

      if (scope) {
        // 반복 일정 삭제 — "이 일정만/이후 모두/전체" 범위대로 적용
        const instanceDateStr = typeof event?.start === 'string' ? event.start.split('T')[0] : '';
        await deleteRecurringEvent({
          eventId,
          seriesId,
          scope,
          isPersonal,
          instanceDateStr,
          userId: user?.uid,
          coupleId,
        });
      } else if (isPersonal) {
        await deletePersonalEvent(eventId);
      } else {
        await deleteEvent(eventId, user?.uid, coupleId);
      }
      closeModal();
      toast.success('일정을 삭제했습니다.');
    } catch (error) {
      toast.error(`일정 삭제 중 오류가 발생했습니다.\n${getFriendlyErrorMessage(error)}`);
    }
  }, [events, user?.uid, coupleId, closeModal]);


  const getDayEvents = () => {
    if (!selectedDate) return [];
    // end는 여러 날짜 일정이면 배타적(다음날 00:00) — getEventDayRange가 포함 범위로 바꿔줌
    return events.filter(event => {
      const { startStr, endStr } = getEventDayRange(event);
      return selectedDate >= startStr && selectedDate <= endStr;
    });
  };

  const getDaySpecials = () =>
    selectedDate ? (specialDaysMap.get(selectedDate) || []) : [];

  const isCurrentMonth =
    currentDate.getFullYear() === new Date().getFullYear() &&
    currentDate.getMonth() === new Date().getMonth();

  const handleDateClick = useCallback((info) => {
    if (navLockRef.current) return;
    lockNav();
    const dateStr = info.dateStr;
    // FullCalendar 인터랙션(터치) 제스처가 완전히 끝난 뒤 다음 프레임에 오버레이를 마운트.
    // 같은 프레임에 마운트하면 iOS에서 touchend 뒤 합성되는 ghost click이 갓 열린 모달
    // 오버레이로 넘어가 모달이 즉시 닫히며 번쩍인다.
    requestAnimationFrame(() => {
      navigatePage(`/calendar/day/${dateStr}`, { state: { modal: true } });
    });
  }, [navigatePage, lockNav]);

  const handleMoreLinkClick = useCallback((info) => {
    // info.date는 FullCalendar가 만든 로컬 자정 Date — toISOString()으로 바로 변환하면
    // UTC로 밀려서 KST(UTC+9)에서 하루 전 날짜가 됨 (handleDateClick의 info.dateStr과 달리
    // 이 콜백은 미리 포맷된 문자열을 안 줌). getLocalDateStr()로 로컬 기준 포맷 (2026-08-25 발견/수정)
    if (!navLockRef.current) {
      lockNav();
      const dateStr = getLocalDateStr(info.date);
      // handleDateClick과 동일: 제스처가 끝난 뒤 다음 프레임에 오버레이 마운트 (ghost click 방지)
      requestAnimationFrame(() => {
        navigatePage(`/calendar/day/${dateStr}`, { state: { modal: true } });
      });
    }
    return 'stop';
  }, [navigatePage, lockNav]);

  return (
    <div className="calendar-container">
      <CalendarHeader
        currentDate={currentDate}
        isCurrentMonth={isCurrentMonth}
        onPrevMonth={() => navigate('prev')}
        onNextMonth={() => navigate('next')}
        onGoToday={goToday}
        onShowEditLog={() => {
          if (Date.now() - eventModalClosedAtRef.current < 500) return;
          if (navLockRef.current) return;
          lockNav();
          navigatePage('/calendar/log', { state: { modal: true } });
        }}
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
        onClose={handleCloseEventModal}
        event={selectedEvent}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
      <DayModal
        isOpen={isDayModalOpen}
        onClose={closeModal}
        selectedDate={selectedDate}
        dayEvents={getDayEvents()}
        specialDays={getDaySpecials()}
        onAddEvent={handleAddEventFromDay}
        onEditEvent={handleEditEventFromDay}
      />
      <EditLogModal
        isOpen={showEditLog}
        onClose={closeModal}
        eventId={null}
      />

      {/* FloatingActionMenu - 일정 추가 */}
      <FloatingActionMenu
        actions={[
          { label: '일정 추가', onClick: handleFABAddEvent }
        ]}
      />
    </div>
  );
};

export default Calendar;
