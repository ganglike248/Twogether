// src/components/Travel/TravelTimeInput.js
import React, { useState, useEffect } from 'react';
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

    return (
        <div className="travel-time-container">
            <div className="travel-time-line"></div>

            {isEditing ? (
                <div className="travel-time-edit">
                    <input
                        type="text"
                        value={tempTime}
                        onChange={(e) => setTempTime(e.target.value)}
                        placeholder="예: 30분, 1시간"
                        className="travel-time-input"
                        autoFocus
                    />
                    <div className="travel-time-actions">
                        <button onClick={handleSave} className="travel-time-save-btn">
                            저장
                        </button>
                        <button onClick={handleCancel} className="travel-time-cancel-btn">
                            취소
                        </button>
                    </div>
                </div>
            ) : travelTime ? (
                <div className="travel-time-display" onClick={handleStartEdit}>
                    <span className="travel-time-icon">🚗</span>
                    <span className="travel-time-text">{travelTime}</span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete();
                        }}
                        className="travel-time-delete-travel-time-btn"
                    >
                        ×
                    </button>
                </div>
            ) : (
                <button className="travel-time-add-travel-time-btn" onClick={handleStartEdit}>
                    + 이동 시간 입력
                </button>
            )}
            <div className="travel-time-line"></div>
        </div>
    );
};

export default TravelTimeInput;
