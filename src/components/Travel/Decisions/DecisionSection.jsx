// src/components/Travel/Decisions/DecisionSection.jsx
// 비교 주제(카테고리) 하나 — 소제목 + 후보 카드 가로 스크롤(맨 끝 "＋ 후보 추가" 카드) + 페이지 점.
// 확정된 주제는 확정 후보 한 줄로 접히고, 눌러서 후보 목록을 다시 펼칠 수 있음.
import React, { useState } from 'react';
import { MdAdd, MdClose, MdEdit, MdImage } from 'react-icons/md';
import DecisionCard from './DecisionCard';
import './DecisionSection.css';

const CARD_STEP = 290; // 카드 280px + 간격 10px

const CardRow = ({ decision, options, rankMap, cardProps, actions }) => {
  const [page, setPage] = useState(0);
  const total = options.length + 1; // + "후보 추가" 카드

  const handleScroll = (e) => {
    const next = Math.round(e.currentTarget.scrollLeft / CARD_STEP);
    if (next !== page) setPage(Math.min(next, total - 1));
  };

  return (
    <>
      <div className="dsec-row" onScroll={handleScroll}>
        {options.map(option => (
          <DecisionCard
            key={option.id}
            decision={decision}
            option={option}
            rank={rankMap[option.id]}
            {...cardProps}
          />
        ))}
        <button className="dsec-add-card" onClick={() => actions.addOption(decision)}>
          <span className="dsec-add-icon"><MdAdd /></span>
          후보 추가
        </button>
      </div>
      {total > 1 && (
        <div className="dsec-dots" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`dsec-dot ${i === page ? 'active' : ''} ${i === total - 1 ? 'add' : ''}`}
            />
          ))}
        </div>
      )}
    </>
  );
};

const DecisionSection = ({
  decision,
  options,
  rankMap,
  unscoredCount,
  members,
  currentUserId,
  actions,
  onOpenSheet,
  onAddToSchedule,
}) => {
  const [expanded, setExpanded] = useState(false);
  const isDecided = decision.status === 'decided';
  const decidedOption = isDecided ? (decision.options || []).find(o => o.id === decision.decidedOption) : null;

  const cardProps = { members, currentUserId, actions, onOpenSheet, onAddToSchedule };

  const topicButtons = (
    <>
      <button className="dsec-icon-btn edit" onClick={() => actions.editTopic(decision)} aria-label="주제 수정">
        <MdEdit />
      </button>
      <button className="dsec-icon-btn delete" onClick={() => actions.requestDeleteTopic(decision)} aria-label="주제 삭제">
        <MdClose />
      </button>
    </>
  );

  if (isDecided && decidedOption) {
    return (
      <section className="dsec">
        <div className="dsec-head">
          <span className="dsec-title">{decision.title}</span>
          <span className="dsec-decided-chip">확정</span>
          <span className="dsec-spacer" />
          {topicButtons}
        </div>
        {decision.description && <p className="dsec-desc">{decision.description}</p>}
        <div className="dsec-decided-row">
          <button className="dsec-decided-main" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}>
            {decidedOption.images?.[0]
              ? <img className="dsec-decided-thumb" src={decidedOption.images[0]} alt={decidedOption.title} />
              : <span className="dsec-decided-thumb empty"><MdImage /></span>}
            <span className="dsec-decided-info">
              <span className="dsec-decided-title">{decidedOption.title}</span>
              <span className="dsec-decided-sub">
                {(decidedOption.totalScore || 0) > 0 && `${decidedOption.totalScore} / 20 · `}
                후보 {(decision.options || []).length}개 중 확정
              </span>
            </span>
          </button>
          <button className="dsec-decided-change" onClick={() => actions.undecide(decision)}>변경</button>
        </div>
        {expanded && (
          <CardRow decision={decision} options={options} rankMap={rankMap} cardProps={cardProps} actions={actions} />
        )}
      </section>
    );
  }

  return (
    <section className="dsec">
      <div className="dsec-head">
        <span className="dsec-title">{decision.title}</span>
        {unscoredCount > 0
          ? <span className="dsec-count warn">내 평가 필요 {unscoredCount}</span>
          : <span className="dsec-count">후보 {(decision.options || []).length}</span>}
        <span className="dsec-spacer" />
        {topicButtons}
      </div>
      {decision.description && <p className="dsec-desc">{decision.description}</p>}
      <CardRow decision={decision} options={options} rankMap={rankMap} cardProps={cardProps} actions={actions} />
    </section>
  );
};

export default DecisionSection;
