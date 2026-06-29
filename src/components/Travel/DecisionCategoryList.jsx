// src/components/Travel/DecisionCategoryList.jsx
import React, { useState, useRef } from 'react';
import { MdHotel, MdRestaurant, MdEmojiFlags, MdDirectionsCar, MdPushPin, MdClose, MdAdd, MdExpandMore } from 'react-icons/md';
import { sortByUserScore, addOption } from '../../services/travelDecisionService';
import { useAuthContext } from '../../contexts/AuthContext';
import DecisionCard from './DecisionCard';
import DecisionTopPick from './DecisionTopPick';
import AddOptionModal from './AddOptionModal';
import { toast } from 'react-toastify';
import './DecisionCategoryList.css';

const categoryLabels = {
  accommodation: '숙소',
  restaurant: '식당',
  activity: '액티비티',
  transport: '교통',
  custom: '기타',
};

const categoryIcons = {
  accommodation: MdHotel,
  restaurant: MdRestaurant,
  activity: MdEmojiFlags,
  transport: MdDirectionsCar,
  custom: MdPushPin,
};

const DecisionCategoryList = ({ category, decisions, currentUserId, onDelete, tripId, onAddToSchedule }) => {
  const { coupleDoc, getMemberName } = useAuthContext();
  const [showAddModal, setShowAddModal] = useState(null); // decision ID or null
  const [addingOption, setAddingOption] = useState(false);
  const [expandedOptions, setExpandedOptions] = useState({}); // decision ID -> boolean
  const cardRefs = useRef({}); // optionId -> ref

  // 커플 멤버 정보
  const boyfriendInfo = coupleDoc?.members?.[0]
    ? { uid: coupleDoc.members[0], name: getMemberName('boyfriend') }
    : null;
  const girlfriendInfo = coupleDoc?.members?.[1]
    ? { uid: coupleDoc.members[1], name: getMemberName('girlfriend') }
    : null;

  const toggleOptions = (decisionId) => {
    setExpandedOptions(prev => ({
      ...prev,
      [decisionId]: !prev[decisionId],
    }));
  };

  if (!decisions || decisions.length === 0) return null;

  // 각 선택지마다 옵션 정렬 (Q3: 자신의 점수 여부 기준)
  const sortedDecisions = decisions.map(decision => ({
    ...decision,
    options: sortByUserScore(decision.options, currentUserId),
  }));

  const handleAddOption = async (decisionId, optionData) => {
    setAddingOption(true);
    try {
      await addOption(tripId, decisionId, optionData);
      toast.success('옵션이 추가되었습니다.');
      setShowAddModal(null);
    } catch (error) {
      console.error('Error adding option:', error);
      toast.error('옵션 추가 중 오류가 발생했습니다.');
    } finally {
      setAddingOption(false);
    }
  };

  const handleSelectTopPick = (optionId, decisionId) => {
    // 후보가 접혀있으면 먼저 펼치기
    if (!expandedOptions[decisionId]) {
      setExpandedOptions(prev => ({
        ...prev,
        [decisionId]: true,
      }));
      // DOM이 업데이트될 때까지 잠깐 기다린 후 스크롤
      setTimeout(() => {
        const cardRef = cardRefs.current[optionId];
        if (cardRef) {
          cardRef.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          // 시각적 하이라이트 효과
          cardRef.style.backgroundColor = 'rgba(255, 182, 193, 0.2)';
          setTimeout(() => {
            cardRef.style.backgroundColor = 'white';
            cardRef.style.transition = 'background-color 0.3s ease';
          }, 100);
        }
      }, 50);
    } else {
      // 이미 펼쳐져있으면 바로 스크롤
      const cardRef = cardRefs.current[optionId];
      if (cardRef) {
        cardRef.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        // 시각적 하이라이트 효과
        cardRef.style.backgroundColor = 'rgba(255, 182, 193, 0.2)';
        setTimeout(() => {
          cardRef.style.backgroundColor = 'white';
          cardRef.style.transition = 'background-color 0.3s ease';
        }, 100);
      }
    }
  };

  return (
    <div className="dcl-category-section">
      {/* 카테고리 제목 */}
      <h3 className="dcl-category-title">
        <span className="dcl-category-icon">
          {React.createElement(categoryIcons[category] || MdPushPin, { size: 20 })}
        </span>
        {categoryLabels[category] || category}
      </h3>

      {/* 각 선택지 그룹 */}
      <div className="dcl-decisions-list">
        {sortedDecisions.map(decision => (
          <div key={decision.id} className="dcl-decision-group">
            {/* 선택지 제목 */}
            <div className="dcl-decision-header">
              <div>
                <h4 className="dcl-decision-title">{decision.title}</h4>
                {decision.description && (
                  <p className="dcl-decision-description">{decision.description}</p>
                )}
              </div>
              <button
                className="dcl-delete-btn"
                onClick={() => onDelete(decision.id)}
                title="삭제"
              >
                <MdClose />
              </button>
            </div>

            {/* 최고 선택 (Q2 구현) */}
            {decision.options && decision.options.length > 0 && (
              <>
                <DecisionTopPick
                  options={decision.options}
                  onSelectOption={(optionId) => handleSelectTopPick(optionId, decision.id)}
                  boyfriendInfo={boyfriendInfo}
                  girlfriendInfo={girlfriendInfo}
                />

                {/* 후보 카드 토글 버튼 */}
                <button
                  className={`dcl-toggle-options-btn ${expandedOptions[decision.id] ? 'expanded' : 'collapsed'}`}
                  onClick={() => toggleOptions(decision.id)}
                >
                  <MdExpandMore size={18} />
                  <span>{expandedOptions[decision.id] ? '후보 숨기기' : '후보 보기'} ({decision.options.length})</span>
                </button>

                {/* 모든 옵션 카드 (접기/펼치기) */}
                {expandedOptions[decision.id] && (
                  <div className="dcl-options-list">
                    {decision.options.map(option => (
                      <div
                        key={option.id}
                        ref={(el) => {
                          if (el) cardRefs.current[option.id] = el;
                        }}
                      >
                        <DecisionCard
                          option={option}
                          decision={decision}
                          currentUserId={currentUserId}
                          onAddToSchedule={onAddToSchedule}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 옵션 추가 버튼 */}
            <button
              className="dcl-add-option-btn"
              onClick={() => setShowAddModal(decision.id)}
            >
              <MdAdd size={18} />
              옵션 추가
            </button>

            {/* 옵션 추가 모달 */}
            {showAddModal === decision.id && (
              <AddOptionModal
                isOpen={true}
                onClose={() => setShowAddModal(null)}
                onSave={(optionData) => handleAddOption(decision.id, optionData)}
                loading={addingOption}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DecisionCategoryList;
