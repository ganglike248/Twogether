// src/components/Travel/TravelDecisionsTab.jsx
import React, { useState } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { useTravelDecisions } from '../../../hooks/useTravelDecisions';
import {
  createDecision,
  deleteDecision,
} from '../../../services/travelDecisionService';
import DecisionCategoryList from './DecisionCategoryList';
import DecisionModal from './DecisionModal';
import { MdGpsFixed } from 'react-icons/md';
import { toast } from 'react-toastify';
import './TravelDecisionsTab.css';

const TravelDecisionsTab = ({ trip, tripDays, onAddToSchedule }) => {
  const { user } = useAuthContext();
  const { decisions, loading } = useTravelDecisions(trip.id);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'deciding', 'decided'

  // 필터링된 선택지
  const filteredDecisions = decisions.filter(d => {
    if (filter === 'all') return true;
    return d.status === filter;
  });

  const groupByCategory = (list) => list.reduce((acc, d) => {
    if (!acc[d.category]) acc[d.category] = [];
    acc[d.category].push(d);
    return acc;
  }, {});

  const decidingDecisions = filteredDecisions.filter(d => d.status !== 'decided');
  const decidedDecisions  = filteredDecisions.filter(d => d.status === 'decided');
  const decidingByCategory = groupByCategory(decidingDecisions);
  const decidedByCategory  = groupByCategory(decidedDecisions);

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
        <button className="tdt-add-btn" onClick={() => setShowModal(true)}>
          + 새 비교 주제
        </button>
      </div>

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
        <div className="tdt-content">
          {Object.entries(decidingByCategory).map(([category, categoryDecisions]) => (
            <DecisionCategoryList
              key={category}
              category={category}
              decisions={categoryDecisions}
              currentUserId={user?.uid}
              tripId={trip.id}
              onDelete={handleDeleteDecision}
              onAddToSchedule={onAddToSchedule}
            />
          ))}
          {decidedDecisions.length > 0 && decidingDecisions.length > 0 && (
            <div className="tdt-decided-divider"><span>확정됨</span></div>
          )}
          {Object.entries(decidedByCategory).map(([category, categoryDecisions]) => (
            <DecisionCategoryList
              key={`decided-${category}`}
              category={category}
              decisions={categoryDecisions}
              currentUserId={user?.uid}
              tripId={trip.id}
              onDelete={handleDeleteDecision}
              onAddToSchedule={onAddToSchedule}
            />
          ))}
        </div>
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
};

export default TravelDecisionsTab;
