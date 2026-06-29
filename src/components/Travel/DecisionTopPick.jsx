// src/components/Travel/DecisionTopPick.jsx
import React from 'react';
import { getTopOptions } from '../../services/travelDecisionService';
import { MdArrowForward } from 'react-icons/md';
import './DecisionTopPick.css';

const DecisionTopPick = ({ options, onSelectOption, boyfriendInfo, girlfriendInfo }) => {
  if (!options || options.length === 0) return null;

  const topOptions = getTopOptions(options);

  // 아무도 점수를 매기지 않았으면 표시 안 함
  if (topOptions.length === 0 || topOptions[0].totalScore === 0) {
    return null;
  }

  const handleCardClick = (optionId) => {
    if (onSelectOption) {
      onSelectOption(optionId);
    }
  };

  const getScoresByMember = (option) => {
    const boyfriendScore = boyfriendInfo
      ? option.scores?.find(s => s.userId === boyfriendInfo.uid)?.score || 0
      : 0;
    const girlfriendScore = girlfriendInfo
      ? option.scores?.find(s => s.userId === girlfriendInfo.uid)?.score || 0
      : 0;

    return { boyfriendScore, girlfriendScore };
  };

  return (
    <div className="dtp-container">
      <div className="dtp-label">⭐ 최고 선택</div>
      <div className="dtp-options">
        {topOptions.map(option => (
          <div
            key={option.id}
            className="dtp-card"
            onClick={() => handleCardClick(option.id)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleCardClick(option.id);
            }}
          >
            {/* 왼쪽: 이미지 (1:1 비율) */}
            {option.image && (
              <div className="dtp-image">
                <img src={option.image} alt={option.title} />
              </div>
            )}

            {/* 오른쪽: 정보 */}
            <div className="dtp-info">
              <h5 className="dtp-title">{option.title}</h5>
              {option.price && <p className="dtp-price">{option.price}</p>}
              <div className="dtp-scores">
                <span className="dtp-total-badge">{option.totalScore}/20</span>
                {(() => {
                  const { boyfriendScore, girlfriendScore } = getScoresByMember(option);
                  return (
                    <span className="dtp-member-scores">
                      {boyfriendScore > 0 && `${boyfriendInfo?.name} ${boyfriendScore}`}
                      {boyfriendScore > 0 && girlfriendScore > 0 && ' / '}
                      {girlfriendScore > 0 && `${girlfriendInfo?.name} ${girlfriendScore}`}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* 화살표 아이콘 */}
            <div className="dtp-arrow">
              <MdArrowForward size={16} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DecisionTopPick;
