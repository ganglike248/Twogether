// src/components/Memory/MemoryDetail.js
import React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import './MemoryDetail.css';

const MemoryDetail = ({ isOpen, onClose, memory }) => {
  if (!isOpen || !memory) return null;
  
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'yyyy년 MM월 dd일', { locale: ko });
    } catch (error) {
      return dateString;
    }
  };
  
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
          {memory.imageUrls?.length > 0 && (
            <div className="memory-image-gallery">
              {memory.imageUrls.map((url, i) => (
                <img
                  key={url}
                  src={url}
                  alt={`${memory.title} ${i + 1}`}
                  className="memory-gallery-img"
                  onClick={() => window.open(url, '_blank')}
                />
              ))}
            </div>
          )}
          <div className="memory-details">
            <div className={`memory-badge ${
              memory.eventType === 'boyfriend' ? 'boyfriend' : 
              memory.eventType === 'girlfriend' ? 'girlfriend' : 'couple'
            }`}>
              {memory.eventType === 'boyfriend' ? '경락' : 
               memory.eventType === 'girlfriend' ? '효정' : '데이트'}
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