// src/components/Travel/DecisionCard.jsx
import React, { useState, useRef } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { addScore, getUserScore, deleteOption, updateOption } from '../../../services/travelDecisionService';
import EditOptionModal from './EditOptionModal';
import { MdEdit, MdDelete, MdAddCircle, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { toast } from 'react-toastify';
import './DecisionCard.css';

const DecisionCard = ({ option, decision, currentUserId, onAddToSchedule }) => {
  const { coupleDoc, getMemberName } = useAuthContext();
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingScore, setSavingScore] = useState(false);
  const [selectedScore, setSelectedScore] = useState(null);
  const imageScrollRef = useRef(null);

  const myScore = getUserScore(option, currentUserId);

  // 커플 멤버 정보 가져오기
  const boyfriendInfo = coupleDoc?.members?.[0]
    ? { uid: coupleDoc.members[0], name: getMemberName('boyfriend') }
    : null;
  const girlfriendInfo = coupleDoc?.members?.[1]
    ? { uid: coupleDoc.members[1], name: getMemberName('girlfriend') }
    : null;

  // 각 멤버의 점수 가져오기
  const boyfriendScore = boyfriendInfo
    ? option.scores?.find(s => s.userId === boyfriendInfo.uid)?.score || 0
    : 0;
  const girlfriendScore = girlfriendInfo
    ? option.scores?.find(s => s.userId === girlfriendInfo.uid)?.score || 0
    : 0;

  // 자신의 닉네임 가져오기
  const myNickname = currentUserId === boyfriendInfo?.uid
    ? boyfriendInfo?.name
    : currentUserId === girlfriendInfo?.uid
    ? girlfriendInfo?.name
    : '나';

  // 내 점수가 이미 표시되었는지 확인
  const isMyScoreAlreadyShown =
    (currentUserId === boyfriendInfo?.uid && boyfriendScore > 0) ||
    (currentUserId === girlfriendInfo?.uid && girlfriendScore > 0);

  const handleScoreSelect = async (score) => {
    if (!score || score < 1 || score > 10) return;

    setSavingScore(true);
    try {
      await addScore(decision.tripId, decision.id, option.id, currentUserId, score);
      setSelectedScore(null);
      toast.success(`${score}점 평가했습니다!`);
    } catch (error) {
      console.error('Error saving score:', error);
      toast.error('점수 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingScore(false);
    }
  };

  const handleUpdateOption = async (updatedData) => {
    try {
      await updateOption(decision.tripId, decision.id, option.id, updatedData);
      setShowEditModal(false);
      toast.success('옵션이 수정되었습니다.');
    } catch (error) {
      console.error('Error updating option:', error);
      toast.error('옵션 수정 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteOption = async () => {
    if (!window.confirm('이 옵션을 삭제하시겠습니까?')) return;

    try {
      await deleteOption(decision.tripId, decision.id, option.id);
      toast.success('옵션이 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting option:', error);
      toast.error('옵션 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleScroll = (direction) => {
    if (imageScrollRef.current) {
      const itemWidth = imageScrollRef.current.clientWidth;
      imageScrollRef.current.scrollBy({
        left: direction === 'left' ? -itemWidth : itemWidth,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="decision-card">
      {/* 이미지들 (가로 스크롤 갤러리) */}
      {option.images && option.images.length > 0 && (
        <div className="dc-images-container">
          <div className="dc-images-scroll" ref={imageScrollRef}>
            {option.images.map((img, idx) => (
              <div key={idx} className="dc-image-item">
                <img
                  src={img}
                  alt={`${option.title} ${idx + 1}`}
                  className="dc-image"
                />
              </div>
            ))}
          </div>

          {/* 스크롤 버튼 */}
          {option.images.length > 1 && (
            <>
              <button
                className="dc-scroll-btn dc-scroll-left"
                onClick={() => handleScroll('left')}
                title="왼쪽 스크롤"
              >
                <MdChevronLeft size={20} />
              </button>
              <button
                className="dc-scroll-btn dc-scroll-right"
                onClick={() => handleScroll('right')}
                title="오른쪽 스크롤"
              >
                <MdChevronRight size={20} />
              </button>
            </>
          )}
        </div>
      )}

      {/* 헤더: 제목 + 액션 버튼 */}
      <div className="dc-header">
        <div className="dc-title-info">
          <h4 className="dc-title">{option.title}</h4>
          {option.price && <p className="dc-price">{option.price}</p>}
        </div>

        {/* 액션 버튼 (일정추가 + 수정 + 삭제) */}
        <div className="dc-action-buttons">
          {onAddToSchedule && (
            <button
              className="dc-add-schedule-btn"
              onClick={() => onAddToSchedule(option)}
              title="일정에 추가"
            >
              <MdAddCircle size={16} />
            </button>
          )}
          <button
            className="dc-edit-btn"
            onClick={() => setShowEditModal(true)}
            title="수정"
          >
            <MdEdit size={16} />
          </button>
          <button
            className="dc-delete-btn"
            onClick={handleDeleteOption}
            title="삭제"
          >
            <MdDelete size={16} />
          </button>
        </div>
      </div>

      {/* 설명 */}
      {option.description && (
        <p className="dc-description">{option.description}</p>
      )}

      {/* URL 링크 */}
      {option.url && (
        <a
          href={option.url}
          target="_blank"
          rel="noopener noreferrer"
          className="dc-url-link"
        >
          {option.url}
        </a>
      )}

      {/* 점수 표시 */}
      {(boyfriendScore > 0 || girlfriendScore > 0 || myScore) && (
        <div className="dc-scores-display">
          {boyfriendScore > 0 && (
            <span className="dc-score-label">{boyfriendInfo.name}: {boyfriendScore}점</span>
          )}
          {girlfriendScore > 0 && (
            <span className="dc-score-label">{girlfriendInfo.name}: {girlfriendScore}점</span>
          )}
          {myScore && !isMyScoreAlreadyShown && (
            <span className="dc-score-label">{myNickname}: {myScore}점</span>
          )}
          <span className="dc-total-score">(총: {option.totalScore || 0}/20)</span>
          {myScore && (
            <button
              className="dc-score-change-inline"
              onClick={() => setSelectedScore(myScore)}
              disabled={savingScore}
              title="점수 변경"
            >
              변경
            </button>
          )}
        </div>
      )}

      {/* 평가 섹션 */}
      <div className="dc-score-section">
        {!myScore && (
          <button
            className="dc-score-btn"
            onClick={() => setSelectedScore(1)}
            disabled={savingScore}
          >
            평가하기
          </button>
        )}

        {/* 점수 선택 그리드 */}
        {selectedScore !== null && (
          <div className="dc-score-selector">
            <div className="dc-score-grid">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(score => (
                <button
                  key={score}
                  className={`dc-score-option ${myScore === score ? 'active' : ''}`}
                  onClick={() => handleScoreSelect(score)}
                  disabled={savingScore}
                >
                  {score}
                </button>
              ))}
            </div>
            <button
              className="dc-score-cancel"
              onClick={() => setSelectedScore(null)}
              disabled={savingScore}
            >
              취소
            </button>
          </div>
        )}
      </div>

      {/* 수정 모달 */}
      {showEditModal && (
        <EditOptionModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          option={option}
          onSave={handleUpdateOption}
        />
      )}
    </div>
  );
};

export default DecisionCard;
