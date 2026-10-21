// src/components/Travel/Decisions/DecisionCard.jsx
// 후보 카드(가로 스크롤 한 장) — 사진·배지·즐겨찾기, 제목·가격·⋯메뉴, 주소·설명(3줄)·링크,
// 점수 막대 + 의견 한 줄, 하단 [일정에 추가] [평가하기 | 확정하기 | ✓ 확정됨].
// 확정은 후보마다 따로(여러 개 가능) — 확정된 카드는 초록 테두리 + "✓ 확정" 배지, 섹션 맨 앞에 정렬됨.
// 실제 동작은 useDecisionActions의 actions로 위임하고, 긴 내용/점수 매기기는 상세 시트로 엶.
import React, { useEffect, useRef, useState } from 'react';
import { MdInfoOutline, MdMoreHoriz, MdPlace, MdStar, MdStarBorder } from 'react-icons/md';
import { hasUserScored, isOptionDecided } from '../../../services/travelDecisionService';
import { handleOpenLink, extractUrl } from '../../../utils/appLinkUtils';
import { formatPriceDisplay } from '../../../utils/numberFormat';
import OptionPhotos, { OptionBadges } from './OptionPhotos';
import OptionScoreBars from './OptionScoreBars';
import { pickCommentLine } from './optionScoreUtils';
import ScheduledDaysChip from './ScheduledDaysChip';
import './OptionShared.css';
import './DecisionCard.css';

const DecisionCard = ({
  decision, option, rank, members, currentUserId, actions, onOpenSheet, onAddToSchedule, scheduledDaysByOption,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const myScored = hasUserScored(option, currentUserId);
  const decided = isOptionDecided(decision, option);
  const scheduledDays = scheduledDaysByOption?.[option.id];
  const linkUrl = extractUrl(option.url);
  const commentLine = pickCommentLine(option, members, currentUserId);

  // ⋯ 메뉴 바깥을 누르면 닫기
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  const openSheet = (opts) => onOpenSheet(decision, option, opts);
  const hasDetails = !!(option.address || option.description || option.url);

  // 카드 아무 곳이나 누르면 상세 시트 — 단, 카드 안의 버튼/링크를 누른 경우는 그 동작만
  const handleCardClick = (e) => {
    if (e.target.closest('button, a, input, textarea')) return;
    openSheet();
  };

  return (
    <div className={`dcard ${decided ? 'decided' : rank === 1 ? 'top' : ''}`} onClick={handleCardClick}>
      <OptionPhotos
        images={option.images}
        alt={option.title}
        topLeft={<OptionBadges rank={rank} unscored={!myScored} decided={decided} />}
        topRight={(
          <button
            className={`op-fav ${option.isFavorite ? 'on' : ''}`}
            onClick={() => actions.toggleFavorite(decision, option)}
            aria-label={option.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
          >
            {option.isFavorite ? <MdStar /> : <MdStarBorder />}
          </button>
        )}
      />

      <div className="dcard-body">
        <div className="dcard-head">
          <div className="dcard-title-btn">
            <span className="dcard-title">{option.title}</span>
            {option.price && <span className="dcard-price">{formatPriceDisplay(option.price)}</span>}
            <ScheduledDaysChip days={scheduledDays} />
          </div>
          <div className="dcard-menu-wrap" ref={menuRef}>
            <button className="dcard-more" onClick={() => setMenuOpen(v => !v)} aria-label="더보기 메뉴">
              <MdMoreHoriz />
            </button>
            {menuOpen && (
              <div className="dcard-menu">
                <button onClick={() => { setMenuOpen(false); actions.editOption(decision, option); }}>수정</button>
                <button className="danger" onClick={() => { setMenuOpen(false); actions.requestDeleteOption(decision, option); }}>삭제</button>
              </div>
            )}
          </div>
        </div>

        {!hasDetails && (
          <div className="dcard-empty-info">
            <MdInfoOutline />
            <span>주소·설명·링크가 아직 없어요<br /><span className="dcard-empty-hint">⋯ 메뉴의 수정에서 추가할 수 있어요</span></span>
          </div>
        )}

        {option.address && (
          <span className="dcard-address"><MdPlace />{option.address}</span>
        )}

        {option.description && (
          <div className="dcard-desc-box">
            <span className="dcard-desc">{option.description}</span>
            <button className="dcard-desc-more" onClick={() => openSheet()}>전체 보기 ›</button>
          </div>
        )}

        {option.url && (linkUrl ? (
          <a href={linkUrl} className="dcard-link" onClick={(e) => handleOpenLink(e, linkUrl)}>링크 · {option.url}</a>
        ) : (
          <span className="dcard-link plain">링크 · {option.url}</span>
        ))}

        <div className="dcard-score">
          <OptionScoreBars
            option={option}
            members={members}
            currentUserId={currentUserId}
            totalHighlight={rank === 1}
            onEditMine={() => openSheet({ score: true })}
          />
          {commentLine && (
            <span className="dcard-comment">{commentLine.name} · "{commentLine.comment}"</span>
          )}
        </div>

        <div className="dcard-actions">
          {onAddToSchedule && (
            <button className="dcard-btn secondary" onClick={() => onAddToSchedule(decision, option)}>일정에 추가</button>
          )}
          {decided ? (
            <button className="dcard-btn decided" onClick={() => actions.toggleDecided(decision, option)}>✓ 확정됨</button>
          ) : !myScored ? (
            <button className="dcard-btn primary" onClick={() => openSheet({ score: true })}>평가하기</button>
          ) : (
            <button className="dcard-btn primary" onClick={() => actions.toggleDecided(decision, option)}>확정하기</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DecisionCard;
