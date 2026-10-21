// src/components/Travel/TripDetail.js
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { format, differenceInDays, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { useTripSchedules } from '../../../hooks/useTrip';
import { useTravelDecisions } from '../../../hooks/useTravelDecisions';
import { useAuthContext } from '../../../contexts/AuthContext';
import { mutateTripSchedule, toggleScheduleCompletion, saveTravelTime, subscribeTravelTimes } from '../../../services/tripService';
import { hasUserScored } from '../../../services/travelDecisionService';
import { convertToDate } from '../../../utils/dataUtils';
import { normalizeIfPureNumber } from '../../../utils/numberFormat';
import { extractUrl } from '../../../utils/appLinkUtils';
import ScheduleModal from '../Schedule/ScheduleModal';
import ScheduleTimeline from '../Schedule/ScheduleTimeline';
import DayTabs from '../Schedule/DayTabs';
import TripDetailHeader from './TripDetailHeader';
import TravelDecisionsTab from '../Decisions/TravelDecisionsTab';
import TravelChecklistTab from '../Checklist/TravelChecklistTab';
import FloatingActionMenu from '../FloatingActionMenu';
import './TripDetail.css';

const TripDetail = ({ trip, onBack, onEdit, onDelete }) => {
    const { user } = useAuthContext();
    const navigate = useNavigate();
    const location = useLocation();
    // 모달 열림 상태를 useState 대신 ?modal= 쿼리에서 파생 — 손수 만든 pushState/popstate 훅
    // (useModalBackButton) 없이 React Router가 히스토리를 전담하게 함(캘린더와 같은 이유).
    const [searchParams] = useSearchParams();
    const showScheduleModal = searchParams.get('modal') === 'schedule';
    const openScheduleModal = () => navigate(`${location.pathname}?modal=schedule`, { state: { modal: true } });
    // location.key === 'default'면 이 세션에서 첫 진입(딥링크/새로고침)이라 navigate(-1)이
    // 앱 밖으로 나갈 수 있어 대신 현재 페이지로 보냄 — 캘린더 closeModal과 동일한 패턴.
    const closeScheduleModal = () => {
        setSelectedSchedule(null);
        if (location.key === 'default') {
            navigate(location.pathname, { replace: true });
        } else {
            navigate(-1);
        }
    };
    const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'decisions' | 'checklist'
    const [activeDay, setActiveDay] = useState(1);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [daySchedules, setDaySchedules] = useState({});
    const [travelTimes, setTravelTimes] = useState({});
    const [totalBudget, setTotalBudget] = useState(0);
    const [usedBudget, setUsedBudget] = useState(0);
    const [showDaySelector, setShowDaySelector] = useState(false);
    const [optionForSchedule, setOptionForSchedule] = useState(null);

    const decisionsTabRef = React.useRef(null);
    const checklistTabRef = React.useRef(null);

    const { schedules, loading } = useTripSchedules(trip.id);
    const { decisions } = useTravelDecisions(trip.id);

    // 후보 → 그 후보로 만든 일정이 있는 날 목록(카드/상세의 "Day N 일정" 표시용). 일정 항목의 sourceOptionId로 거꾸로
    // 계산하므로 일정을 지우면 표시도 같이 사라짐
    const scheduledDaysByOption = useMemo(() => {
        const map = {};
        schedules.forEach(({ day, schedules: items }) => {
            (items || []).forEach(item => {
                if (!item.sourceOptionId) return;
                const days = map[item.sourceOptionId] || (map[item.sourceOptionId] = []);
                if (!days.includes(day)) days.push(day);
            });
        });
        Object.values(map).forEach(days => days.sort((a, b) => a - b));
        return map;
    }, [schedules]);

    // 미평가 개수 계산
    const unscorredCount = decisions.reduce((count, decision) => {
      return count + (decision.options || []).filter(opt => !hasUserScored(opt, user?.uid)).length;
    }, 0);

    const getTripDays = () => {
        try {
            const startDate = convertToDate(trip.startDate);
            const endDate = convertToDate(trip.endDate);
            if (!startDate || !endDate) return 1;
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
        const unsubscribe = subscribeTravelTimes(trip.id, activeDay, (times) => {
            const timesMap = {};
            times.forEach(time => {
                timesMap[`${time.fromScheduleId}-${time.toScheduleId}`] = time.travelTime;
            });
            setTravelTimes(prev => ({ ...prev, [activeDay]: timesMap }));
        });
        return unsubscribe;
    }, [trip.id, activeDay]);

    useEffect(() => { setTotalBudget(trip.budget || 0); }, [trip.budget]);

    const getDayDate = (day) => {
        try {
            const startDate = convertToDate(trip.startDate);
            if (!startDate) return `${day}일차`;
            return format(addDays(startDate, day - 1), 'MM.dd (EEE)', { locale: ko });
        } catch { return `${day}일차`; }
    };

    const handleSaveSchedule = async (scheduleData) => {
        try {
            // 저장 버튼 클릭 시(렌더 중이 아님)에만 실행되는 이벤트 핸들러라 Date.now()/
            // Math.random()을 여기서 써도 안전함 — react-hooks/purity는 렌더 중 호출만
            // 문제 삼는 규칙인데 이 파일의 다른 부분 때문에 분석이 이 줄까지 닿으면서
            // 오탐으로 걸림.
            // eslint-disable-next-line react-hooks/purity
            const newId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            // 화면이 들고 있던 목록이 아니라 서버 최신 목록에 이 변경만 적용(동시 수정 유실 방지)
            // 후보에서 만든 새 일정이면 어느 후보인지 남김(선택 사항의 "Day N 일정" 표시) — 모달 폼엔 없는 값이라
            // 모달을 열 때 넘긴 미리 채움 데이터(selectedSchedule)에서 가져옴
            const sourceOptionId = !scheduleData.id ? selectedSchedule?.sourceOptionId : undefined;
            await mutateTripSchedule(trip.id, activeDay, (current) => (
                scheduleData.id && current.find(s => s.id === scheduleData.id)
                    // 완료 여부는 모달에서 편집하는 값이 아니라서 서버 최신 값을 유지(그 사이 상대가 체크했을 수 있음).
                    // 폼에 없는 값(sourceOptionId 등)도 지워지지 않게 기존 항목 위에 덮어씀
                    ? current.map(s => s.id === scheduleData.id ? { ...s, ...scheduleData, completed: s.completed } : s)
                    : [...current, { ...scheduleData, id: newId, ...(sourceOptionId ? { sourceOptionId } : {}) }]
            ));
            closeScheduleModal();
            setOptionForSchedule(null);
            toast.success(scheduleData.id ? '일정이 수정되었습니다.' : '일정이 추가되었습니다.');
        } catch (error) {
            console.error('Error saving schedule:', error);
            toast.error('일정 저장 중 오류가 발생했습니다.');
        }
    };

    const handleAddOptionToSchedule = (decision, option) => {
        setOptionForSchedule(option);
        setShowDaySelector(true);
    };

    const handleDaySelected = (day) => {
        setActiveDay(day);
        setShowDaySelector(false);

        // 선택한 옵션 정보를 일정 모달에 pre-fill — 후보 칸을 일정의 같은 의미 칸으로 그대로 옮김
        // (예전엔 설명에 `[제목]`을 또 붙여서 제목이 두 번 들어갔음). 링크는 일정에 별도 칸이 없어 설명 끝에 둠.
        const { title, description, url, address, price } = optionForSchedule;
        const priceNumber = normalizeIfPureNumber(price);
        const scheduleData = {
            title: title || '',
            description: [description, extractUrl(url) || url].map(v => (v || '').trim()).filter(Boolean).join('\n'),
            location: address || '',
            // 가격이 순수 숫자일 때만 비용으로(자유 텍스트로 저장된 예전 값은 일정 비용 칸 검증에 걸림)
            cost: /^\d+$/.test(priceNumber) ? priceNumber : '',
            time: '',
            endTime: '',
            sourceOptionId: optionForSchedule.id,
        };

        setSelectedSchedule(scheduleData);
        openScheduleModal();
    };

    const handleDeleteSchedule = async (scheduleId) => {
        try {
            await mutateTripSchedule(trip.id, activeDay, (current) => current.filter(s => s.id !== scheduleId));
            toast.success('일정을 삭제했습니다.');
        } catch (error) {
            console.error('Error deleting schedule:', error);
            toast.error('일정 삭제 중 오류가 발생했습니다.');
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
            toast.success(travelTime.trim() ? '이동 시간을 저장했습니다.' : '이동 시간을 삭제했습니다.');
        } catch (error) {
            console.error('Error saving travel time:', error);
            toast.error('이동 시간 저장 중 오류가 발생했습니다.');
        }
    };

    // FloatingActionMenu 콜백
    const handleFABScheduleAdd = () => {
        setSelectedSchedule(null);
        openScheduleModal();
    };

    const handleFABDecisionMenu = () => {
        decisionsTabRef.current?.showDecisionMenu?.();
    };

    const handleFABChecklistAdd = () => {
        checklistTabRef.current?.showChecklistModal?.();
    };

    const currentDaySchedules = (daySchedules[activeDay] || [])
        .sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return (a.time || '00:00').localeCompare(b.time || '00:00');
        });

    return (
        <div className="trip-detail-container">

            {/* 헤더 + 여행 정보 카드 */}
            <TripDetailHeader
                trip={trip}
                tripDays={tripDays}
                usedBudget={usedBudget}
                totalBudget={totalBudget}
                onBack={onBack}
                onEdit={onEdit}
                onDelete={onDelete}
            />

            {/* 탭 */}
            <div className="td-tabs">
                <button
                    className={`td-tab ${activeTab === 'schedule' ? 'active' : ''}`}
                    onClick={() => setActiveTab('schedule')}
                >
                    Day별 일정
                </button>
                <button
                    className={`td-tab ${activeTab === 'decisions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('decisions')}
                >
                    선택 사항
                    {unscorredCount > 0 && <span className="td-tab-badge">{unscorredCount}</span>}
                </button>
                <button
                    className={`td-tab ${activeTab === 'checklist' ? 'active' : ''}`}
                    onClick={() => setActiveTab('checklist')}
                >
                    체크리스트
                </button>
            </div>

            {/* Day별 일정 탭 */}
            {activeTab === 'schedule' && (
                <>
                    <DayTabs
                        tripDays={tripDays}
                        activeDay={activeDay}
                        onSelect={setActiveDay}
                        getDayDate={getDayDate}
                    />
                    <ScheduleTimeline
                        key={activeDay}
                        activeDay={activeDay}
                        schedules={currentDaySchedules}
                        travelTimes={travelTimes[activeDay]}
                        loading={loading}
                        onEdit={s => { setSelectedSchedule(s); openScheduleModal(); }}
                        onToggleComplete={handleToggleCompletion}
                        onSaveTravelTime={handleSaveTravelTime}
                        onAddFirst={openScheduleModal}
                    />
                </>
            )}
            {/* 선택 사항 탭 */}
            {activeTab === 'decisions' && (
                <div className="trip-detail-decisions-section">
                    <TravelDecisionsTab
                        ref={decisionsTabRef}
                        trip={trip}
                        tripDays={tripDays}
                        onAddToSchedule={handleAddOptionToSchedule}
                        scheduledDaysByOption={scheduledDaysByOption}
                    />
                </div>
            )}

            {/* 준비 체크리스트 탭 */}
            {activeTab === 'checklist' && (
                <div className="trip-detail-checklist-section">
                    <TravelChecklistTab ref={checklistTabRef} trip={trip} />
                </div>
            )}

            {/* 날짜 선택 모달 */}
            {showDaySelector && optionForSchedule && createPortal(
                <div className="day-selector-overlay">
                    <div className="day-selector-modal">
                        <div className="dsm-header">
                            <h3 className="dsm-title">어느 날에 추가할까요?</h3>
                        </div>
                        <div className="dsm-days">
                            {Array.from({ length: tripDays }, (_, i) => i + 1).map(day => (
                                <button
                                    key={day}
                                    className="dsm-day-btn"
                                    onClick={() => handleDaySelected(day)}
                                >
                                    <span className="dsm-day-num">Day {day}</span>
                                    <span className="dsm-day-date">{getDayDate(day)}</span>
                                </button>
                            ))}
                        </div>
                        <button
                            className="dsm-cancel-btn"
                            onClick={() => {
                                setShowDaySelector(false);
                                setOptionForSchedule(null);
                            }}
                        >
                            취소
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {showScheduleModal && (
                <ScheduleModal
                    isOpen={showScheduleModal}
                    onClose={closeScheduleModal}
                    schedule={selectedSchedule}
                    onSave={handleSaveSchedule}
                    onDelete={handleDeleteSchedule}
                />
            )}

            {/* FloatingActionMenu */}
            <FloatingActionMenu
                activeTab={activeTab}
                onScheduleAdd={handleFABScheduleAdd}
                onDecisionMenu={handleFABDecisionMenu}
                onChecklistAdd={handleFABChecklistAdd}
            />
        </div>
    );
};

export default TripDetail;
