// src/components/Travel/TripCard.js
import React, { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import './TripCard.css';
import { useTripSchedules } from '../../hooks/useTrip';

const TripCard = ({ trip, onView, onEdit, onDelete }) => {
    const [usedBudget, setUsedBudget] = useState(0);
    const { schedules } = useTripSchedules(trip.id);

    const formatDate = (dateString) => {
        try {
            if (dateString?.toDate) {
                return format(dateString.toDate(), 'yyyy.MM.dd', { locale: ko });
            }
            return format(new Date(dateString), 'yyyy.MM.dd', { locale: ko });
        } catch (error) {
            return dateString;
        }
    };

    const getDuration = () => {
        try {
            const startDate = trip.startDate?.toDate ? trip.startDate.toDate() : new Date(trip.startDate);
            const endDate = trip.endDate?.toDate ? trip.endDate.toDate() : new Date(trip.endDate);
            const days = differenceInDays(endDate, startDate) + 1;
            return `${days}일`;
        } catch (error) {
            return '1일';
        }
    };

    const getStatusBadge = () => {
        const badges = {
            planning: { text: '계획중', class: 'trip-card-planning' },
            confirmed: { text: '확정됨', class: 'trip-card-confirmed' },
            ongoing: { text: '진행중', class: 'trip-card-ongoing' },
            completed: { text: '완료', class: 'trip-card-completed' }
        };
        return badges[trip.status] || badges.planning;
    };

    const statusBadge = getStatusBadge();

    // 사용 예산 계산
    useEffect(() => {
        let used = 0;
        const organized = {};
        schedules.forEach(schedule => {
            organized[schedule.day] = schedule.schedules || [];
        });

        Object.values(organized).forEach(dayScheduleList => {
            dayScheduleList.forEach(schedule => {
                if (schedule.cost && schedule.cost > 0) {
                    used += schedule.cost;
                }
            });
        });
        setUsedBudget(used);
    }, [schedules]);

    return (
        <div className="trip-card" onClick={() => onView(trip)}>
            <div className="trip-card-header">
                <div className="trip-card-status-badge">
                    <span className={`trip-card-status-indicator ${statusBadge.class}`}>
                        {statusBadge.text}
                    </span>
                </div>
                <div className="trip-card-actions">
                    <button
                        className="trip-card-edit-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(trip);
                        }}
                        title="수정"
                    >
                        ✏️
                    </button>
                    <button
                        className="trip-card-delete-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(trip.id);
                        }}
                        title="삭제"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            <div className="trip-card-content">
                <h3 className="trip-card-title">{trip.title}</h3>
                <p className="trip-card-destination">📍 {trip.destination}</p>

                <div className="trip-card-dates">
                    <span className="trip-card-date-range">
                        {formatDate(trip.startDate)} ~ {formatDate(trip.endDate)}
                    </span>
                    <span className="trip-card-duration">({getDuration()})</span>
                </div>

                {/* 예산이 있을 때만 표시 */}
                {trip.budget > 0 && (
                    <div className="trip-card-budget">
                        <div className="trip-card-budget-info">
                            <span className="trip-card-budget-label">예산:</span>
                            <span className="trip-card-budget-amount">
                                {trip.budget.toLocaleString()}원
                            </span>
                        </div>
                        /
                        <div className="trip-card-budget-info">
                            <span className="trip-card-budget-label">사용:</span>
                            <span className={`trip-card-budget-used ${usedBudget > trip.budget ? 'trip-card-over-budget' : ''}`}>
                                {usedBudget.toLocaleString()}원
                            </span>
                        </div>
                    </div>
                )}

                {/* 설명이 있을 때만 표시 */}
                {trip.description.trim() && (
                    <p className="trip-card-description">{trip.description}</p>
                )}
            </div>

            <div className="trip-card-footer">
                <div className="trip-card-meta">
                    <span className="trip-card-created-date">
                        {formatDate(trip.createdAt)} 생성
                    </span>
                </div>
                <div className="trip-card-arrow">→</div>
            </div>
        </div>
    );
};

export default TripCard;
