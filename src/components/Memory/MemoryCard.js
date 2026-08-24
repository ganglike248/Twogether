// src/components/Memory/MemoryCard.js
import React from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import MemoryDetail from './MemoryDetail';
import { useAuthContext } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/dataUtils';
import './MemoryCard.css';

const MemoryCard = React.memo(({ memory }) => {
  const { getMemberName } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  // 모달 열림 상태를 useState 대신 ?memory= 쿼리에서 파생 — 손수 만든 pushState/popstate
  // 훅(useModalBackButton) 없이 React Router가 히스토리를 전담하게 함(캘린더와 같은 이유).
  // 목록의 카드마다 이 컴포넌트가 하나씩 있으므로, "내 id가 URL에 있는지"로 각자 판단함.
  const [searchParams] = useSearchParams();
  const showDetail = searchParams.get('memory') === memory.id;

  // location.key === 'default'면 이 세션에서 첫 진입(딥링크/새로고침)이라 navigate(-1)이
  // 앱 밖으로 나갈 수 있어 대신 /memories로 보냄 — 캘린더 closeModal과 동일한 패턴.
  const closeDetail = () => {
    if (location.key === 'default') {
      navigate('/memories', { replace: true });
    } else {
      navigate(-1);
    }
  };

  return (
    <>
      <div
        className="memory-card"
        onClick={() => navigate(`/memories?memory=${memory.id}`, { state: { modal: true } })}
      >
        <div className="card-header-container">
          <div className={`card-icon ${
            memory.eventType === 'boyfriend' ? 'icon-boyfriend' :
            memory.eventType === 'girlfriend' ? 'icon-girlfriend' :
            memory.eventType === 'personal' ? 'icon-personal' : 'icon-couple'
          }`}>
            {memory.eventType === 'boyfriend' ? '🐶' :
             memory.eventType === 'girlfriend' ? '🐹' :
             memory.eventType === 'personal' ? '🔒' : '🥰'}
          </div>
          <h3 className="card-title">{memory.title}</h3>
        </div>

        <div className="card-content">
          <div className="card-meta">
            <span className="card-date">{formatDate(memory.start)}</span>
            <span className={`card-badge ${
              memory.eventType === 'boyfriend' ? 'badge-boyfriend' :
              memory.eventType === 'girlfriend' ? 'badge-girlfriend' :
              memory.eventType === 'personal' ? 'badge-personal' : 'badge-couple'
            }`}>
              {memory.eventType === 'personal' ? '개인' : getMemberName(memory.eventType)}
            </span>
          </div>
          
          {memory.description && (
            <p className="card-description">{memory.description}</p>
          )}
        </div>
      </div>
      
      <MemoryDetail
        isOpen={showDetail}
        onClose={closeDetail}
        memory={memory}
      />
    </>
  );
});

MemoryCard.displayName = 'MemoryCard';

export default MemoryCard;