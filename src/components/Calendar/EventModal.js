import React, { useState, useEffect } from 'react';
import { addDays, subDays } from 'date-fns';
import { toast } from 'react-toastify';
import './EventModal.css';
import { useAuthContext } from '../../contexts/AuthContext';
import useDoubleClickPrevention from '../../hooks/useDoubleClickPrevention';
import useAnalytics from '../../hooks/useAnalytics';

const EventModal = ({ isOpen, onClose, event, onSave, onDelete }) => {
  const { getMemberName, myRole } = useAuthContext();
  const { logEvent } = useAnalytics();
  const canClick = useDoubleClickPrevention(500);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [eventType, setEventType] = useState('couple');
  const [isPersonal, setIsPersonal] = useState(false);
  const [isDday, setIsDday] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const extractDate = (dateValue) => {
    if (!dateValue) return '';
    if (typeof dateValue === 'string') return dateValue.split('T')[0];
    if (dateValue instanceof Date) return dateValue.toISOString().split('T')[0];
    return '';
  };

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      setStartDate(extractDate(event.start));

      const startStr = extractDate(event.start);
      const endStr = extractDate(event.end);

      if (startStr && endStr) {
        const start = new Date(startStr);
        const end = new Date(endStr);
        setEndDate(end > start ? extractDate(subDays(end, 1)) : startStr);
      } else {
        setEndDate(startStr);
      }

      setEventType(event.eventType || 'couple');
      setIsPersonal(event.isPersonal || event.extendedProps?.isPersonal || false);
      setIsDday(event.isDday || event.extendedProps?.isDday || false);
    } else {
      // 새 일정 생성 시 폼 초기화 + localStorage에서 마지막 개인 일정 여부 복원
      setTitle('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setEventType('couple');
      const lastPersonalState = localStorage.getItem('twogether_personal_default') === 'true';
      setIsPersonal(lastPersonalState);
      setIsDday(false);
    }
  }, [event]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canClick()) {
      return;
    }

    if (!title.trim()) {
      toast.error('일정 제목을 입력해주세요.');
      return;
    }

    if (!startDate) {
      toast.error('시작일을 입력해주세요.');
      return;
    }

    const finalEndDate = endDate || startDate;
    if (new Date(startDate) > new Date(finalEndDate)) {
      toast.error('종료일은 시작일보다 늦거나 같아야 합니다.');
      return;
    }

    setLoading(true);

    try {
      const finalEndDate = endDate || startDate;
      const isMultiDay = startDate !== finalEndDate;

      const adjustedStartDate = `${startDate}T00:00:00`;
      const adjustedEndDate = isMultiDay
        ? addDays(new Date(finalEndDate), 1).toISOString().split('T')[0] + 'T00:00:00'
        : `${finalEndDate}T23:59:59`;

      const eventData = {
        id: event?.id,
        title,
        description,
        start: adjustedStartDate,
        end: adjustedEndDate,
        eventType,
        isPersonal: isPersonal && eventType === myRole, // 내 타입일 때만 개인 일정 가능
        isDday,
      };

      // localStorage에 마지막 선택 상태 저장
      if (eventType === myRole) {
        localStorage.setItem('twogether_personal_default', isPersonal ? 'true' : 'false');
      }

      await onSave(eventData);

      logEvent('event_created', {
        eventType,
        isMultiDay,
        hasDescription: !!description,
      });
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error(`일정 저장 중 오류가 발생했습니다.\n${error?.message || String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await onDelete(event.id);
    } catch (err) {
      toast.error(`삭제 중 오류가 발생했습니다.\n${err?.message || String(err)}`);
    } finally {
      setShowDeleteModal(false);
    }
  };

  if (!isOpen) return null;

  const isSaveDisabled =
    loading || !title.trim() || !startDate || (startDate && endDate && new Date(startDate) > new Date(endDate));

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet-card">
        <div className="sheet-top-row">
          <span className="sheet-eyebrow">
            {event && event.id ? "일정 수정" : "새 일정 추가"}
          </span>
          <button
            type="button"
            className="sheet-close"
            onClick={onClose}
            aria-label="닫기"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            className="sheet-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="일정 제목을 입력하세요"
            aria-label="일정 제목"
            required
          />

          <div
            className="sheet-type-row"
            role="radiogroup"
            aria-label="일정 유형"
          >
            <label
              className={`sheet-type-opt couple${
                eventType === "couple" ? " sel" : ""
              }`}
            >
              <input
                type="radio"
                name="eventType"
                value="couple"
                checked={eventType === "couple"}
                onChange={() => setEventType("couple")}
              />
              <span className="dot"></span>데이트
            </label>
            <label
              className={`sheet-type-opt boy${
                eventType === "boyfriend" ? " sel" : ""
              }`}
            >
              <input
                type="radio"
                name="eventType"
                value="boyfriend"
                checked={eventType === "boyfriend"}
                onChange={() => setEventType("boyfriend")}
              />
              <span className="dot"></span>
              {getMemberName("boyfriend")}
            </label>
            <label
              className={`sheet-type-opt girl${
                eventType === "girlfriend" ? " sel" : ""
              }`}
            >
              <input
                type="radio"
                name="eventType"
                value="girlfriend"
                checked={eventType === "girlfriend"}
                onChange={() => setEventType("girlfriend")}
              />
              <span className="dot"></span>
              {getMemberName("girlfriend")}
            </label>
          </div>

          <textarea
            className="sheet-desc-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="메모를 남겨보세요"
            aria-label="일정 설명"
            rows="6"
            spellCheck={false}
          />

          <div className="sheet-date-block">
            <div className="sheet-date-grid">
              <div className="sheet-date-col">
                <span className="sheet-date-micro">시작</span>
                <input
                  type="date"
                  className="sheet-date-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-label="시작일"
                  required
                />
              </div>
              <div className="sheet-date-col">
                <span className="sheet-date-micro">종료</span>
                <input
                  type="date"
                  className="sheet-date-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  aria-label="종료일"
                />
              </div>
            </div>
          </div>

          <div className="sheet-toggle-row">
            <label className="sheet-toggle-item">
              <input
                type="checkbox"
                checked={isDday}
                onChange={(e) => setIsDday(e.target.checked)}
              />
              <span className="sheet-switch"></span>
              <span className="sheet-toggle-text">디데이로 표시</span>
            </label>
            {eventType === myRole && (
              <label className="sheet-toggle-item">
                <input
                  type="checkbox"
                  checked={isPersonal}
                  onChange={(e) => setIsPersonal(e.target.checked)}
                />
                <span className="sheet-switch"></span>
                <span className="sheet-toggle-text">나만 보기</span>
              </label>
            )}
          </div>

          <hr className="sheet-dashed" />

          <div className="sheet-footer-row">
            {event && event.id ? (
              <button
                type="button"
                onClick={handleDelete}
                className="btn btn-danger"
                disabled={loading}
              >
                삭제
              </button>
            ) : (
              <div></div>
            )}

            <div className="sheet-foot-actions">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={loading}
              >
                취소
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaveDisabled}
              >
                {loading ? (
                  <>
                    <span className="loading-indicator"></span>
                    저장 중...
                  </>
                ) : (
                  "저장"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="confirm-card">
            <p className="confirm-title">일정 삭제</p>
            <p className="confirm-body">이 일정을 삭제하시겠습니까?</p>
            <div className="confirm-actions">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-secondary"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="btn btn-danger"
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

export default EventModal;
