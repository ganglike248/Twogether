// src/components/Calendar/MonthPickerSheet.jsx
// 캘린더 제목을 누르면 열리는 "어느 달로 갈까요?" 창 — 연도는 ‹ ›, 달을 누르면 바로 이동(확인 버튼 없음).
// 지금 보는 달은 테두리, 오늘이 있는 달은 글자색, 일정이 있는 달은 점. 열림 상태는 주소(/calendar/month)에서 파생.
import React, { useState } from 'react';
import { useDialog } from '../../hooks/useDialog';
import './MonthPickerSheet.css';

const MONTHS = Array.from({ length: 12 }, (_, i) => i);

const MonthPickerSheet = ({ currentDate, monthsWithEvents, onPick, onToday, onClose }) => {
  const dialogRef = useDialog(true, onClose);
  const [year, setYear] = useState(currentDate.getFullYear());
  const now = new Date();

  return (
    <div className="mps-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mps-sheet" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="달 고르기">
        <div className="mps-grabber" />
        <div className="mps-head">
          <span className="mps-title">어느 달로 갈까요?</span>
          <button type="button" className="mps-close" onClick={onClose} aria-label="닫기">×</button>
        </div>

        <div className="mps-year">
          <button type="button" className="mps-year-btn" onClick={() => setYear((y) => y - 1)} aria-label="이전 해">‹</button>
          <span className="mps-year-text">{year}년</span>
          <button type="button" className="mps-year-btn" onClick={() => setYear((y) => y + 1)} aria-label="다음 해">›</button>
        </div>

        <div className="mps-months">
          {MONTHS.map((m) => {
            const viewing = year === currentDate.getFullYear() && m === currentDate.getMonth();
            const isNow = year === now.getFullYear() && m === now.getMonth();
            const hasEvents = monthsWithEvents.has(`${year}-${m}`);
            return (
              <button
                type="button"
                key={m}
                className={`mps-month${viewing ? ' viewing' : ''}${isNow ? ' now' : ''}`}
                onClick={() => onPick(year, m)}
                aria-current={viewing ? 'date' : undefined}
                aria-label={`${year}년 ${m + 1}월${hasEvents ? ', 일정 있음' : ''}`}
              >
                {m + 1}월
                {hasEvents && <span className="mps-dot" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <button type="button" className="mps-today" onClick={onToday}>오늘로</button>
      </div>
    </div>
  );
};

export default MonthPickerSheet;
