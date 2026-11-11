// src/components/Wheel/WheelSelectStep.jsx
// 돌림판 1단계 — 직접 적기 + 버킷리스트에서 담기. 카테고리 색은 버킷리스트와 같은 원색(getCategoryColor).
import React, { useState } from 'react';
import { MdClose, MdAdd, MdCheck } from 'react-icons/md';
import { getCategoryColor, getCategoryDisplayName, DEFAULT_CATEGORIES } from '../../services/categoryColorService';

const WheelSelectStep = ({
  directItems, onAddDirect, onRemoveDirect,
  bucketList, customCategories, selectedIds, onToggleBucket, onSetManyBucket, onClearAll,
  candidateCount, onNext, onClose,
}) => {
  const [input, setInput] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [category, setCategory] = useState('all');

  const allCategories = { ...DEFAULT_CATEGORIES, ...customCategories };
  const byStatus = bucketList.filter(b => !!b.completed === showCompleted);
  const usedCats = [...new Set(byStatus.map(b => b.category).filter(c => c && allCategories[c]))];
  const visible = category === 'all' ? byStatus : byStatus.filter(b => b.category === category);
  const visibleIds = visible.map(b => b.id);
  const allVisibleSelected = visible.length > 0 && visibleIds.every(id => selectedIds.includes(id));

  const submit = (e) => {
    e.preventDefault();
    if (onAddDirect(input)) setInput('');
  };

  return (
    <>
      <div className="wm-head">
        <div className="wm-head-text">
          <h2 className="wm-title">오늘 뭐 할까?</h2>
          <p className="wm-sub">후보를 담고 돌려서 정해요</p>
        </div>
        <button type="button" className="wm-icon-btn" onClick={onClose} aria-label="닫기"><MdClose /></button>
      </div>

      <div className="wm-body">
        <section className="wm-section">
          <div className="wm-section-head">
            <span className="wm-label">직접 적기</span>
            {candidateCount > 0 && (
              <button type="button" className="wm-text-btn" onClick={onClearAll}>후보 모두 비우기</button>
            )}
          </div>
          <form className="wm-input-row" onSubmit={submit}>
            <input
              className="wm-input"
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="예: 성수동 소품샵 구경"
              maxLength={30}
              enterKeyHint="done"
            />
            <button type="submit" className="wm-add-btn" aria-label="후보 추가" disabled={!input.trim()}><MdAdd /></button>
          </form>
          {directItems.length > 0 && (
            <div className="wm-chips">
              {directItems.map(d => (
                <span key={d.id} className="wm-chip">
                  {d.title}
                  <button type="button" onClick={() => onRemoveDirect(d.id)} aria-label={`${d.title} 빼기`}><MdClose /></button>
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="wm-section">
          <div className="wm-section-head">
            <span className="wm-label">버킷리스트에서 담기</span>
            <div className="wm-segment" role="tablist" aria-label="버킷 상태">
              <button type="button" role="tab" aria-selected={!showCompleted} className={!showCompleted ? 'on' : ''} onClick={() => { setShowCompleted(false); setCategory('all'); }}>예정</button>
              <button type="button" role="tab" aria-selected={showCompleted} className={showCompleted ? 'on' : ''} onClick={() => { setShowCompleted(true); setCategory('all'); }}>완료</button>
            </div>
          </div>

          {usedCats.length > 0 && (
            <div className="wm-cats">
              <button type="button" className={`wm-cat${category === 'all' ? ' on' : ''}`} onClick={() => setCategory('all')}>전체</button>
              {usedCats.map(c => (
                <button key={c} type="button" className={`wm-cat${category === c ? ' on' : ''}`} onClick={() => setCategory(c)}>
                  {getCategoryDisplayName(c, customCategories)}
                </button>
              ))}
            </div>
          )}

          {visible.length > 0 ? (
            <div className="wm-list">
              <button type="button" className="wm-select-all" onClick={() => onSetManyBucket(visibleIds, !allVisibleSelected)}>
                {allVisibleSelected ? '보이는 항목 모두 해제' : `보이는 ${visible.length}개 모두 담기`}
              </button>
              {visible.map(b => {
                const on = selectedIds.includes(b.id);
                return (
                  <button key={b.id} type="button" className={`wm-row${on ? ' on' : ''}`} onClick={() => onToggleBucket(b.id)} aria-pressed={on}>
                    <span className={`wm-check${on ? ' on' : ''}`} aria-hidden="true">{on && <MdCheck />}</span>
                    <span className="wm-row-title">{b.title}</span>
                    {b.category && allCategories[b.category] && (
                      <span className="wm-tag" style={{ background: getCategoryColor(b.category, customCategories) }}>
                        {getCategoryDisplayName(b.category, customCategories)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="wm-empty">{showCompleted ? '완료한 버킷이 없어요' : '담을 버킷이 없어요 — 직접 적어 보세요'}</p>
          )}
        </section>
      </div>

      <div className="wm-footer">
        <button type="button" className="wm-primary" onClick={onNext} disabled={candidateCount < 2}>
          {candidateCount < 2 ? '후보를 2개 이상 담아 주세요' : `후보 ${candidateCount}개로 돌리기`}
        </button>
      </div>
    </>
  );
};

export default WheelSelectStep;
