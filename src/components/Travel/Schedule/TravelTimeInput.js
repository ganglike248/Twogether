// src/components/Travel/Schedule/TravelTimeInput.js
// 일정 사이 이동 구간 — 이동 수단(자동차·도보·대중교통) 동그라미가 타임라인 선을 가리고 옆에 시간만 적음.
// 수단은 수정 중에 고름(저장할 때 같이 저장, 예전 기록은 자동차).
import React, { useState } from 'react';
import { MdDirectionsCar, MdDirectionsWalk, MdDirectionsTransit } from 'react-icons/md';
import './TravelTimeInput.css';

const MODES = [
    { key: 'car', label: '자동차', Icon: MdDirectionsCar },
    { key: 'walk', label: '도보', Icon: MdDirectionsWalk },
    { key: 'transit', label: '대중교통', Icon: MdDirectionsTransit },
];
const modeOf = (key) => MODES.find(m => m.key === key) || MODES[0];

const TravelTimeInput = ({ fromScheduleId, toScheduleId, initialTravelTime, initialMode = 'car', onSave }) => {
    const travelTime = initialTravelTime || '';
    const [isEditing, setIsEditing] = useState(false);
    const [tempTime, setTempTime] = useState('');
    const [tempMode, setTempMode] = useState('car');
    const { Icon, label } = modeOf(isEditing ? tempMode : initialMode);

    const handleStartEdit = () => {
        setTempTime(travelTime);
        setTempMode(modeOf(initialMode).key);
        setIsEditing(true);
    };

    const handleSave = () => {
        onSave(fromScheduleId, toScheduleId, tempTime, tempMode);
        setIsEditing(false);
    };

    const handleDelete = () => onSave(fromScheduleId, toScheduleId, '', 'car');

    return (
        <div className="tl-travel">
            {isEditing ? (
                <>
                    <span className="tl-travel-icon" aria-hidden="true"><Icon /></span>
                    <div className="tl-travel-edit">
                        <div className="tl-travel-modes" role="radiogroup" aria-label="이동 수단">
                            {MODES.map(m => (
                                <button
                                    key={m.key}
                                    type="button"
                                    role="radio"
                                    aria-checked={tempMode === m.key}
                                    aria-label={m.label}
                                    title={m.label}
                                    className={tempMode === m.key ? 'on' : ''}
                                    onClick={() => setTempMode(m.key)}
                                >
                                    <m.Icon />
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            value={tempTime}
                            onChange={(e) => setTempTime(e.target.value)}
                            placeholder="예: 30분, 1시간"
                            className="tl-travel-input"
                            aria-label="이동 시간"
                            autoFocus
                        />
                        <button onClick={handleSave} className="tl-travel-save">저장</button>
                        <button onClick={() => setIsEditing(false)} className="tl-travel-cancel">취소</button>
                    </div>
                </>
            ) : travelTime ? (
                <>
                    <button className="tl-travel-icon" onClick={handleStartEdit} aria-label={`이동 시간 수정 (${label})`}>
                        <Icon />
                    </button>
                    <span className="tl-travel-display">
                        <button className="tl-travel-text" onClick={handleStartEdit}>{travelTime}</button>
                        <button className="tl-travel-delete" onClick={handleDelete} aria-label="이동 시간 삭제">×</button>
                    </span>
                </>
            ) : (
                <>
                    <button className="tl-travel-icon add" onClick={handleStartEdit} aria-label="이동 시간 추가">＋</button>
                    <span className="tl-travel-display">
                        <button className="tl-travel-text add" onClick={handleStartEdit}>이동 시간</button>
                    </span>
                </>
            )}
        </div>
    );
};

export default TravelTimeInput;
