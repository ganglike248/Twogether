// src/components/Calendar/RecurrenceScopeModal.jsx
// 반복 일정의 인스턴스를 수정/삭제할 때 "이 일정만 / 이후 모두 / 전체" 범위를 고르는 확인 모달.
// EventModal.css의 .confirm-card 스타일을 그대로 재사용 (앱 톤 통일).
import React from 'react';

const RecurrenceScopeModal = ({ mode, onCancel, onChoose }) => (
  <div className="modal-overlay">
    <div className="confirm-card">
      <p className="confirm-title">{mode === 'delete' ? '반복 일정 삭제' : '반복 일정 수정'}</p>
      <p className="confirm-body">반복되는 일정 중 어디까지 적용할까요?</p>
      <div className="scope-choice-list">
        <button type="button" className="scope-choice-btn" onClick={() => onChoose('this')}>
          이 일정만
        </button>
        <button type="button" className="scope-choice-btn" onClick={() => onChoose('future')}>
          이 일정 및 향후 모든 일정
        </button>
        <button type="button" className="scope-choice-btn" onClick={() => onChoose('all')}>
          모든 일정
        </button>
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
