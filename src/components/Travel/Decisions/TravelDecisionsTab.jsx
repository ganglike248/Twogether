// src/components/Travel/TravelDecisionsTab.jsx
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { useTravelDecisions } from '../../../hooks/useTravelDecisions';
import {
  createDecision,
  deleteDecision,
  hasUserScored,
} from '../../../services/travelDecisionService';
import DecisionCategoryList from './DecisionCategoryList';
import DecisionModal from './DecisionModal';
import { MdGpsFixed } from 'react-icons/md';
import { toast } from 'react-toastify';
import './TravelDecisionsTab.css';

const categoryLabels = {
  accommodation: '숙소',
  restaurant: '식당',
  activity: '액티비티',
  transport: '교통',
  custom: '기타',
};

const TravelDecisionsTab = forwardRef(({ trip, tripDays, onAddToSchedule }, ref) => {
  const { user } = useAuthContext();
  const { decisions, loading } = useTravelDecisions(trip.id);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'deciding', 'decided'
  const [selectedDecisionId, setSelectedDecisionId] = useState(null); // 주제 필터
  const [activeCategory, setActiveCategory] = useState(null); // TOC 스크롤 추적
  const categoryRefs = useRef({}); // 각 카테고리 섹션 ref
  const contentRef = useRef(null); // 콘텐츠 컨테이너 ref
  const tocRef = useRef(null); // TOC 네비게이션 ref
  const decisionFilterRef = useRef(null); // 주제 필터 가로스크롤 ref

  // 상태 필터링된 선택지
  const statusFilteredDecisions = decisions.filter(d => {
    if (filter === 'all') return true;
    return d.status === filter;
  });

  // 주제 필터링까지 적용
  const filteredDecisions = selectedDecisionId
    ? statusFilteredDecisions.filter(d => d.id === selectedDecisionId)
    : statusFilteredDecisions;

  const decidingDecisions = filteredDecisions.filter(d => d.status !== 'decided');
  const decidedDecisions = filteredDecisions.filter(d => d.status === 'decided');

  // 주제별 미평가 개수 계산
  const getDecisionUnscorredCount = (decision) => {
    return (decision.options || []).filter(opt => !hasUserScored(opt, user.uid)).length;
  };

  // TOC 데이터 생성: 미평가 많은 순으로 정렬
  const decisionsWithCounts = filteredDecisions
    .map(d => ({
      id: d.id,
      title: d.title,
      unscorredCount: getDecisionUnscorredCount(d),
    }))
    .sort((a, b) => b.unscorredCount - a.unscorredCount);

  // 스크롤 추적: IntersectionObserver로 현재 활성 주제 감지
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.getAttribute('data-decision-id'));
          }
        });
      },
      { threshold: 0.3 }
    );

    Object.values(categoryRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [filteredDecisions]);

  // TOC 클릭 시 해당 섹션으로 스크롤
  const handleTocClick = (decisionId) => {
    const ref = categoryRefs.current[decisionId];
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveCategory(decisionId);
    }
  };

  const handleCreateDecision = async (decisionData) => {
    try {
      await createDecision(trip.id, {
        ...decisionData,
        coupleId: trip.coupleId,
      });
      setShowModal(false);
      toast.success('선택지가 추가되었습니다.');
    } catch (error) {
      console.error('Error creating decision:', error);
      toast.error('선택지 추가 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteDecision = async (decisionId) => {
    if (!window.confirm('이 선택지를 삭제하시겠습니까?')) return;
    try {
      await deleteDecision(trip.id, decisionId);
      toast.success('선택지가 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting decision:', error);
      toast.error('선택지 삭제 중 오류가 발생했습니다.');
    }
  };

  // FAB 메서드 노출
  useImperativeHandle(ref, () => ({
    showDecisionMenu: () => {
      setShowModal(true);
    }
  }), []);

  if (loading) {
    return (
      <div className="tdt-loading">
        <div className="tdt-spinner" />
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="travel-decisions-tab">
      {/* 필터 */}
      <div className="tdt-filters">
        <button
          className={`tdt-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          전체
        </button>
        <button
          className={`tdt-filter-btn ${filter === 'deciding' ? 'active' : ''}`}
          onClick={() => setFilter('deciding')}
        >
          검토 중
        </button>
        <button
          className={`tdt-filter-btn ${filter === 'decided' ? 'active' : ''}`}
          onClick={() => setFilter('decided')}
        >
          확정
        </button>
      </div>

      {/* 주제 필터 (가로스크롤) */}
      {statusFilteredDecisions.length > 0 && (
        <div className="tdt-decision-filters" ref={decisionFilterRef}>
          {statusFilteredDecisions.map(decision => {
            const unscorredCount = getDecisionUnscorredCount(decision);
            const isActive = selectedDecisionId === decision.id;
            const isDecided = decision.status === 'decided';
            return (
              <button
                key={decision.id}
                className={`tdt-decision-filter-btn ${isActive ? 'active' : ''} ${isDecided ? 'decided' : ''}`}
                onClick={() => setSelectedDecisionId(isActive ? null : decision.id)}
              >
                <span>{decision.title}</span>
                {unscorredCount > 0 && (
                  <span className="tdt-decision-filter-badge">{unscorredCount}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 빈 상태 */}
      {filteredDecisions.length === 0 ? (
        <div className="tdt-empty">
          <div className="tdt-empty-icon">
            <MdGpsFixed size={48} />
          </div>
          <p className="tdt-empty-title">
            {filter === 'all'
              ? '아직 선택지가 없습니다'
              : '해당하는 선택지가 없습니다'}
          </p>
          <p className="tdt-empty-text">
            숙소, 식당, 액티비티 등을 비교해보세요!
          </p>
        </div>
      ) : (
        <>
          <div className="tdt-content" ref={contentRef}>
            {decidingDecisions.map((decision) => (
              <div
                key={decision.id}
                ref={(el) => { if (el) categoryRefs.current[decision.id] = el; }}
                data-decision-id={decision.id}
                className="tdt-decision-item"
              >
                <DecisionCategoryList
                  isDecisionItem={true}
                  category={decision.id}
                  decisions={[decision]}
                  currentUserId={user?.uid}
                  tripId={trip.id}
                  onDelete={handleDeleteDecision}
                  onAddToSchedule={onAddToSchedule}
                />
              </div>
            ))}
            {decidedDecisions.length > 0 && decidingDecisions.length > 0 && (
              <div className="tdt-decided-divider"><span>확정됨</span></div>
            )}
            {decidedDecisions.map((decision) => (
              <div
                key={`decided-${decision.id}`}
                ref={(el) => { if (el) categoryRefs.current[decision.id] = el; }}
                data-decision-id={decision.id}
                className="tdt-decision-item"
              >
                <DecisionCategoryList
                  isDecisionItem={true}
                  category={decision.id}
                  decisions={[decision]}
                  currentUserId={user?.uid}
                  tripId={trip.id}
                  onDelete={handleDeleteDecision}
                  onAddToSchedule={onAddToSchedule}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* 모달 */}
      {showModal && (
        <DecisionModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          tripId={trip.id}
          coupleId={trip.coupleId}
          onSave={handleCreateDecision}
        />
      )}
    </div>
  );
});

TravelDecisionsTab.displayName = 'TravelDecisionsTab';

export default TravelDecisionsTab;
