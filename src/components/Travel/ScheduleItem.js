// src/components/Travel/ScheduleItem.js
import React from 'react';
import './ScheduleItem.css';

const ScheduleItem = ({ schedule, onEdit, onDelete, onToggleComplete }) => {
    const formatTime = (time) => {
        if (!time) return '';
        try {
            const [hours, minutes] = time.split(':');
            return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        } catch (error) {
            return time;
        }
    };

    const handleToggleComplete = () => {
        onToggleComplete(schedule.id);
    };

    const handleEdit = (e) => {
        e.stopPropagation();
        onEdit(schedule);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (window.confirm('이 일정을 삭제하시겠습니까?')) {
            onDelete(schedule.id);
        }
    };

    return (
        <div className={`schedule-item ${schedule.completed ? 'schedule-item-completed' : ''}`}>
            <div className="schedule-item-main" onClick={handleToggleComplete}>
                {schedule.time && (
                    <div className="schedule-item-time">
                        {formatTime(schedule.time)}
                        {schedule.endTime && ` - ${formatTime(schedule.endTime)}`}
                    </div>
                )}

                <div className="schedule-item-actions">
                <button
                    className="schedule-item-edit-btn"
                    onClick={handleEdit}
                    title="수정"
                >
                    ✏️
                </button>
                <button
                    className="schedule-item-delete-btn"
                    onClick={handleDelete}
                    title="삭제"
                >
                    🗑️
                </button>
                <div
                    className={`schedule-item-completion-indicator ${schedule.completed ? 'schedule-item-completed' : ''}`}
                    onClick={handleToggleComplete}
                >
                    {schedule.completed ? '✓' : '○'}
                </div>
            </div>
            </div>

            <div className="schedule-item-content">
                    <h3 className={`schedule-item-title ${schedule.completed ? 'schedule-item-strikethrough' : ''}`}>
                        {schedule.title}
                    </h3>

                    {schedule.description.trim() && (
                        <p className="schedule-item-description">{schedule.description}</p>
                    )}

                    {schedule.location.trim() && (
                        <p className="schedule-item-location">📍 {schedule.location}</p>
                    )}

                    {schedule.cost > 0 && (
                        <p className="schedule-item-cost">💰 {schedule.cost.toLocaleString()}원</p>
                    )}
                </div>

            
        </div>
    );
};

export default ScheduleItem;
