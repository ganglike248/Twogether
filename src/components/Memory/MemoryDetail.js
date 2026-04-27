// src/components/Memory/MemoryDetail.js
import React from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/dataUtils';
import './MemoryDetail.css';

const MemoryDetail = ({ isOpen, onClose, memory }) => {
  const { getMemberName } = useAuthContext();
  if (!isOpen || !memory) return null;
  
  return (
    <div className="memory-modal-overlay">
      <div className="memory-modal-container">
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
            <div className={`memory-badge ${
              memory.eventType === 'boyfriend' ? 'boyfriend' :
              memory.eventType === 'girlfriend' ? 'girlfriend' : 'couple'
            }`}>
              {getMemberName(memory.eventType)}
            </div>

            <div className="memory-section">
              <h3 className="memory-section-title">날짜</h3>
              <p className="memory-date">{formatDate(memory.start)}</p>
              {memory.end && memory.end !== memory.start && (
                <p className="memory-date">~ {formatDate(memory.end)}</p>
              )}
            </div>

            {memory.description && (
              <div className="memory-section">
                <h3 className="memory-section-title">내용</h3>
                <p className="memory-description">{memory.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryDetail;