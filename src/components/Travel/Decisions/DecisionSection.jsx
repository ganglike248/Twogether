// src/components/Travel/Decisions/DecisionSection.jsx
// 비교 주제(카테고리) 하나 — 흰 카드 안에 [제목 + 요약 바](누르면 접고 펼침) + 후보 카드 가로 스크롤
// (맨 끝 "＋ 후보 추가" 카드) + 페이지 점. 접힌 상태에서도 바의 요약(후보 수·확정·평가 필요)으로 내용을 가늠할 수 있음.
// 확정은 후보 단위(여러 개 가능) — 확정해도 다른 후보를 숨기지 않고, 확정 후보가 맨 앞에 초록으로 표시됨.
import React, { useState } from 'react';
import { MdAdd, MdClose, MdEdit, MdKeyboardArrowDown } from 'react-icons/md';
import { getDecidedCount } from '../../../services/travelDecisionService';
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
  scheduledDaysByOption,
  open,
  onToggle,
}) => {
  const decidedCount = getDecidedCount(decision);
  const total = (decision.options || []).length;
  const cardProps = { members, currentUserId, actions, onOpenSheet, onAddToSchedule, scheduledDaysByOption };

  // 바 아무 곳이나 누르면 접기/펼치기 — 수정·삭제 버튼은 제외
  const handleBarClick = (e) => {
    if (e.target.closest('.dsec-icon-btn')) return;
    onToggle();
  };

  return (
    <section className={`dsec ${open ? 'open' : ''}`}>
      <div
        className="dsec-bar"
        onClick={handleBarClick}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onToggle(); } }}
      >
        <span className="dsec-bar-text">
          <span className="dsec-title">{decision.title}</span>
          <span className="dsec-summary">
            {total === 0 ? '아직 후보가 없어요' : (
              <>
                후보 {total}
                {decidedCount > 0 && <> · <span className="dsec-summary-ok">확정 {decidedCount}</span></>}
                {unscoredCount > 0
                  ? <> · <span className="dsec-summary-warn">평가 필요 {unscoredCount}</span></>
                  : <> · 평가 다 했어요</>}
              </>
            )}
          </span>
        </span>
        <button className="dsec-icon-btn edit" onClick={() => actions.editTopic(decision)} aria-label="주제 수정">
          <MdEdit />
        </button>
        <button className="dsec-icon-btn delete" onClick={() => actions.requestDeleteTopic(decision)} aria-label="주제 삭제">
          <MdClose />
        </button>
        <MdKeyboardArrowDown className="dsec-chevron" aria-hidden="true" />
      </div>
      {open && (
        <div className="dsec-body">
          {decision.description && <p className="dsec-desc">{decision.description}</p>}
          <CardRow decision={decision} options={options} rankMap={rankMap} cardProps={cardProps} actions={actions} />
        </div>
      )}
    </section>
  );
};

export default DecisionSection;
