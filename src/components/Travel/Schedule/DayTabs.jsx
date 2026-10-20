// src/components/Travel/Schedule/DayTabs.jsx
// 일자 선택 버튼 — 3일 이하는 가로를 꽉 채우고, 4일 이상이면 고정 폭 카드로 가로 스크롤
import React from 'react';

const FILL_MAX_DAYS = 3;

const DayTabs = ({ tripDays, activeDay, onSelect, getDayDate }) => {
    const days = Array.from({ length: tripDays }, (_, i) => i + 1);
    const isFill = tripDays <= FILL_MAX_DAYS;

    return (
        <div className={`td-days ${isFill ? 'fill' : 'scroll'}`}>
            <div
                className="td-days-track"
                style={isFill ? { gridTemplateColumns: `repeat(${tripDays}, minmax(0, 1fr))` } : undefined}
            >
                {days.map(day => (
                    <button
                        key={day}
                        className={`td-day ${activeDay === day ? 'active' : ''}`}
                        onClick={() => onSelect(day)}
                    >
                        <span className="td-day-label">Day {day}</span>
                        <span className="td-day-date">{getDayDate(day)}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default DayTabs;
