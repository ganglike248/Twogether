// src/components/Travel/Decisions/DecisionViewSheet.jsx
// 보기 설정 시트 — 카테고리(비교 주제) 필터·확정만·즐겨찾기만 + 카테고리/후보 정렬.
// 시트 안에서 고른 값은 "적용하기"를 눌러야 반영됨(초기화는 시트 안 값만 기본값으로).
import React, { useState } from 'react';
import { MdCheckCircle, MdStar } from 'react-icons/md';
import { getDecidedCount } from '../../../services/travelDecisionService';
import {
  DEFAULT_VIEW,
  OPTION_SORTS,
  TOPIC_SORTS,
  getUnscoredCount,
} from './decisionViewUtils';
import './DecisionViewSheet.css';

const DecisionViewSheet = ({ decisions, userId, view, onApply, onClose }) => {
  const allIds = decisions.map(d => d.id);
  const [draft, setDraft] = useState({ ...view, topicIds: view.topicIds || allIds });
  const [openedAt] = useState(() => Date.now());

  const set = (patch) => setDraft(prev => ({ ...prev, ...patch }));

  const toggleTopic = (id) => {
    const selected = draft.topicIds.includes(id);
    if (selected && draft.topicIds.length === 1) return; // 최소 하나는 남김
    set({ topicIds: selected ? draft.topicIds.filter(t => t !== id) : [...draft.topicIds, id] });
  };

  const handleApply = () => {
    const allSelected = allIds.every(id => draft.topicIds.includes(id));
    onApply({ ...draft, topicIds: allSelected ? null : draft.topicIds });
  };

  const handleOverlayClick = () => {
    if (Date.now() - openedAt < 300) return;
    onClose();
  };

  return (
    <div className="dvs-overlay" onClick={handleOverlayClick}>
      <div className="dvs-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="보기 설정">
        <div className="dvs-grabber" />
        <div className="dvs-head">
          <span className="dvs-title">보기 설정</span>
          <button className="dvs-reset" onClick={() => setDraft({ ...DEFAULT_VIEW, topicIds: allIds })}>초기화</button>
        </div>

        <div className="dvs-scroll">
          {decisions.length > 0 && (
            <div className="dvs-group">
              <span className="dvs-label">카테고리</span>
              <div className="dvs-chips">
                {decisions.map(d => {
                  const on = draft.topicIds.includes(d.id);
                  const unscored = getUnscoredCount(d, userId);
                  const decided = getDecidedCount(d);
                  return (
                    <button key={d.id} className={`dvs-chip lg ${on ? 'on' : ''}`} onClick={() => toggleTopic(d.id)}>
                      {on && '✓ '}{d.title}
                      {decided > 0 && ` · 확정 ${decided}`}
                      {unscored > 0 && <span className="dvs-chip-warn"> · 평가 {unscored}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="dvs-group">
            <span className="dvs-label">보기</span>
            <label className="dvs-switch-row">
              <span><MdCheckCircle className="dvs-decided-icon" /> 확정한 후보만 보기</span>
              <input
                type="checkbox"
                className="dvs-switch-input"
                checked={draft.decidedOnly}
                onChange={(e) => set({ decidedOnly: e.target.checked })}
              />
              <span className={`dvs-switch ${draft.decidedOnly ? 'on' : ''}`} aria-hidden="true" />
            </label>
            <label className="dvs-switch-row">
              <span><MdStar className="dvs-star" /> 즐겨찾기한 후보만 보기</span>
              <input
                type="checkbox"
                className="dvs-switch-input"
                checked={draft.favoritesOnly}
                onChange={(e) => set({ favoritesOnly: e.target.checked })}
              />
              <span className={`dvs-switch ${draft.favoritesOnly ? 'on' : ''}`} aria-hidden="true" />
            </label>
          </div>

          <div className="dvs-group">
            <span className="dvs-label">카테고리 순서</span>
            <div className="dvs-chips">
              {TOPIC_SORTS.map(s => (
                <button
                  key={s.key}
                  className={`dvs-chip ${draft.topicSort === s.key ? 'on' : ''}`}
                  onClick={() => set({ topicSort: s.key })}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="dvs-group">
            <span className="dvs-label">후보 순서 <span className="dvs-label-hint">· 확정한 후보는 항상 맨 앞</span></span>
            <div className="dvs-chips">
              {OPTION_SORTS.map(s => (
                <button
                  key={s.key}
                  className={`dvs-chip ${draft.optionSort === s.key ? 'on' : ''}`}
                  onClick={() => set({ optionSort: s.key })}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="dvs-footer">
          <button className="dvs-apply" onClick={handleApply}>적용하기</button>
        </div>
      </div>
    </div>
  );
};

export default DecisionViewSheet;
