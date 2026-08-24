// src/components/Memory/MemoryDetail.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { subDays, parseISO, format } from 'date-fns';
import { useAuthContext } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/dataUtils';
import './MemoryDetail.css';

const MemoryDetail = ({ isOpen, onClose, memory }) => {
  const { getMemberName } = useAuthContext();
  const navigate = useNavigate();
  if (!isOpen || !memory) return null;

  const startDay = memory.start?.split('T')[0];
  const endDay = memory.end?.split('T')[0];
  const isMultiDay = endDay && endDay !== startDay;
  const displayEnd = isMultiDay ? formatDate(format(subDays(parseISO(endDay), 1), 'yyyy-MM-dd')) : null;

  const handleGoToEvent = () => {
    // onClose()(navigate(-1))를 먼저 부르고 곧바로 다른 곳으로 navigate하면 back()(비동기
    // 처리)과 뒤이은 이동이 겹쳐 히스토리가 꼬일 수 있음(캘린더 모달에서 겪었던 것과 같은
    // 레이스). /calendar로 바로 이동하는 것 자체가 이 카드의 열림 상태(URL 기반)를 자동으로
    // 닫아주므로 onClose()를 따로 부를 필요 없음.
    navigate(`/calendar?date=${startDay}`);
  };

  return (
    <div className="memory-modal-overlay" onClick={onClose}>
      <div className="memory-modal-container" onClick={e => e.stopPropagation()}>
        <div className="memory-modal-header">
          <h2 className="memory-modal-title">{memory.title}</h2>
          <button 
            className="memory-modal-close"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        
        <div className="memory-modal-content">
          <div className="memory-details">
            <div className="memory-meta-row">
              <span className="memory-date">
                {formatDate(memory.start)}{displayEnd && ` ~ ${displayEnd}`}
              </span>
              <div className={`memory-badge ${
                memory.eventType === 'boyfriend' ? 'boyfriend' :
                memory.eventType === 'girlfriend' ? 'girlfriend' :
                memory.eventType === 'personal' ? 'personal' : 'couple'
              }`}>
                {memory.eventType === 'personal' ? '개인' : getMemberName(memory.eventType)}
              </div>
            </div>

            {memory.description && (
              <div className="memory-section">
                <h3 className="memory-section-title">내용</h3>
                <p className="memory-description">{memory.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="memory-modal-footer">
          <button className="memory-goto-event-btn" onClick={handleGoToEvent}>
            해당 일정으로 가기
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemoryDetail;