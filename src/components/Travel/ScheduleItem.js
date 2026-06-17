// src/components/Travel/ScheduleItem.js
import React from 'react';
import { MdCheck, MdLocationOn, MdAttachMoney } from 'react-icons/md';
import { HiChevronRight } from 'react-icons/hi2';
import './ScheduleItem.css';

const ScheduleItem = ({ schedule, onEdit, onToggleComplete }) => {
    const formatTime = (time) => {
        if (!time) return '';
        try {
            const [hours, minutes] = time.split(':');
            return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        } catch { return time; }
    };

    return (
        <div
            className={`schedule-item ${schedule.completed ? 'schedule-item-completed' : ''}`}
            onClick={() => onEdit(schedule)}
        >
            <button
                className={`schedule-item-checkbox ${schedule.completed ? 'checked' : ''}`}
                onClick={(e) => { e.stopPropagation(); onToggleComplete(schedule.id); }}
                aria-label={schedule.completed ? '완료 취소' : '완료'}
            >
                {schedule.completed && <MdCheck size={16} />}
            </button>

            <div className="schedule-item-body">
                {schedule.time && (
                    <div className="schedule-item-time">
                        {formatTime(schedule.time)}
                        {schedule.endTime && ` - ${formatTime(schedule.endTime)}`}
                    </div>
                )}
                <h3 className={`schedule-item-title ${schedule.completed ? 'schedule-item-strikethrough' : ''}`}>
                    {schedule.title}
                </h3>
                {(schedule.description || '').trim() && (
                    <p className="schedule-item-description">{schedule.description}</p>
                )}
                {(schedule.location || '').trim() && (
                    <p className="schedule-item-location">
                        <MdLocationOn className="schedule-item-meta-icon" />
                        {schedule.location}
                    </p>
                )}
                {schedule.cost > 0 && (
                    <p className="schedule-item-cost">
                        <MdAttachMoney className="schedule-item-meta-icon" />
                        {schedule.cost.toLocaleString()}원
                    </p>
                )}
            </div>

            <HiChevronRight className="schedule-item-chevron" />
        </div>
    );
};

export default ScheduleItem;
