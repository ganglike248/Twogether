// src/components/Travel/Decisions/OptionDetailSheet.jsx
// 후보 상세 시트 — 카드에서 잘리는 긴 설명·모든 의견을 보여주고, 점수 매기기(슬라이더)도 여기서 함.
// 열림 상태는 TravelDecisionsTab이 URL(?modal=option&d=&o=)로 관리하고 이 컴포넌트는 표시만 담당.
import React, { useState } from 'react';
import { MdClose, MdDeleteOutline, MdEdit, MdInfoOutline, MdPlace, MdStar, MdStarBorder } from 'react-icons/md';
import { getUserComment, getUserScore } from '../../../services/travelDecisionService';
import { handleOpenLink, extractUrl } from '../../../utils/appLinkUtils';
import { formatPriceDisplay } from '../../../utils/numberFormat';
import OptionPhotos, { OptionBadges } from './OptionPhotos';
import OptionScoreBars from './OptionScoreBars';
import { findScore } from './optionScoreUtils';
import ScoreSlider from './ScoreSlider';
import './OptionShared.css';
import './OptionDetailSheet.css';

const COMMENT_MAX = 200;

const OptionDetailSheet = ({
  decision,
  option,
  rank,
  members,
  currentUserId,
  actions,
  startScoring,
  onAddToSchedule,
  onClose,
}) => {
  const myScore = getUserScore(option, currentUserId);
  const [scoring, setScoring] = useState(startScoring || myScore == null);
  const [score, setScore] = useState(myScore);
  const [comment, setComment] = useState(getUserComment(option, currentUserId));
  const [saving, setSaving] = useState(false);
  // 다른 후보로 열릴 때는 부모가 key={option.id}로 새로 마운트하므로 열린 시각도 그때 새로 잡힘
  const [openedAt] = useState(() => Date.now());

  const partnerMember = members.find(m => m.uid !== currentUserId);
  const partnerEntry = partnerMember ? findScore(option, partnerMember.uid) : null;
  const partner = partnerEntry
    ? { name: partnerMember.name, score: partnerEntry.score, color: partnerMember.color }
    : null;

  const linkUrl = extractUrl(option.url);
  const isDecided = decision.status === 'decided';
  const isDecidedOption = isDecided && decision.decidedOption === option.id;
  const linkLabel = /naver/i.test(linkUrl || '') ? '네이버지도에서 열기 ›' : '링크 열기 ›';

  // iOS ghost click이 열리자마자 배경에 떨어져 바로 닫히는 것 방지(캘린더 모달과 같은 300ms 가드)
  const handleOverlayClick = () => {
    if (Date.now() - openedAt < 300) return;
    onClose();
  };

  const startEditScore = () => {
    setScore(myScore);
    setComment(getUserComment(option, currentUserId));
    setScoring(true);
  };

  const handleSaveScore = async () => {
    if (score == null || saving) return;
    setSaving(true);
    const ok = await actions.saveScore(decision, option, score, comment);
    setSaving(false);
    if (ok) setScoring(false);
  };

  return (
    <div className="ods-overlay" onClick={handleOverlayClick}>
      <div className="ods-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={option.title}>
        <div className="ods-topbar">
          <div className="ods-grabber" />
          <button className="ods-close" onClick={onClose} aria-label="닫기">
            <MdClose />
          </button>
        </div>
        <div className="ods-scroll">
          <OptionPhotos
            className="ods-photos"
            images={option.images}
            alt={option.title}
            topLeft={<OptionBadges rank={rank} unscored={myScore == null} />}
          />

          <div className="ods-head">
            <div className="ods-head-text">
              <span className="ods-category">{decision.title}</span>
              <span className="ods-title">{option.title}</span>
              {option.price && <span className="ods-price">{formatPriceDisplay(option.price)}</span>}
            </div>
            <button
              className={`ods-icon-btn fav ${option.isFavorite ? 'on' : ''}`}
              onClick={() => actions.toggleFavorite(decision, option)}
              aria-label={option.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
            >
              {option.isFavorite ? <MdStar /> : <MdStarBorder />}
            </button>
            <button className="ods-icon-btn edit" onClick={() => actions.editOption(decision, option)} aria-label="수정">
              <MdEdit />
            </button>
            <button className="ods-icon-btn delete" onClick={() => actions.requestDeleteOption(decision, option)} aria-label="삭제">
              <MdDeleteOutline />
            </button>
          </div>

          <div className="ods-body">
            {!(option.address || option.url || option.description) && (
              <div className="ods-empty-info">
                <MdInfoOutline />
                <span>주소·설명·링크가 아직 없어요<br /><span className="ods-empty-hint">위의 ✎ 버튼으로 추가할 수 있어요</span></span>
              </div>
            )}
            {option.address && (
              <span className="ods-address"><MdPlace />{option.address}</span>
            )}
            {option.url && (linkUrl ? (
              <a href={linkUrl} className="ods-link" onClick={(e) => handleOpenLink(e, linkUrl)}>
                {option.url} · {linkLabel}
              </a>
            ) : (
              <span className="ods-link plain">{option.url}</span>
            ))}
            {option.description && <div className="ods-desc">{option.description}</div>}

            <div className="ods-score">
              <OptionScoreBars
                option={option}
                members={members}
                currentUserId={currentUserId}
                totalHighlight={rank === 1}
                showComments
                onEditMine={scoring ? undefined : startEditScore}
              />
            </div>

            {scoring && (
              <div className="ods-scoring">
                <ScoreSlider value={score} onChange={setScore} partner={partner} />
                <label className="ods-comment">
                  <span className="ods-sr">의견</span>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX))}
                    placeholder="의견을 입력해주세요 (선택사항)"
                    maxLength={COMMENT_MAX}
                    disabled={saving}
                  />
                  <span className="ods-comment-count">{comment.length} / {COMMENT_MAX}</span>
                </label>
                <div className="ods-scoring-actions">
                  <button
                    className="ods-btn secondary"
                    onClick={() => { setScoring(false); setScore(myScore); }}
                    disabled={saving}
                  >
                    취소
                  </button>
                  <button className="ods-btn primary" onClick={handleSaveScore} disabled={score == null || saving}>
                    {saving ? '저장 중...' : score == null ? '점수를 골라주세요' : `${score}점 저장`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="ods-footer">
          {onAddToSchedule && (
            <button className="ods-btn secondary pink" onClick={() => onAddToSchedule(option)}>일정에 추가</button>
          )}
          {isDecidedOption ? (
            <span className="ods-btn decided">확정됨</span>
          ) : !isDecided ? (
            <button className="ods-btn primary" onClick={() => actions.requestDecide(decision, option)}>확정하기</button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default OptionDetailSheet;
