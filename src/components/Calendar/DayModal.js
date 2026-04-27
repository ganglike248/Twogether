import React, { useState } from 'react';
import { format, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import './DayModal.css';
import { useAuthContext } from '../../contexts/AuthContext';

const DayModal = ({
  isOpen, onClose, selectedDate, dayEvents, specialDays = [],
  onAddEvent, onEditEvent,
  dayPeriods = [], cycleSettings, onAddPeriod, onDeletePeriod,
}) => {
  const { getMemberName } = useAuthContext();
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [periodFormLength, setPeriodFormLength] = useState('');
  const [periodSubmitting, setPeriodSubmitting] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeletePeriodModal, setShowDeletePeriodModal] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState(null);

  if (!isOpen || !selectedDate) return null;

  const cycleEnabled = cycleSettings?.enabled;
  const defaultPeriodLength = cycleSettings?.periodLength || 5;

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'M월 d일 EEEE', { locale: ko });
    } catch {
      return dateString;
    }
  };

  const formatDateRange = (startDate, endDate) => {
    try {
      if (!endDate || startDate === endDate) {
        return format(new Date(startDate), 'M월 d일', { locale: ko });
      }
      const start = new Date(startDate);
      let end = subDays(new Date(endDate), 1);
      if (start.getTime() === end.getTime()) {
        return format(start, 'M월 d일', { locale: ko });
      }
      return `${format(start, 'M월 d일', { locale: ko })} ~ ${format(end, 'M월 d일', { locale: ko })}`;
    } catch {
      return `${startDate} ~ ${endDate}`;
    }
  };

  const getEventTypeIcon = (eventType, isTrip) => {
    if (isTrip) return '✈️';
    switch (eventType) {
      case 'boyfriend': return '🐶';
      case 'girlfriend': return '🐹';
      case 'couple': return '🥰';
      default: return '📅';
    }
  };

  const getEventTypeName = (eventType, isTrip) => {
    if (isTrip) return '여행';
    if (eventType === 'couple') return '데이트';
    if (eventType === 'boyfriend' || eventType === 'girlfriend') return getMemberName(eventType);
    return '일정';
  };

  const sortedEvents = [...dayEvents].sort((a, b) =>
    new Date(a.start) - new Date(b.start)
  );

  const handleOpenPeriodForm = () => {
    setPeriodFormLength(String(defaultPeriodLength));
    setShowPeriodForm(true);
  };

  const handlePeriodFormCancel = () => {
    setShowPeriodForm(false);
    setPeriodFormLength('');
  };

  const handlePeriodSubmit = async () => {
    const length = Number(periodFormLength) || defaultPeriodLength;
    setPeriodSubmitting(true);
    try {
      await onAddPeriod(selectedDate, length);
      setShowPeriodForm(false);
      setPeriodFormLength('');
    } finally {
      setPeriodSubmitting(false);
    }
  };

  const handleDeletePeriod = (cycleId) => {
    setPeriodToDelete(cycleId);
    setShowDeletePeriodModal(true);
  };

  const confirmDeletePeriod = async () => {
    if (!periodToDelete) return;
    await onDeletePeriod(periodToDelete);
    setShowDeletePeriodModal(false);
    setPeriodToDelete(null);
  };

  return (
    <div className="day-modal-overlay" onClick={onClose}>
      <div className="day-modal-container" onClick={e => e.stopPropagation()}>
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

          {/* 생리 기록 카드 */}
          {cycleEnabled && dayPeriods.length > 0 && (
            <div className="period-records-list">
              {dayPeriods.map(period => (
                <div key={period.id} className="period-record-card">
                  <span className="period-record-icon">{cycleSettings.icon || '🌸'}</span>
                  <div className="period-record-info">
                    <span className="period-record-detail">
                      {period.startDate} · {period.periodLength || defaultPeriodLength}일
                    </span>
                  </div>
                  <button
                    className="period-delete-btn"
                    onClick={() => handleDeletePeriod(period.id)}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 일반 일정 */}
          {dayEvents.length === 0 && !(cycleEnabled && dayPeriods.length > 0) ? (
            <div className="day-modal-empty">
              <div className="empty-icon">📅</div>
              <p className="empty-text">이 날에는 일정이 없습니다</p>
            </div>
          ) : (
            <div className="day-events-list">
              {sortedEvents
                .filter(event => {
                  const eventStart = event.start.split('T')[0];
                  let eventEnd = event.end ? event.end.split('T')[0] : eventStart;
                  if (eventEnd !== eventStart) {
                    eventEnd = format(subDays(new Date(eventEnd), 1), 'yyyy-MM-dd');
                  }
                  return selectedDate >= eventStart && selectedDate <= eventEnd;
                })
                .map(event => {
                  const eventStart = event.start.split('T')[0];
                  const eventEnd = event.end ? event.end.split('T')[0] : eventStart;
                  const isTrip = event.extendedProps?.isTrip;
                  const eventTypeClass = isTrip ? 'trip' : event.extendedProps.eventType;
                  return (
                    <div
                      key={event.id}
                      className={`day-event-item ${eventTypeClass}`}
                      onClick={() => onEditEvent(event)}
                    >
                      <div className="event-icon">
                        {getEventTypeIcon(event.extendedProps.eventType, isTrip)}
                      </div>
                      <div className="event-details">
                        <div className="event-title">{event.title}</div>
                        <div className="event-meta">
                          <span className={`event-type ${eventTypeClass}`}>
                            {getEventTypeName(event.extendedProps.eventType, isTrip)}
                          </span>
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
          {/* 생리 기록 폼 */}
          {cycleEnabled && dayPeriods.length === 0 && showPeriodForm && (
            <div className="period-inline-form">
              <div className="period-form-header">
                {cycleSettings?.icon || '🌸'} 생리 시작 기록
              </div>
              <div className="period-form-row">
                <span className="period-form-label">기간</span>
                <div className="period-form-input-wrap">
                  <input
                    type="number"
                    className="period-form-input"
                    value={periodFormLength}
                    onChange={e => setPeriodFormLength(e.target.value)}
                    min={1}
                    max={14}
                    autoFocus
                  />
                  <span className="period-form-unit">일</span>
                </div>
              </div>
              <div className="period-form-actions">
                <button
                  className="period-form-cancel"
                  onClick={handlePeriodFormCancel}
                  disabled={periodSubmitting}
                >
                  취소
                </button>
                <button
                  className="period-form-submit"
                  onClick={handlePeriodSubmit}
                  disabled={periodSubmitting}
                >
                  {periodSubmitting ? '기록 중...' : '기록'}
                </button>
              </div>
            </div>
          )}

          {/* 일정 추가 + 더보기 메뉴 */}
          <div className="day-modal-footer-buttons">
            <button
              className="add-event-btn"
              onClick={() => onAddEvent(selectedDate)}
            >
              <span className="add-icon">+</span>
              {formatDate(selectedDate)}에 일정 추가
            </button>

            {cycleEnabled && (
              <div className="more-menu-wrapper">
                <button
                  className="more-menu-btn"
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                >
                  ⋯
                </button>
                {showMoreMenu && (
                  <div className="more-menu-popup">
                    <button
                      className="more-menu-item"
                      onClick={() => {
                        if (dayPeriods.length === 0) {
                          handleOpenPeriodForm();
                          setShowMoreMenu(false);
                        }
                      }}
                      disabled={dayPeriods.length > 0}
                    >
                      <span className="menu-item-icon">{cycleSettings?.icon || '🌸'}</span>
                      생리 시작 기록
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 생리 기록 삭제 확인 모달 */}
      {showDeletePeriodModal && (
        <div className="day-modal-overlay" onClick={() => { setShowDeletePeriodModal(false); setPeriodToDelete(null); }}>
          <div className="day-modal-container" style={{ maxWidth: '300px' }} onClick={e => e.stopPropagation()}>
            <p className="day-modal-title" style={{ marginBottom: '8px' }}>생리 기록 삭제</p>
            <p style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>이 생리 기록을 삭제하시겠습니까?</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="period-form-cancel"
                onClick={() => { setShowDeletePeriodModal(false); setPeriodToDelete(null); }}
              >
                취소
              </button>
              <button
                className="period-form-submit"
                onClick={confirmDeletePeriod}
                style={{ backgroundColor: '#ef4444', color: 'white' }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayModal;
