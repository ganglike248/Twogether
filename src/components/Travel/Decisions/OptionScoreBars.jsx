// src/components/Travel/Decisions/OptionScoreBars.jsx
// 두 사람의 점수 막대 — 카드(의견 1줄 요약)와 상세 시트(사람별 의견 전부)에서 공용.
// 색은 커플 색상 설정 CSS 변수(--color-boyfriend / --color-girlfriend)를 그대로 씀.
import React from 'react';
import { MdEdit } from 'react-icons/md';
import { findScore } from './optionScoreUtils';

const OptionScoreBars = ({ option, members, currentUserId, onEditMine, showComments = false, totalHighlight = false }) => (
  <div className="osb">
    <div className="osb-head">
      <span className="osb-label">점수</span>
      <span className={`osb-total ${totalHighlight ? 'highlight' : ''}`}>
        {option.totalScore || 0}<span className="osb-total-max"> / 20</span>
      </span>
    </div>
    <div className="osb-rows">
      {members.map(m => {
        const entry = findScore(option, m.uid);
        const isMine = m.uid === currentUserId;
        return (
          <React.Fragment key={m.uid}>
            <span className="osb-name">{m.name}</span>
            {entry ? (
              <>
                <span className="osb-track">
                  <span className="osb-fill" style={{ width: `${entry.score * 10}%`, background: m.color }} />
                </span>
                <span className="osb-score">{entry.score}</span>
                {isMine && onEditMine ? (
                  <button className="osb-edit" onClick={(e) => { e.stopPropagation(); onEditMine(); }} aria-label="내 점수 변경">
                    <MdEdit />
                  </button>
                ) : <span />}
              </>
            ) : (
              <span className="osb-pending">아직 평가 안 했어요</span>
            )}
            {showComments && entry?.comment && (
              <>
                <span />
                <span className="osb-comment-full">"{entry.comment}"</span>
              </>
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

export default OptionScoreBars;
