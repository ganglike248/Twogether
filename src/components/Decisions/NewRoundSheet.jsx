// src/components/Decisions/NewRoundSheet.jsx
// 새로 정하기 — 지난 후보를 체크된 채로 보여 주고(뺄 건 체크 해제), 새 후보 이름도 바로 더함.
// 불러온 후보는 사진·링크·가격은 그대로, 평가는 새로(freshOption).
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useDialog } from '../../hooks/useDialog';
import { carryOverCandidates, freshOption } from '../../services/decisions/dailyDecisionLogic';
import { newOptionId } from '../../services/decisions/dailyDecisionService';

const NewRoundSheet = ({ history, onStart, onClose }) => {
  const dialogRef = useDialog(true, onClose);
  const [items, setItems] = useState(() => carryOverCandidates(history));
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (key) => setItems((prev) => prev.map((it) => (it.key === key ? { ...it, checked: !it.checked } : it)));

  const addName = () => {
    const t = name.trim();
    if (!t) return;
    const key = t.toLowerCase();
    if (items.some((it) => it.key === key)) {
      setItems((prev) => prev.map((it) => (it.key === key ? { ...it, checked: true } : it)));
      toast.info('이미 있는 후보라 체크했어요.');
    } else {
      setItems((prev) => [...prev, { key, option: { title: t }, checked: true, note: '새 후보' }]);
    }
    setName('');
  };

  const count = items.filter((it) => it.checked).length;

  const start = async () => {
    if (saving) return;
    setSaving(true);
    const ok = await onStart(items.filter((it) => it.checked).map((it) => freshOption(it.option, newOptionId())));
    if (!ok) setSaving(false);
  };

  return (
    <div className="dcs-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dcs-sheet" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="새로 정하기">
        <div className="dcs-grabber" />
        <div className="dcs-head">
          <span className="dcs-title">새로 정하기</span>
          <button type="button" className="dcs-close" onClick={onClose} aria-label="닫기">×</button>
        </div>
        <p className="dcs-desc">
          {items.length > 0 ? '지난 후보를 그대로 쓸 수 있어요. 뺄 건 체크를 풀어 주세요.' : '후보를 적어 주세요. 나중에 사진·링크도 더할 수 있어요.'}
        </p>
        <div className="dcs-list">
          {items.map((it) => (
            <button
              type="button"
              key={it.key}
              className={`dcs-check ${it.checked ? 'on' : ''}`}
              onClick={() => toggle(it.key)}
              aria-pressed={it.checked}
            >
              <span className="dcs-box" aria-hidden="true">{it.checked ? '✓' : ''}</span>
              <span className="dcs-check-title">{it.option.title}</span>
              {it.note && <span className="dcs-check-note">{it.note}</span>}
            </button>
          ))}
        </div>
        <div className="dcs-add-row">
          <label className="dcs-sr" htmlFor="dcs-new-name">새 후보 이름</label>
          <input
            id="dcs-new-name"
            className="dcs-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addName(); } }}
            placeholder="새 후보 이름"
            maxLength={60}
          />
          <button type="button" className="dcs-btn small" onClick={addName} disabled={!name.trim()}>추가</button>
        </div>
        <div className="dcs-actions">
          <button type="button" className="dcs-btn" onClick={onClose} disabled={saving}>취소</button>
          <button type="button" className="dcs-btn primary" onClick={start} disabled={saving}>
            {saving ? '시작하는 중...' : count > 0 ? `후보 ${count}개로 시작` : '빈 채로 시작'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewRoundSheet;
