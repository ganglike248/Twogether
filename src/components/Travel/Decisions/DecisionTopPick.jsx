// src/components/Travel/DecisionTopPick.jsx
import React from 'react';
import { getTopOptions } from '../../../services/travelDecisionService';
import { MdArrowForward, MdStar } from 'react-icons/md';
import './DecisionTopPick.css';

const DecisionTopPick = ({ options, onSelectOption, boyfriendInfo, girlfriendInfo }) => {
  if (!options || options.length === 0) return null;

  const topOptions = getTopOptions(options);

  // 아무도 점수를 매기지 않았으면 표시 안 함
  if (topOptions.length === 0 || topOptions[0].totalScore === 0) {
    return null;
  }

  // 즐겨찾기된 항목 분리
  const favorites = options.filter(opt => opt.isFavorite);

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

  const getRankLabel = (rank) => {
    const labels = ['🥇 1순위', '🥈 2순위', '🥉 3순위'];
    return labels[rank - 1] || '';
  };

  return (
    <>
      {/* 즐겨찾기된 항목 */}
      {favorites.length > 0 && (
        <>
          <div className="dtp-label">⭐ 즐겨찾기</div>
          <div className="dtp-options">
            {favorites.map(option => (
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
                {option.images?.[0] && (
                  <div className="dtp-image">
                    <img src={option.images[0]} alt={option.title} />
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
        </>
      )}

      {/* 순위별 추천 (1~3순위) */}
      {topOptions.length > 0 && (
        <>
          {Array.from(new Set(topOptions.map(o => o.rank))).map(rank => (
            <div key={`rank-${rank}`}>
              <div className="dtp-label">{getRankLabel(rank)}</div>
              <div className="dtp-options">
                {topOptions.filter(o => o.rank === rank).map(option => (
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
                    {option.images?.[0] && (
                      <div className="dtp-image">
                        <img src={option.images[0]} alt={option.title} />
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
          ))}
        </>
      )}
    </>
  );
};

export default DecisionTopPick;
