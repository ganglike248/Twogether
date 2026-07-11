// src/components/SealedMessages/UnlockTimePicker.jsx
// 자동 공개 스케줄 함수(checkSealedMessages)가 15분마다(0/15/30/45분)만 돌기 때문에, 그 외의 분(예: 34분)으로
// 예약해도 최대 14분까지 밀려서 열림. 애초에 스케줄과 맞는 시각만 고를 수 있게 분 선택지를 제한함.
import React from 'react';
import './sealed-message-modal.css';

const MINUTE_OPTIONS = ['00', '15', '30', '45'];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

// 과거 데이터 등 15분 단위가 아닌 값이 들어와도 선택 UI에는 가장 가까운 15분 단위로 스냅
const snapMinute = (min) => {
  const n = parseInt(min, 10);
  if (Number.isNaN(n)) return '00';
  return String(Math.min(Math.round(n / 15) * 15, 45)).padStart(2, '0');
};

// value/onChange는 datetime-local과 동일한 'YYYY-MM-DDTHH:mm' 로컬 문자열 포맷을 그대로 사용
const UnlockTimePicker = ({ value, onChange }) => {
  const [datePart, timePart] = value ? value.split('T') : ['', ''];
  const [rawHour, rawMinute] = timePart ? timePart.split(':') : [];
  const hourPart = rawHour || '00';
  const minutePart = snapMinute(rawMinute ?? '0');

  const emit = (date, hour, minute) => {
    onChange(date ? `${date}T${hour}:${minute}` : '');
  };

  return (
    <div className="sm-time-picker">
      <input
        className="sm-modal-input sm-time-picker-date"
        type="date"
        value={datePart}
        onChange={(e) => emit(e.target.value, hourPart, minutePart)}
      />
      <select
        className="sm-modal-input sm-time-picker-select"
        value={hourPart}
        onChange={(e) => emit(datePart, e.target.value, minutePart)}
      >
        {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}시</option>)}
      </select>
      <select
        className="sm-modal-input sm-time-picker-select"
        value={minutePart}
        onChange={(e) => emit(datePart, hourPart, e.target.value)}
      >
        {MINUTE_OPTIONS.map((m) => <option key={m} value={m}>{m}분</option>)}
      </select>
    </div>
  );
};

export default UnlockTimePicker;
