import React, { useState, useEffect, useRef } from 'react';
import { format, subDays } from 'date-fns';
import { doc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { uploadEventImage, deleteEventImage } from '../../services/storageService';
import './EventModal.css';
import EditLogModal from '../EditLog/EditLogModal';

const EventModal = ({ isOpen, onClose, event, onSave, onDelete, coupleId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [eventType, setEventType] = useState('couple');
  const [loading, setLoading] = useState(false);
  const [showEventLog, setShowEventLog] = useState(false);

  // 이미지 상태
  const [existingUrls, setExistingUrls] = useState([]); // 이미 저장된 URL
  const [pendingFiles, setPendingFiles] = useState([]);  // 새로 선택한 파일
  const [deletedUrls, setDeletedUrls] = useState([]);    // 삭제할 URL
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      setStartDate(event.start ? event.start.split('T')[0] : '');

      let displayEndDate = event.end ? event.end.split('T')[0] : (event.start ? event.start.split('T')[0] : '');
      if (event.end && event.start) {
        const start = new Date(event.start.split('T')[0]);
        const end = new Date(event.end.split('T')[0]);
        if (end > start) {
          displayEndDate = format(subDays(end, 1), 'yyyy-MM-dd');
        }
      }
      setEndDate(displayEndDate);
      setEventType(event.eventType || 'couple');
      setExistingUrls(event.imageUrls || []);
    }
    setPendingFiles([]);
    setDeletedUrls([]);
  }, [event]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const totalCount = existingUrls.length + pendingFiles.length + files.length;
    if (totalCount > 10) {
      alert('이미지는 최대 10장까지 첨부할 수 있습니다.');
      return;
    }
    const withPreview = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPendingFiles(prev => [...prev, ...withPreview]);
    e.target.value = '';
  };

  const handleRemoveExisting = (url) => {
    setExistingUrls(prev => prev.filter(u => u !== url));
    setDeletedUrls(prev => [...prev, url]);
  };

  const handleRemovePending = (index) => {
    setPendingFiles(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let adjustedStartDate = startDate;
      let adjustedEndDate = endDate || startDate;

      if (!adjustedStartDate.includes('T')) {
        adjustedStartDate = `${adjustedStartDate}T00:00:00`;
      }

      if (adjustedEndDate !== startDate) {
        const end = new Date(adjustedEndDate);
        end.setDate(end.getDate() + 1);
        adjustedEndDate = end.toISOString().split('T')[0] + 'T00:00:00';
      } else {
        if (!adjustedEndDate.includes('T')) {
          adjustedEndDate = `${adjustedEndDate}T23:59:59`;
        }
      }

      // Storage에 쓸 경로용 ID: 기존 이벤트면 event.id, 신규면 임시 생성
      const storageId = event?.id || doc(collection(db, 'events')).id;

      // 삭제할 이미지 Storage에서 제거
      await Promise.all(deletedUrls.map(url => deleteEventImage(url)));

      // 새 이미지 업로드
      const uploadedUrls = coupleId
        ? await Promise.all(
            pendingFiles.map(({ file }) => uploadEventImage(coupleId, storageId, file))
          )
        : [];

      const imageUrls = [...existingUrls, ...uploadedUrls];

      const eventData = {
        id: event?.id,
        title,
        description,
        start: adjustedStartDate,
        end: adjustedEndDate,
        eventType,
        imageUrls,
      };

      await onSave(eventData);
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('일정 저장 중 오류가 발생했습니다.');
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

  const totalImages = existingUrls.length + pendingFiles.length;

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
                  <label htmlFor="couple" className="radio-label couple">데이트</label>
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
                  <label htmlFor="boyfriend" className="radio-label boyfriend">경락</label>
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
                  <label htmlFor="girlfriend" className="radio-label girlfriend">효정</label>
                </div>
              </div>
            </div>

            {/* 이미지 업로드 */}
            <div className="form-group">
              <label className="form-label">사진</label>
              {totalImages > 0 && (
                <div className="image-grid">
                  {existingUrls.map((url) => (
                    <div key={url} className="image-item">
                      <img src={url} alt="" className="image-preview" />
                      <button
                        type="button"
                        className="image-delete"
                        onClick={() => handleRemoveExisting(url)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  {pendingFiles.map(({ preview }, i) => (
                    <div key={preview} className="image-item image-item-pending">
                      <img src={preview} alt="" className="image-preview" />
                      <button
                        type="button"
                        className="image-delete"
                        onClick={() => handleRemovePending(i)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {totalImages < 10 && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    className="image-add-btn"
                    onClick={() => fileInputRef.current.click()}
                  >
                    + 사진 추가 ({totalImages}/10)
                  </button>
                </>
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
