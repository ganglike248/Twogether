// src/components/Travel/TravelTimeInput.js
import React, { useState, useEffect } from 'react';
import { MdDirectionsCar } from 'react-icons/md';
import './TravelTimeInput.css';

const TravelTimeInput = ({ fromScheduleId, toScheduleId, initialTravelTime, onSave }) => {
    const [travelTime, setTravelTime] = useState(initialTravelTime || '');
    const [isEditing, setIsEditing] = useState(false);
    const [tempTime, setTempTime] = useState('');

    useEffect(() => {
        setTravelTime(initialTravelTime || '');
    }, [initialTravelTime]);

    const handleStartEdit = () => {
        setTempTime(travelTime);
        setIsEditing(true);
    };

    const handleSave = () => {
        onSave(fromScheduleId, toScheduleId, tempTime);
        setTravelTime(tempTime);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setTempTime('');
        setIsEditing(false);
    };

    const handleDelete = () => {
        onSave(fromScheduleId, toScheduleId, '');
        setTravelTime('');
    };

    // 타임라인 선 위에 놓이는 이동 구간 — 자동차 동그라미가 선을 가리고 옆에 시간만 적음
    return (
        <div className="tl-travel">
            {isEditing ? (
                <>
                    <span className="tl-travel-icon" aria-hidden="true"><MdDirectionsCar /></span>
                    <div className="tl-travel-edit">
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
                        <button onClick={handleCancel} className="tl-travel-cancel">취소</button>
                    </div>
                </>
            ) : travelTime ? (
                <>
                    <button className="tl-travel-icon" onClick={handleStartEdit} aria-label="이동 시간 수정">
                        <MdDirectionsCar />
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
