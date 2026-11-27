// src/components/Calendar/RecurrenceScopeModal.jsx
// 반복 일정의 인스턴스를 수정/삭제할 때 "이 일정만 / 이후 모두 / 전체" 범위를 고르는 확인 모달.
// EventModal.css의 .confirm-card 스타일을 그대로 재사용 (앱 톤 통일).
//
// 범위를 누르는 즉시 실행되지 않고, 먼저 선택(칩처럼 강조 표시)만 하고 "확인"을 눌러야 실제로
// onChoose가 호출됨 — 특히 삭제에서 잘못 눌러 바로 삭제되는 사고를 막기 위한 2단계 확인.
//
// "전체"는 삭제(mode='delete')일 때는 항상 보여줌 — 삭제는 어느 인스턴스에서 골라도
// "시리즈 전부 삭제"라는 의미가 명확해서 애매함이 없음.
// 수정(mode='edit')일 때는 showAllOption이 true일 때만(=진짜 시작 인스턴스를 열었을 때만) 보여줌 —
// 중간 인스턴스에서 "전체 수정"을 고르면 실제로는 그 인스턴스 날짜부터 재계산되는데(과거는 안 건드림),
// "전체"라는 이름과 실제 동작이 안 맞아 헷갈린다는 피드백으로 도입함.
import React, { useState } from 'react';
import { useDialog } from '../../hooks/useDialog';

// movedToLabel: 반복 일정의 날짜를 옮겨 저장하는 경우('11월 18일') — 이때는 '이 일정만'만 고를 수 있음
const RecurrenceScopeModal = ({ mode, showAllOption, instanceDateLabel, movedToLabel = '', onCancel, onChoose }) => {
  const moved = !!movedToLabel;
  const [selected, setSelected] = useState(moved ? 'this' : null);
  const dialogRef = useDialog(true, onCancel);
  const title = mode === 'delete' ? '반복 일정 삭제' : '반복 일정 수정';

  const futureCaption = instanceDateLabel
    ? `${instanceDateLabel}부터 ${mode === 'delete' ? '삭제돼요' : '적용돼요'}`
    : null;

  const options = moved ? [
    { value: 'this', label: '이 일정만', caption: `${instanceDateLabel} → ${movedToLabel}, 다른 일정은 그대로예요` },
    { value: 'future', label: '이 일정 및 향후 모든 일정', caption: '날짜를 바꾸면 고를 수 없어요 — 요일을 바꾸려면 반복 설정에서', disabled: true },
  ] : [
    { value: 'this', label: '이 일정만' },
    { value: 'future', label: '이 일정 및 향후 모든 일정', caption: futureCaption },
    ...(showAllOption ? [{ value: 'all', label: '모든 일정' }] : []),
  ];

  const handleConfirm = () => {
    if (!selected) return;
    onChoose(selected);
  };

  return (
    <div className="modal-overlay">
      <div className="confirm-card" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}>
        <p className="confirm-title">{title}</p>
        <p className="confirm-body">
          {moved ? `날짜를 바꿨어요. 이 일정만 ${movedToLabel}로 옮겨요.` : '반복되는 일정 중 어디까지 적용할까요?'}
        </p>
        <div className="scope-choice-list" role="radiogroup" aria-label="적용 범위">
          {options.map((opt) => (
            <button
              type="button"
              key={opt.value}
              className={`scope-choice-btn ${selected === opt.value ? 'sel' : ''}`}
              onClick={() => setSelected(opt.value)}
              aria-pressed={selected === opt.value}
              disabled={opt.disabled}
            >
              <span className="scope-choice-label">{opt.label}</span>
              {opt.caption && <span className="scope-choice-caption">{opt.caption}</span>}
            </button>
          ))}
        </div>
        <div className="confirm-actions">
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={mode === 'delete' ? 'btn btn-danger' : 'btn btn-primary'}
            disabled={!selected}
          >
            {mode === 'delete' ? '삭제' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecurrenceScopeModal;
