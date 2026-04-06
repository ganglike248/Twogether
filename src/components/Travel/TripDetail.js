// src/components/Travel/TripDetail.js
import React, { useState, useEffect } from 'react';
import { format, differenceInDays, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { HiArrowLeft, HiPencil, HiTrash, HiMapPin, HiCalendarDays, HiCurrencyDollar, HiPlus, HiDocumentText } from 'react-icons/hi2';
import { useTripSchedules } from '../../hooks/useTrip';
import { saveTripSchedule, toggleScheduleCompletion, saveTravelTime, getTravelTimes } from '../../services/tripService';
import ScheduleItem from './ScheduleItem';
import ScheduleModal from './ScheduleModal';
import TravelTimeInput from './TravelTimeInput';
import './TripDetail.css';

const TripDetail = ({ trip, onBack, onEdit, onDelete }) => {
    const [activeDay, setActiveDay] = useState(1);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [daySchedules, setDaySchedules] = useState({});
    const [travelTimes, setTravelTimes] = useState({});
    const [totalBudget, setTotalBudget] = useState(0);
    const [usedBudget, setUsedBudget] = useState(0);

    const { schedules, loading } = useTripSchedules(trip.id);

    const getTripDays = () => {
        try {
            const startDate = trip.startDate?.toDate ? trip.startDate.toDate() : new Date(trip.startDate);
            const endDate = trip.endDate?.toDate ? trip.endDate.toDate() : new Date(trip.endDate);
            return differenceInDays(endDate, startDate) + 1;
        } catch {
            return 1;
        }
    };

    const tripDays = getTripDays();

    useEffect(() => {
        const organized = {};
        schedules.forEach(schedule => {
            organized[schedule.day] = schedule.schedules || [];
        });
        setDaySchedules(organized);

        let used = 0;
        Object.values(organized).forEach(dayList => {
            dayList.forEach(s => { if (s.cost && s.cost > 0) used += s.cost; });
        });
        setUsedBudget(used);
    }, [schedules]);

    useEffect(() => {
        const loadTravelTimes = async () => {
            if (!trip.id || !activeDay) return;
            try {
                const times = await getTravelTimes(trip.id, activeDay);
                const timesMap = {};
                times.forEach(time => {
                    timesMap[`${time.fromScheduleId}-${time.toScheduleId}`] = time.travelTime;
                });
                setTravelTimes(prev => ({ ...prev, [activeDay]: timesMap }));
            } catch (error) {
                console.error('Error loading travel times:', error);
            }
        };
        loadTravelTimes();
    }, [trip.id, activeDay, daySchedules]);

    useEffect(() => { setTotalBudget(trip.budget || 0); }, [trip.budget]);

    const formatDate = (dateString) => {
        try {
            const d = dateString?.toDate ? dateString.toDate() : new Date(dateString);
            return format(d, 'yyyy.MM.dd', { locale: ko });
        } catch { return dateString; }
    };

    const getDayDate = (day) => {
        try {
            const startDate = trip.startDate?.toDate ? trip.startDate.toDate() : new Date(trip.startDate);
            return format(addDays(startDate, day - 1), 'MM.dd (EEE)', { locale: ko });
        } catch { return `${day}일차`; }
    };

    const handleSaveSchedule = async (scheduleData) => {
        try {
            const current = daySchedules[activeDay] || [];
            let updated;
            if (scheduleData.id && current.find(s => s.id === scheduleData.id)) {
                updated = current.map(s => s.id === scheduleData.id ? scheduleData : s);
            } else {
                updated = [...current, {
                    ...scheduleData,
                    id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                }];
            }
            await saveTripSchedule(trip.id, activeDay, updated);
            setShowScheduleModal(false);
            setSelectedSchedule(null);
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('일정 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteSchedule = async (scheduleId) => {
        try {
            const updated = (daySchedules[activeDay] || []).filter(s => s.id !== scheduleId);
            await saveTripSchedule(trip.id, activeDay, updated);
        } catch (error) {
            console.error('Error deleting schedule:', error);
            alert('일정 삭제 중 오류가 발생했습니다.');
        }
    };

    const handleToggleCompletion = async (scheduleId) => {
        try { await toggleScheduleCompletion(trip.id, activeDay, scheduleId); }
        catch (error) { console.error('Error toggling schedule completion:', error); }
    };

    const handleSaveTravelTime = async (fromScheduleId, toScheduleId, travelTime) => {
        try {
            await saveTravelTime(trip.id, activeDay, fromScheduleId, toScheduleId, travelTime);
            const key = `${fromScheduleId}-${toScheduleId}`;
            setTravelTimes(prev => ({
                ...prev,
                [activeDay]: { ...prev[activeDay], [key]: travelTime.trim() || undefined }
            }));
        } catch (error) {
            console.error('Error saving travel time:', error);
            alert('이동 시간 저장 중 오류가 발생했습니다.');
        }
    };

    const statusMap = {
        planning: { text: '계획중', cls: 'status-planning' },
        confirmed: { text: '확정', cls: 'status-confirmed' },
        ongoing: { text: '진행중', cls: 'status-ongoing' },
        completed: { text: '완료', cls: 'status-completed' }
    };
    const status = statusMap[trip.status] || statusMap.planning;

    const currentDaySchedules = (daySchedules[activeDay] || [])
        .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

    const budgetPercent = totalBudget > 0 ? Math.min((usedBudget / totalBudget) * 100, 100) : 0;
    const isOverBudget = usedBudget > totalBudget && totalBudget > 0;

    return (
        <div className="trip-detail-container">

            {/* 헤더 */}
            <div className="trip-detail-header">
                <button className="td-back-btn" onClick={onBack}>
                    <HiArrowLeft />
                </button>
                <h1 className="td-title">{trip.title}</h1>
                <div className="td-actions">
                    {onEdit && (
                        <button className="td-action-btn edit" onClick={() => onEdit(trip)}>
                            <HiPencil />
                        </button>
                    )}
                    {onDelete && (
                        <button className="td-action-btn delete" onClick={() => onDelete(trip.id)}>
                            <HiTrash />
                        </button>
                    )}
                </div>
            </div>

            {/* 여행 정보 카드 */}
            <div className="trip-info-card">
                <div className="trip-info-top">
                    <span className={`td-status-chip ${status.cls}`}>{status.text}</span>
                    <span className="trip-info-duration">{tripDays}일간의 여행</span>
                </div>
                <div className="trip-info-row">
                    <div className="trip-info-icon-wrap">
                        <HiCalendarDays />
                    </div>
                    <div className="trip-info-content">
                        <span className="trip-info-label">여행 기간</span>
                        <span className="trip-info-value">
                            {formatDate(trip.startDate)} ~ {formatDate(trip.endDate)}
                        </span>
                    </div>
                </div>
                {trip.destination && (
                    <div className="trip-info-row">
                        <div className="trip-info-icon-wrap">
                            <HiMapPin />
                        </div>
                        <div className="trip-info-content">
                            <span className="trip-info-label">여행지</span>
                            <span className="trip-info-value">{trip.destination}</span>
                        </div>
                    </div>
                )}
                {totalBudget > 0 && (
                    <div className="trip-info-row">
                        <div className="trip-info-icon-wrap">
                            <HiCurrencyDollar />
                        </div>
                        <div className="trip-info-content">
                            <span className="trip-info-label">예산</span>
                            <span className="trip-info-value">
                                {usedBudget.toLocaleString()} / {totalBudget.toLocaleString()}원
                                {isOverBudget && <span className="chip-over"> 초과!</span>}
                            </span>
                            <div className="td-budget-bar" style={{ marginTop: '0.375rem' }}>
                                <div
                                    className="td-budget-progress"
                                    style={{
                                        width: `${budgetPercent}%`,
                                        background: isOverBudget
                                            ? 'linear-gradient(90deg, #ff6b6b, #ff4444)'
                                            : 'linear-gradient(90deg, #ffb6c1, #ff9bac)'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}
                {trip.description && (
                    <div className="trip-info-row">
                        <div className="trip-info-icon-wrap">
                            <HiDocumentText />
                        </div>
                        <div className="trip-info-content">
                            <span className="trip-info-label">메모</span>
                            <span className="trip-info-value trip-description-text">{trip.description}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Day 탭 */}
            <div className="trip-detail-day-tabs">
                {Array.from({ length: tripDays }, (_, i) => i + 1).map(day => (
                    <button
                        key={day}
                        className={`td-day-tab ${activeDay === day ? 'active' : ''}`}
                        onClick={() => setActiveDay(day)}
                    >
                        <span className="td-day-num">Day {day}</span>
                        <span className="td-day-date">{getDayDate(day)}</span>
                    </button>
                ))}
            </div>

            {/* 일정 영역 */}
            <div className="trip-detail-schedule-section">
                <div className="td-schedule-header">
                    <span className="td-schedule-title">Day {activeDay} 일정</span>
                    <button
                        className="td-add-btn"
                        onClick={() => { setSelectedSchedule(null); setShowScheduleModal(true); }}
                    >
                        <HiPlus className="td-add-icon" /> 추가
                    </button>
                </div>

                {loading ? (
                    <div className="td-loading">
                        <div className="td-spinner" />
                        <p>불러오는 중...</p>
                    </div>
                ) : currentDaySchedules.length === 0 ? (
                    <div className="td-empty">
                        <div className="td-empty-icon">🗓️</div>
                        <p className="td-empty-text">일정이 없어요</p>
                        <button className="td-empty-add-btn" onClick={() => setShowScheduleModal(true)}>
                            첫 일정 추가하기
                        </button>
                    </div>
                ) : (
                    <div className="td-schedule-list">
                        {currentDaySchedules.map((schedule, index) => (
                            <React.Fragment key={schedule.id}>
                                <ScheduleItem
                                    schedule={schedule}
                                    onEdit={s => { setSelectedSchedule(s); setShowScheduleModal(true); }}
                                    onDelete={handleDeleteSchedule}
                                    onToggleComplete={handleToggleCompletion}
                                />
                                {index < currentDaySchedules.length - 1 && (
                                    <TravelTimeInput
                                        fromScheduleId={schedule.id}
                                        toScheduleId={currentDaySchedules[index + 1].id}
                                        initialTravelTime={
                                            travelTimes[activeDay]?.[`${schedule.id}-${currentDaySchedules[index + 1].id}`] || ''
                                        }
                                        onSave={handleSaveTravelTime}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>

            {showScheduleModal && (
                <ScheduleModal
                    isOpen={showScheduleModal}
                    onClose={() => { setShowScheduleModal(false); setSelectedSchedule(null); }}
                    schedule={selectedSchedule}
                    onSave={handleSaveSchedule}
                />
            )}
        </div>
    );
};

export default TripDetail;
