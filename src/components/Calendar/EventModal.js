import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { toast } from 'react-toastify';
import './EventModal.css';
import EditLogModal from '../EditLog/EditLogModal';
import { useAuthContext } from '../../contexts/AuthContext';

const EventModal = ({ isOpen, onClose, event, onSave, onDelete }) => {
  const { getMemberName } = useAuthContext();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [eventType, setEventType] = useState('couple');
  const [loading, setLoading] = useState(false);
  const [showEventLog, setShowEventLog] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      setStartDate(event.start ? event.start.split('T')[0] : '');

      // 종료일이 있으면 1일 빼서 표시
      let displayEndDate = event.end ? event.end.split('T')[0] : (event.start ? event.start.split('T')[0] : '');
      if (event.end && event.start) {
        const start = new Date(event.start.split('T')[0]);
        const end = new Date(event.end.split('T')[0]);
        // 종료일이 시작일보다 크면 1일 빼기
        if (end > start) {
          displayEndDate = format(subDays(end, 1), 'yyyy-MM-dd');
        }
      }
      setEndDate(displayEndDate);

      setEventType(event.eventType || 'couple');
    }
  }, [event]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let adjustedStartDate = startDate;
      let adjustedEndDate = endDate || startDate;

      // 시작일은 00:00으로 설정
      if (!adjustedStartDate.includes('T')) {
        adjustedStartDate = `${adjustedStartDate}T00:00:00`;
      }

      // 종료일 처리: 여러 날 일정이면 +1일 00:00:00, 하루 일정이면 23:59:59
      if (adjustedEndDate !== startDate) {
        const end = new Date(adjustedEndDate);
        end.setDate(end.getDate() + 1);
        adjustedEndDate = end.toISOString().split('T')[0] + 'T00:00:00';
      } else {
        if (!adjustedEndDate.includes('T')) {
          adjustedEndDate = `${adjustedEndDate}T23:59:59`;
        }
      }

      const eventData = {
        id: event?.id,
        title,
        description,
        start: adjustedStartDate,
        end: adjustedEndDate,
        eventType
      };

      await onSave(eventData);
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error(`일정 저장 중 오류가 발생했습니다.\n${error?.message || String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm('이 일정을 삭제하시겠습니까?')) {
      onDelete(event.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
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
                disabled={loading}
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
    </div>
  );
};

export default EventModal;
