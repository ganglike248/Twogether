// src/components/Calendar/RecurrenceScopeModal.jsx
// 반복 일정의 인스턴스를 수정/삭제할 때 "이 일정만 / 이후 모두 / 전체" 범위를 고르는 확인 모달.
// EventModal.css의 .confirm-card 스타일을 그대로 재사용 (앱 톤 통일).
//
// "전체"는 삭제(mode='delete')일 때는 항상 보여줌 — 삭제는 어느 인스턴스에서 골라도
// "시리즈 전부 삭제"라는 의미가 명확해서 애매함이 없음.
// 수정(mode='edit')일 때는 showAllOption이 true일 때만(=진짜 시작 인스턴스를 열었을 때만) 보여줌 —
// 중간 인스턴스에서 "전체 수정"을 고르면 실제로는 그 인스턴스 날짜부터 재계산되는데(과거는 안 건드림),
// "전체"라는 이름과 실제 동작이 안 맞아 헷갈린다는 피드백으로 도입함.
import React from 'react';

const RecurrenceScopeModal = ({ mode, showAllOption, instanceDateLabel, onCancel, onChoose }) => (
  <div className="modal-overlay">
    <div className="confirm-card">
      <p className="confirm-title">{mode === 'delete' ? '반복 일정 삭제' : '반복 일정 수정'}</p>
      <p className="confirm-body">반복되는 일정 중 어디까지 적용할까요?</p>
      <div className="scope-choice-list">
        <button type="button" className="scope-choice-btn" onClick={() => onChoose('this')}>
          <span className="scope-choice-label">이 일정만</span>
        </button>
        <button type="button" className="scope-choice-btn" onClick={() => onChoose('future')}>
          <span className="scope-choice-label">이 일정 및 향후 모든 일정</span>
          {instanceDateLabel && (
            <span className="scope-choice-caption">
              {instanceDateLabel}부터 {mode === 'delete' ? '삭제돼요' : '적용돼요'}
            </span>
          )}
        </button>
        {showAllOption && (
          <button type="button" className="scope-choice-btn" onClick={() => onChoose('all')}>
            <span className="scope-choice-label">모든 일정</span>
          </button>
        )}
      </div>
      <div className="confirm-actions">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          취소
        </button>
      </div>
    </div>
  </div>
);

export default RecurrenceScopeModal;
