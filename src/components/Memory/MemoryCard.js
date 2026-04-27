// src/components/Memory/MemoryCard.js
import React, { useState } from 'react';
import MemoryDetail from './MemoryDetail';
import { useAuthContext } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/dataUtils';
import './MemoryCard.css';

const MemoryCard = React.memo(({ memory }) => {
  const [showDetail, setShowDetail] = useState(false);
  const { getMemberName } = useAuthContext();

  return (
    <>
      <div className="memory-card" onClick={() => setShowDetail(true)}>
        <div className="card-header-container">
          <div className={`card-icon ${
            memory.eventType === 'boyfriend' ? 'icon-boyfriend' : 
            memory.eventType === 'girlfriend' ? 'icon-girlfriend' : 'icon-couple'
          }`}>
            {memory.eventType === 'boyfriend' ? '🐶' : 
             memory.eventType === 'girlfriend' ? '🐹' : '🥰'}
          </div>
          <h3 className="card-title">{memory.title}</h3>
        </div>
        
        <div className="card-content">
          <div className="card-meta">
            <span className="card-date">{formatDate(memory.start)}</span>
            <span className={`card-badge ${
              memory.eventType === 'boyfriend' ? 'badge-boyfriend' : 
              memory.eventType === 'girlfriend' ? 'badge-girlfriend' : 'badge-couple'
            }`}>
              {getMemberName(memory.eventType)}
            </span>
          </div>
          
          {memory.description && (
            <p className="card-description">{memory.description}</p>
          )}
        </div>
      </div>
      
      <MemoryDetail
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        memory={memory}
      />
    </>
  );
});

MemoryCard.displayName = 'MemoryCard';

export default MemoryCard;