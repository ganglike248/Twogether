import React, { useState, useEffect } from 'react';
import { addDays, subDays } from 'date-fns';
import { toast } from 'react-toastify';
import './EventModal.css';
import EditLogModal from '../EditLog/EditLogModal';
import { useAuthContext } from '../../contexts/AuthContext';
import useDoubleClickPrevention from '../../hooks/useDoubleClickPrevention';
import useAnalytics from '../../hooks/useAnalytics';
import { useModalBackButton } from '../../hooks/useModalBackButton';

const EventModal = ({ isOpen, onClose, event, onSave, onDelete }) => {
  const { getMemberName, myRole } = useAuthContext();
  const { logEvent } = useAnalytics();
  const canClick = useDoubleClickPrevention(500);
  useModalBackButton(isOpen, onClose);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [eventType, setEventType] = useState('couple');
  const [isPersonal, setIsPersonal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEventLog, setShowEventLog] = useState(false);
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
    } else {
      // 새 일정 생성 시 폼 초기화 + localStorage에서 마지막 개인 일정 여부 복원
      setTitle('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setEventType('couple');
      const lastPersonalState = localStorage.getItem('twogether_personal_default') === 'true';
      setIsPersonal(lastPersonalState);
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

  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">
            {event && event.id ? '일정 수정' : '새 일정 추가'}
          </h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="event-title">일정 제목</label>
              <input
                id="event-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="일정 제목을 입력하세요"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="event-description">설명</label>
              <textarea
                id="event-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="일정에 대한 상세 설명을 입력하세요"
                rows="5"
                spellCheck={false}
              />
            </div>

            <div className="form-group">
              <div className="date-inputs-section">
                <div className="date-inputs-title">일정 기간</div>
                <div className="form-grid">
                  <div className="date-input-group">
                    <label className="form-label" htmlFor="event-start">시작일</label>
                    <input
                      id="event-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="date-input-group">
                    <label className="form-label" htmlFor="event-end">종료일</label>
                    <input
                      id="event-end"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                    />
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#888', margin: '0.25rem 0 0' }}>종료일 미입력 시 하루 일정으로 처리됩니다</p>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">일정 유형</label>
              <div className="radio-group">
                <div className="radio-option">
                  <input
                    type="radio"
                    id="couple"
                    name="eventType"
                    value="couple"
                    checked={eventType === 'couple'}
                    onChange={() => setEventType('couple')}
                  />
                  <label htmlFor="couple" className="radio-label couple">
                    데이트
                  </label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="boyfriend"
                    name="eventType"
                    value="boyfriend"
                    checked={eventType === 'boyfriend'}
                    onChange={() => setEventType('boyfriend')}
                  />
                  <label htmlFor="boyfriend" className="radio-label boyfriend">
                    {getMemberName('boyfriend')}
                  </label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="girlfriend"
                    name="eventType"
                    value="girlfriend"
                    checked={eventType === 'girlfriend'}
                    onChange={() => setEventType('girlfriend')}
                  />
                  <label htmlFor="girlfriend" className="radio-label girlfriend">
                    {getMemberName('girlfriend')}
                  </label>
                </div>
              </div>

              {/* 개인 일정 체크박스 */}
              {eventType === myRole && (
                <div className="checkbox-group" style={{ marginTop: '0.75rem', paddingLeft: '0.5rem' }}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isPersonal}
                      onChange={(e) => setIsPersonal(e.target.checked)}
                    />
                    <span className="checkbox-text">나만 보기 (개인 일정)</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
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

            <div className="buttons-right">
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
                disabled={loading || !title.trim() || !startDate || (startDate && endDate && new Date(startDate) > new Date(endDate))}
              >
                {loading ? (
                  <>
                    <span className="loading-indicator"></span>
                    저장 중...
                  </>
                ) : '저장'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2 className="modal-title">일정 삭제</h2>
            </div>
            <div className="modal-body">
              <p style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                이 일정을 삭제하시겠습니까?
              </p>
            </div>
            <div className="modal-footer">
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
