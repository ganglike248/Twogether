// src/components/Calendar/RecurrenceFields.jsx
// EventModal 안에 삽입되는 반복 규칙 입력 UI (프리셋 + 요일 다중선택 + 종료조건).
// 프리뷰/50개 상한 계산은 EventModal이 담당하고, 이 컴포넌트는 순수 입력 UI + 계산된 preview 표시만 함.
// 섹션마다 sheet-date-micro와 같은 소제목을 붙이고, 선택 요소는 전부 칩(버튼) 스타일로 통일함
// (네이티브 라디오를 쓰면 이 모달의 다른 토글/유형 선택 UI와 톤이 안 맞아서 전부 칩으로 교체).
import React, { useEffect, useRef, useState } from 'react';
import { WEEKDAY_LABELS } from '../../utils/recurrenceRules';

const FREQ_OPTIONS = [
  { value: 'daily', label: '매일' },
  { value: 'weekly', label: '매주' },
  { value: 'monthly', label: '매월' },
  { value: 'yearly', label: '매년' },
];

const INTERVAL_UNIT = { daily: '일마다', weekly: '주마다', monthly: '개월마다', yearly: '년마다' };

const END_TYPE_OPTIONS = [
  { value: 'date', label: '날짜까지' },
  { value: 'count', label: '횟수만큼' },
];

// "횟수만큼" 선택 시 기본 횟수 — 매주 반복이고 요일을 골랐으면 "주기(n주) × 요일 수(m)"로
// 한 주기(간격) 분량을 기본값으로 잡음(예: 2주마다 월화수목 → 2×4=8). 그 외(매일/매월/매년,
// 또는 아직 요일 미선택)에는 딱히 곱할 대상이 없으니 1로 시작.
const computeDefaultCount = (value) => {
  if (value.freq === 'weekly' && value.byWeekday?.length > 0) {
    return Math.max(1, value.interval) * value.byWeekday.length;
  }
  return 1;
};

const RecurrenceFields = ({ value, onChange, startDate, disabled, preview }) => {
  const update = (patch) => onChange({ ...value, ...patch });

  // 사용자가 횟수 입력칸을 직접 건드렸는지 — 건드리기 전까지는 간격/요일이 바뀔 때마다
  // computeDefaultCount로 실시간 재계산해서 따라가고, 한 번이라도 직접 입력하면 그 뒤로는
  // 자동 재계산이 사용자가 쓴 값을 덮어쓰지 않도록 멈춤("횟수만큼"을 다시 선택하면 리셋됨).
  const [countTouched, setCountTouched] = useState(false);
  // 마운트 직후 첫 effect 실행은 건너뜀 — 안 그러면 이미 반복 중인 일정을 열었을 때(예: 예전에
  // 직접 5회로 저장해둔 것) 열자마자 자동 계산값으로 덮어써버리는 버그가 생김. 이후 사용자가
  // 실제로 간격/요일을 바꿔서 발생하는 재실행부터만 실시간 반영함.
  const isFirstRun = useRef(true);

  const byWeekdayKey = (value.byWeekday || []).join(',');
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (value.endType !== 'count' || countTouched) return;
    const next = computeDefaultCount(value);
    if (next !== value.count) {
      onChange({ ...value, count: next });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.endType, value.freq, value.interval, byWeekdayKey, countTouched]);

  const toggleWeekday = (d) => {
    const cur = value.byWeekday || [];
    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d];
    update({ byWeekday: next.sort((a, b) => a - b) });
  };

  return (
    <div className="recur-panel">
      <div className="recur-section">
        <span className="recur-section-label">반복 주기</span>
        <div className="recur-freq-row" role="radiogroup" aria-label="반복 주기">
          {FREQ_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              className={`recur-chip ${value.freq === opt.value ? 'sel' : ''}`}
              onClick={() => update({ freq: opt.value, byWeekday: opt.value === 'weekly' ? value.byWeekday : null })}
              disabled={disabled}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="recur-section">
        <span className="recur-section-label">반복 간격</span>
        <div className="recur-interval-row">
          <input
            type="number"
            className="recur-interval-input"
            min={1}
            max={99}
            value={value.interval}
            onChange={(e) => update({ interval: Math.max(1, Number(e.target.value) || 1) })}
            disabled={disabled}
            aria-label="반복 간격"
          />
          <span className="recur-unit">{INTERVAL_UNIT[value.freq]}</span>
        </div>
      </div>

      {value.freq === 'weekly' && (
        <div className="recur-section">
          <span className="recur-section-label">요일</span>
          <div className="recur-weekday-row" role="group" aria-label="반복 요일">
            {WEEKDAY_LABELS.map((label, idx) => (
              <button
                type="button"
                key={label}
                className={`recur-weekday-chip ${(value.byWeekday || []).includes(idx) ? 'sel' : ''}`}
                onClick={() => toggleWeekday(idx)}
                disabled={disabled}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="recur-section">
        <span className="recur-section-label">종료 조건</span>
        <div className="recur-freq-row" role="radiogroup" aria-label="종료 조건">
          {END_TYPE_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              className={`recur-chip ${value.endType === opt.value ? 'sel' : ''}`}
              onClick={() => {
                if (opt.value === 'count') {
                  setCountTouched(false);
                  update({ endType: 'count', count: computeDefaultCount(value) });
                } else {
                  update({ endType: opt.value });
                }
              }}
              disabled={disabled}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {value.endType === 'date' ? (
          <input
            type="date"
            className="recur-end-date-input"
            value={value.until}
            min={startDate}
            onChange={(e) => update({ until: e.target.value })}
            disabled={disabled}
            aria-label="반복 종료일"
          />
        ) : (
          <div className="recur-count-row">
            <input
              type="number"
              className="recur-count-input"
              min={1}
              max={50}
              value={value.count}
              onChange={(e) => {
                setCountTouched(true);
                update({ count: Math.max(1, Number(e.target.value) || 1) });
              }}
              disabled={disabled}
              aria-label="반복 횟수"
            />
            <span className="recur-unit">회</span>
          </div>
        )}
      </div>

      {preview?.error ? (
        <p className="recur-error-text">{preview.error}</p>
      ) : preview?.count > 0 ? (
        <p className="recur-preview-text">총 {preview.count}개의 일정이 생성돼요 (최대 50개)</p>
      ) : null}
    </div>
  );
};

export default RecurrenceFields;
