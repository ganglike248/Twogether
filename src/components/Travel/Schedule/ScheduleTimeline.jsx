// src/components/Travel/Schedule/ScheduleTimeline.jsx
// Day 일정 카드 — 남은 일정은 시간순 타임라인, 완료한 일정은 카드 맨 끝에 접어 둠
// (들어오자마자 볼 건 다음 일정이라 완료 목록은 펼쳐야 보이게 함). 그날 일정을 다 마치면 접지 않고 전부 보여줌
import React, { useState } from 'react';
import { MdDateRange, MdCheck, MdExpandMore } from 'react-icons/md';
import ScheduleItem from './ScheduleItem';
import TravelTimeInput from './TravelTimeInput';
import './ScheduleTimeline.css';

// 시간 없는 일정이 둘 이상이면 그 일정들에 위·아래 순서 버튼(시간 있는 일정은 시간순이라 버튼 없음)
const TimelineList = ({ items, travelTimes, onEdit, onToggleComplete, onSaveTravelTime, onMoveUntimed }) => {
    const untimed = items.filter(s => !s.time);
    return (
    <div className="tl-list">
        {items.map((schedule, index) => {
            const untimedIndex = untimed.indexOf(schedule);
            const travel = travelTimes?.[`${schedule.id}-${items[index + 1]?.id}`];
            return (
            <React.Fragment key={schedule.id}>
                <ScheduleItem
                    schedule={schedule}
                    onEdit={onEdit}
                    onToggleComplete={onToggleComplete}
                    isFirst={index === 0}
                    isLast={index === items.length - 1}
                    onMove={onMoveUntimed && untimed.length > 1 && untimedIndex >= 0 ? onMoveUntimed : undefined}
                    canMoveUp={untimedIndex > 0}
                    canMoveDown={untimedIndex >= 0 && untimedIndex < untimed.length - 1}
                />
                {index < items.length - 1 && (
                    <TravelTimeInput
                        fromScheduleId={schedule.id}
                        toScheduleId={items[index + 1].id}
                        initialTravelTime={travel?.time || ''}
                        initialMode={travel?.mode || 'car'}
                        onSave={onSaveTravelTime}
                    />
                )}
            </React.Fragment>
            );
        })}
    </div>
    );
};

const ScheduleTimeline = ({
    activeDay,
    schedules,
    travelTimes,
    loading,
    onEdit,
    onToggleComplete,
    onSaveTravelTime,
    onMoveUntimed,
    onAddFirst,
}) => {
    const [showDone, setShowDone] = useState(false);

    const remaining = schedules.filter(s => !s.completed);
    const done = schedules.filter(s => s.completed);

    const listProps = { travelTimes, onEdit, onToggleComplete, onSaveTravelTime, onMoveUntimed };

    return (
        <div className="tl-card">
            <div className="tl-card-header">
                <span className="tl-card-title">Day {activeDay} 일정</span>
                {schedules.length > 0 && (
                    <span className="tl-card-count">
                        남은 일정 {remaining.length}{done.length > 0 && ` · 완료 ${done.length}`}
                    </span>
                )}
            </div>

            {loading ? (
                <div className="td-loading">
                    <div className="td-spinner" />
                    <p>불러오는 중...</p>
                </div>
            ) : schedules.length === 0 ? (
                <div className="td-empty">
                    <div className="td-empty-icon"><MdDateRange size={48} color="var(--color-primary)" /></div>
                    <p className="td-empty-text">일정이 없어요</p>
                    <button className="td-empty-add-btn" onClick={onAddFirst}>
                        첫 일정 추가하기
                    </button>
                </div>
            ) : (
                <>
                    {remaining.length > 0 ? (
                        <TimelineList items={remaining} {...listProps} />
                    ) : (
                        // 다 마친 날은 접지 않고 그날 일정을 전부 그대로 보여줌(여행 뒤 다시 보기 쉽게)
                        <>
                            <p className="tl-all-done">이 날의 일정을 모두 마쳤어요</p>
                            <TimelineList items={schedules} {...listProps} />
                        </>
                    )}

                    {remaining.length > 0 && done.length > 0 && (
                        <>
                            <button
                                className={`tl-done-toggle ${showDone ? 'open' : ''}`}
                                onClick={() => setShowDone(v => !v)}
                                aria-expanded={showDone}
                            >
                                <span className="tl-done-check"><MdCheck /></span>
                                완료한 일정 {done.length}개
                                <MdExpandMore className="tl-done-chevron" />
                            </button>
                            {showDone && (
                                <div className="tl-done-section">
                                    <TimelineList items={done} {...listProps} />
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default ScheduleTimeline;
