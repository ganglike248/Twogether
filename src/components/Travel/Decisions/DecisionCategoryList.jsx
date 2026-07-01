// src/components/Travel/DecisionCategoryList.jsx
import React, { useState, useRef } from 'react';
import { MdHotel, MdRestaurant, MdEmojiFlags, MdDirectionsCar, MdPushPin, MdClose, MdAdd, MdExpandMore, MdEdit, MdCheckCircle } from 'react-icons/md';
import { sortByUserScore, addOption, updateDecision, undecideDecision } from '../../../services/travelDecisionService';
import { useAuthContext } from '../../../contexts/AuthContext';
import DecisionCard from './DecisionCard';
import DecisionTopPick from './DecisionTopPick';
import AddOptionModal from './AddOptionModal';
import DecisionModal from './DecisionModal';
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
  const [expandedOptions, setExpandedOptions] = useState({}); // decision ID -> boolean (기본 true)
  const [editingDecision, setEditingDecision] = useState(null); // decision being edited (for DecisionModal)
  const cardRefs = useRef({}); // optionId -> ref

  // 커플 멤버 정보
  const boyfriendInfo = coupleDoc?.members?.[0]
    ? { uid: coupleDoc.members[0], name: getMemberName('boyfriend') }
    : null;
  const girlfriendInfo = coupleDoc?.members?.[1]
    ? { uid: coupleDoc.members[1], name: getMemberName('girlfriend') }
    : null;

  // 확정된 주제는 기본 접힘, 검토 중은 기본 펼침
  const getIsExpanded = (decision) => {
    if (decision.id in expandedOptions) return expandedOptions[decision.id];
    return decision.status !== 'decided';
  };

  const toggleOptions = (decision) => {
    setExpandedOptions(prev => ({
      ...prev,
      [decision.id]: !getIsExpanded(decision),
    }));
  };

  const handleUndecide = async (decision) => {
    try {
      await undecideDecision(tripId, decision.id);
      toast.success('확정이 취소되었습니다.');
    } catch (error) {
      console.error('Error undeciding:', error);
      toast.error('취소 중 오류가 발생했습니다.');
    }
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

  const handleOpenEditModal = (decision) => {
    setEditingDecision(decision);
  };

  const handleSaveDecision = async (decisionData) => {
    try {
      if (editingDecision) {
        // 수정 모드
        await updateDecision(tripId, editingDecision.id, {
          category: decisionData.category,
          title: decisionData.title,
          description: decisionData.description,
        });
        toast.success('비교 주제가 수정되었습니다.');
      }
      setEditingDecision(null);
    } catch (error) {
      console.error('Error saving decision:', error);
      toast.error('저장 중 오류가 발생했습니다.');
    }
  };

  const handleSelectTopPick = (optionId, decisionId) => {
    const decision = sortedDecisions.find(d => d.id === decisionId);
    // 후보가 접혀있으면 먼저 펼치기
    if (decision && !getIsExpanded(decision)) {
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
        {sortedDecisions.map(decision => {
          const expanded = getIsExpanded(decision);
          const decidedOpt = decision.decidedOption
            ? decision.options?.find(o => o.id === decision.decidedOption)
            : null;

          return (
            <div
              key={decision.id}
              className="dcl-decision-group"
            >
              <>
                {/* 선택지 제목 */}
                <div className="dcl-decision-header">
                  <div className="dcl-title-section">
                    <div className="dcl-title-view">
                      <h4 className="dcl-decision-title">{decision.title}</h4>
                      <button
                        className="dcl-title-edit-btn"
                        onClick={() => handleOpenEditModal(decision)}
                        title="수정"
                      >
                        <MdEdit size={16} />
                      </button>
                    </div>
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

                {/* 확정됨 배너 OR 최고 선택 */}
                {decision.options && decision.options.length > 0 && (() => {
                  if (decision.status === 'decided' && decidedOpt) {
                    const bScore = boyfriendInfo
                      ? decidedOpt.scores?.find(s => s.userId === boyfriendInfo.uid)?.score || 0
                      : 0;
                    const gScore = girlfriendInfo
                      ? decidedOpt.scores?.find(s => s.userId === girlfriendInfo.uid)?.score || 0
                      : 0;
                    return (
                      <div className="dcl-decided-banner">
                        <div className="dcl-decided-banner-header">
                          <span className="dcl-decided-label">
                            <MdCheckCircle size={16} />
                            확정됨
                          </span>
                          <button
                            className="dcl-undecide-link"
                            onClick={() => handleUndecide(decision)}
                          >
                            변경하기
                          </button>
                        </div>
                        <div className="dcl-decided-content">
                          {decidedOpt.images?.[0] && (
                            <img
                              src={decidedOpt.images[0]}
                              alt={decidedOpt.title}
                              className="dcl-decided-image"
                            />
                          )}
                          <div className="dcl-decided-info">
                            <p className="dcl-decided-title">{decidedOpt.title}</p>
                            {decidedOpt.price && (
                              <p className="dcl-decided-price">{decidedOpt.price}</p>
                            )}
                            <div className="dcl-decided-scores">
                              {bScore > 0 && (
                                <span className="dcl-decided-score-item">
                                  {boyfriendInfo.name} {bScore}점
                                </span>
                              )}
                              {gScore > 0 && (
                                <span className="dcl-decided-score-item">
                                  {girlfriendInfo.name} {gScore}점
                                </span>
                              )}
                              {(bScore > 0 || gScore > 0) && (
                                <span className="dcl-decided-total">
                                  합계 {decidedOpt.totalScore || 0}/20
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <DecisionTopPick
                      options={decision.options}
                      onSelectOption={(optionId) => handleSelectTopPick(optionId, decision.id)}
                      boyfriendInfo={boyfriendInfo}
                      girlfriendInfo={girlfriendInfo}
                    />
                  );
                })()}

                {/* 액션 행: 후보 보기/숨기기(왼쪽) + 추가(오른쪽) */}
                <div className="dcl-actions-row">
                  {decision.options && decision.options.length > 0 ? (
                    <button
                      className={`dcl-toggle-btn${expanded ? ' expanded' : ''}`}
                      onClick={() => toggleOptions(decision)}
                    >
                      <MdExpandMore size={14} />
                      {expanded ? '후보 숨기기' : '후보 보기'} ({decision.options.length})
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    className="dcl-add-option-btn"
                    onClick={() => setShowAddModal(decision.id)}
                  >
                    <MdAdd size={13} />
                    추가
                  </button>
                </div>

                {/* 후보 목록 */}
                {expanded && decision.options && decision.options.length > 0 && (
                  <div className="dcl-options-list">
                    {decision.options.map(option => (
                      <div
                        key={option.id}
                        ref={(el) => { if (el) cardRefs.current[option.id] = el; }}
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
          );
        })}
      </div>

      {/* 비교 주제 수정 모달 - DecisionModal 재사용 */}
      <DecisionModal
        isOpen={!!editingDecision}
        onClose={() => setEditingDecision(null)}
        editingDecision={editingDecision}
        onSave={handleSaveDecision}
        tripId={tripId}
      />
    </div>
  );
};

export default DecisionCategoryList;
