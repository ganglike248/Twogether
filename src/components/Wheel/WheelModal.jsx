// src/components/Wheel/WheelModal.jsx
// 돌림판 — 후보 고르기(WheelSelectStep) → 돌리기·결과(WheelSpinStep). v1.0.38에서 앱 톤(종이 카드·주아·파스텔)으로 전면 리디자인.
// 편의 기능: 마지막 후보(직접 적은 것 + 고른 버킷) 기억, 보이는 버킷 전체 선택/해제, 후보 2개 이상일 때만 돌리기,
// 결과 자동 사라짐 없음, "이건 빼고 다시".
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import WheelSelectStep from './WheelSelectStep';
import WheelSpinStep from './WheelSpinStep';
import './WheelModal.css';

const MEMORY_KEY = 'twogether_wheel_last';

const loadMemory = () => {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return { direct: parsed?.direct || [], bucketIds: parsed?.bucketIds || [] };
  } catch {
    return { direct: [], bucketIds: [] };
  }
};

const saveMemory = (direct, bucketIds) => {
  try { localStorage.setItem(MEMORY_KEY, JSON.stringify({ direct, bucketIds })); } catch { /* 기억만 못 함 */ }
};

const WheelModal = ({ isOpen, onClose, bucketList, customCategories }) => {
  const [step, setStep] = useState('select'); // 'select' | 'spin'
  const [directItems, setDirectItems] = useState([]); // [{ id, title, isLocal }]
  const [selectedIds, setSelectedIds] = useState([]); // 버킷 id
  const [excludedIds, setExcludedIds] = useState([]); // "이건 빼고 다시"로 이번 판에서 뺀 후보

  // 열릴 때 지난번 후보 복원(삭제된 버킷은 자동 제외)
  useEffect(() => {
    if (!isOpen) return;
    const mem = loadMemory();
    setDirectItems(mem.direct);
    setSelectedIds(mem.bucketIds);
    setStep('select');
    setExcludedIds([]);
  }, [isOpen]);

  const bucketById = useMemo(() => new Map(bucketList.map(b => [b.id, b])), [bucketList]);
  const selectedBucketItems = selectedIds.map(id => bucketById.get(id)).filter(Boolean);
  const candidates = [...directItems, ...selectedBucketItems];
  const spinCandidates = candidates.filter(c => !excludedIds.includes(c.id));

  // 후보가 바뀔 때마다 기억(존재하는 버킷만)
  useEffect(() => {
    if (!isOpen) return;
    saveMemory(directItems, selectedBucketItems.map(b => b.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, directItems, selectedIds, bucketById]);

  if (!isOpen) return null;

  const addDirect = (title) => {
    const t = title.trim();
    if (!t) return false;
    if (candidates.some(c => c.title === t)) {
      toast.info('이미 담긴 후보예요');
      return false;
    }
    setDirectItems(prev => [...prev, { id: `local_${Date.now()}`, title: t, isLocal: true }]);
    return true;
  };

  const toggleBucket = (id) => setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const setManyBucket = (ids, on) => setSelectedIds(prev => (
    on ? [...new Set([...prev, ...ids])] : prev.filter(x => !ids.includes(x))
  ));

  const goSpin = () => {
    if (candidates.length < 2) {
      toast.info('후보를 2개 이상 담아 주세요');
      return;
    }
    setExcludedIds([]);
    setStep('spin');
  };

  return (
    <div className="wm-overlay" onClick={onClose}>
      <div className="wm-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="돌림판">
        <span className="wm-grabber" aria-hidden="true" />
        {step === 'select' ? (
          <WheelSelectStep
            directItems={directItems}
            onAddDirect={addDirect}
            onRemoveDirect={(id) => setDirectItems(prev => prev.filter(d => d.id !== id))}
            bucketList={bucketList}
            customCategories={customCategories}
            selectedIds={selectedIds}
            onToggleBucket={toggleBucket}
            onSetManyBucket={setManyBucket}
            onClearAll={() => { setDirectItems([]); setSelectedIds([]); }}
            candidateCount={candidates.length}
            onNext={goSpin}
            onClose={onClose}
          />
        ) : (
          <WheelSpinStep
            items={spinCandidates}
            customCategories={customCategories}
            onExclude={(id) => setExcludedIds(prev => [...prev, id])}
            onBack={() => setStep('select')}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
};

export default WheelModal;
