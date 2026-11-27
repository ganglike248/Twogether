// src/components/Decisions/DecisionWheelSheet.jsx
// 같이 정해요 — 이번 후보로 돌림판 돌리기(하고 싶은 것 돌림판의 돌리기 단계를 그대로 씀).
// [이걸로 정했어요] → onDecide(후보 id) — 확정은 부모가 확인 후 저장(지난 결정에 '돌림판' 표시)
import React, { useState } from 'react';
import WheelSpinStep from '../Wheel/WheelSpinStep';
import '../Wheel/WheelModal.css';
import { useDialog } from '../../hooks/useDialog';

const DecisionWheelSheet = ({ options, onDecide, onClose }) => {
  const dialogRef = useDialog(true, onClose);
  const [excluded, setExcluded] = useState([]);
  const items = options
    .filter((o) => !excluded.includes(o.id))
    .map((o) => ({ id: o.id, title: o.title, isLocal: true }));

  return (
    <div className="wm-overlay" onClick={onClose}>
      <div className="wm-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="돌림판으로 정하기" ref={dialogRef} tabIndex={-1}>
        <span className="wm-grabber" aria-hidden="true" />
        <WheelSpinStep
          items={items}
          customCategories={{}}
          onExclude={(id) => setExcluded((prev) => [...prev, id])}
          onBack={onClose}
          onClose={onClose}
          metaText="이번 후보"
          onDecide={(result) => onDecide(result.id)}
        />
      </div>
    </div>
  );
};

export default DecisionWheelSheet;
