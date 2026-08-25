// src/components/Travel/DecisionCard.jsx
import React, { useState, useRef } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { addScore, getUserScore, getUserComment, hasUserScored, deleteOption, updateOption, decideOption, toggleFavorite } from '../../../services/travelDecisionService';
import { handleOpenLink } from '../../../utils/appLinkUtils';
import EditOptionModal from './EditOptionModal';
import ConfirmModal from '../../common/ConfirmModal';
import { MdEdit, MdDelete, MdAddCircle, MdChevronLeft, MdChevronRight, MdPriorityHigh, MdStar } from 'react-icons/md';
import { toast } from 'react-toastify';
import './DecisionCard.css';

const DecisionCard = ({ option, decision, currentUserId, onAddToSchedule }) => {
  const { coupleDoc, getMemberName } = useAuthContext();
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingScore, setSavingScore] = useState(false);
  const [selectedScore, setSelectedScore] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'decide' | 'delete' | null
  const imageScrollRef = useRef(null);

  const myScore = getUserScore(option, currentUserId);
  const myComment = getUserComment(option, currentUserId);

  // 커플 멤버 정보 가져오기
  const boyfriendInfo = coupleDoc?.members?.[0]
    ? { uid: coupleDoc.members[0], name: getMemberName('boyfriend') }
    : null;
  const girlfriendInfo = coupleDoc?.members?.[1]
    ? { uid: coupleDoc.members[1], name: getMemberName('girlfriend') }
    : null;

  // 각 멤버의 점수 및 의견 가져오기
  const boyfriendScore = boyfriendInfo
    ? option.scores?.find(s => s.userId === boyfriendInfo.uid)?.score || 0
    : 0;
  const girlfriendScore = girlfriendInfo
    ? option.scores?.find(s => s.userId === girlfriendInfo.uid)?.score || 0
    : 0;
  const boyfriendComment = boyfriendInfo
    ? option.scores?.find(s => s.userId === boyfriendInfo.uid)?.comment || ''
    : '';
  const girlfriendComment = girlfriendInfo
    ? option.scores?.find(s => s.userId === girlfriendInfo.uid)?.comment || ''
    : '';

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

  // 상대방 평가 여부
  const partnerHasScored = currentUserId === boyfriendInfo?.uid
    ? girlfriendScore > 0
    : currentUserId === girlfriendInfo?.uid
    ? boyfriendScore > 0
    : false;

  // 의견 존재 여부
  const hasAnyComment = !!(boyfriendComment || girlfriendComment || myComment);

  const handleScoreSelect = async (score) => {
    if (!score || score < 1 || score > 10) return;

    setSavingScore(true);
    try {
      await addScore(decision.tripId, decision.id, option.id, currentUserId, score, commentText);
      setSelectedScore(null);
      setCommentText('');
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

  const handleDecide = () => {
    setConfirmAction('decide');
  };

  const confirmDecide = async () => {
    setConfirmAction(null);
    setDeciding(true);
    try {
      await decideOption(decision.tripId, decision.id, option.id, currentUserId);
      toast.success('확정되었습니다!');
    } catch (error) {
      console.error('Error deciding option:', error);
      toast.error('확정 중 오류가 발생했습니다.');
    } finally {
      setDeciding(false);
    }
  };

  const handleDeleteOption = () => {
    setConfirmAction('delete');
  };

  const confirmDeleteOption = async () => {
    setConfirmAction(null);
    try {
      await deleteOption(decision.tripId, decision.id, option.id);
      toast.success('옵션이 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting option:', error);
      toast.error('옵션 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite(decision.tripId, decision.id, option.id);
      toast.success(option.isFavorite ? '즐겨찾기를 해제했습니다.' : '즐겨찾기했습니다.');
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('즐겨찾기 처리 중 오류가 발생했습니다.');
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
          <div className="dc-title-with-badge">
            {!hasUserScored(option, currentUserId) && (
              <span className="dc-unscored-badge" title="미평가">
                <MdPriorityHigh size={10} />
              </span>
            )}
            <h4 className="dc-title">{option.title}</h4>
          </div>
          {option.price && <p className="dc-price">{option.price}</p>}
        </div>

        {/* 액션 버튼 (즐겨찾기 + 일정추가 + 수정 + 삭제) */}
        <div className="dc-action-buttons">
          <button
            className={`dc-favorite-btn ${option.isFavorite ? 'active' : ''}`}
            onClick={handleToggleFavorite}
            title={option.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
          >
            <MdStar size={16} />
          </button>
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
        <button
          onClick={(e) => handleOpenLink(e, option.url)}
          className="dc-url-link"
          title="링크 열기 (해당 앱으로 이동)"
        >
          {option.url}
        </button>
      )}

      {/* 점수 표시 + 의견 */}
      {(boyfriendScore > 0 || girlfriendScore > 0 || myScore) && (
        <>
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

          {/* 의견 표시 (의견이 있을 때만) */}
          {hasAnyComment && (
            <div className="dc-comments-display">
              {boyfriendComment && (
                <p className="dc-comment-item">
                  <strong>{boyfriendInfo.name}:</strong> {boyfriendComment}
                </p>
              )}
              {girlfriendComment && (
                <p className="dc-comment-item">
                  <strong>{girlfriendInfo.name}:</strong> {girlfriendComment}
                </p>
              )}
              {myComment && !isMyScoreAlreadyShown && (
                <p className="dc-comment-item">
                  <strong>{myNickname}:</strong> {myComment}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* 평가 섹션 (상대방 평가가 있을 때만) */}
      {partnerHasScored && (
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
                  className={`dc-score-option ${selectedScore === score ? 'active' : ''}`}
                  onClick={() => setSelectedScore(score)}
                  disabled={savingScore}
                >
                  {score}
                </button>
              ))}
            </div>

            {/* 의견 입력 (선택사항) */}
            <div className="dc-comment-input-section">
              <textarea
                className="dc-comment-textarea"
                placeholder="의견을 입력해주세요 (선택사항)"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={savingScore}
                maxLength={200}
              />
              <p className="dc-comment-count">{commentText.length}/200</p>
            </div>

            {/* 저장/취소 버튼 */}
            <div className="dc-score-actions">
              <button
                className="dc-score-save"
                onClick={() => handleScoreSelect(selectedScore)}
                disabled={savingScore || !selectedScore}
              >
                {savingScore ? '저장 중...' : '저장'}
              </button>
              <button
                className="dc-score-cancel"
                onClick={() => {
                  setSelectedScore(null);
                  setCommentText('');
                }}
                disabled={savingScore}
              >
                취소
              </button>
            </div>
          </div>
        )}
        </div>
      )}

      {/* 확정 섹션: 이미 확정된 주제는 숨김 */}
      {decision.status !== 'decided' && (
        <div className="dc-decide-section">
          <button
            className="dc-decide-btn"
            onClick={handleDecide}
            disabled={deciding}
          >
            {deciding ? '처리 중...' : '확정하기'}
          </button>
        </div>
      )}

      {/* 수정 모달 */}
      {showEditModal && (
        <EditOptionModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          option={option}
          onSave={handleUpdateOption}
        />
      )}

      <ConfirmModal
        isOpen={confirmAction === 'decide'}
        title="후보 확정"
        message="이 후보로 확정하시겠습니까?"
        confirmText="확정"
        danger={false}
        onConfirm={confirmDecide}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmModal
        isOpen={confirmAction === 'delete'}
        title="옵션 삭제"
        message="이 옵션을 삭제하시겠습니까?"
        confirmText="삭제"
        onConfirm={confirmDeleteOption}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
};

export default DecisionCard;
