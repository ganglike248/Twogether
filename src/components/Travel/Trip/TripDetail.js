// src/components/Travel/TripDetail.js
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryModal } from '../../../hooks/useQueryModal';
import { isOffline } from '../../../services/offlineWrite';
import { useDialog } from '../../../hooks/useDialog';
import { format, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { useTripSchedules } from '../../../hooks/useTrip';
import { useTravelDecisions } from '../../../hooks/useTravelDecisions';
import { useTravelChecklist } from '../../../hooks/useTravelChecklist';
import { useAuthContext } from '../../../contexts/AuthContext';
import { mutateTripSchedule, moveTripSchedule, toggleScheduleCompletion, saveTravelTime, subscribeTravelTimes, addTripRegionsFromText, deleteTravelTimesOf, moveUntimedSchedule } from '../../../services/tripService';
import { hasUserScored } from '../../../services/travelDecisionService';
import { convertToDate } from '../../../utils/dataUtils';
import { getTripDayCount, getTripPhase, getTripTodayDay } from '../../../services/tripPhase';
import { normalizeIfPureNumber } from '../../../utils/numberFormat';
import { extractUrl } from '../../../utils/appLinkUtils';
import { getFriendlyErrorMessage } from '../../../utils/errorMessages';
import ScheduleModal from '../Schedule/ScheduleModal';
import ScheduleTimeline from '../Schedule/ScheduleTimeline';
import DayTabs from '../Schedule/DayTabs';
import TripDetailHeader from './TripDetailHeader';
import TripRecordCard from '../Review/TripRecordCard';
import TravelDecisionsTab from '../Decisions/TravelDecisionsTab';
import TravelChecklistTab from '../Checklist/TravelChecklistTab';
import FloatingActionMenu from '../FloatingActionMenu';
import './TripDetail.css';

const TripDetail = ({ trip, onBack, onEdit, onDelete }) => {
    const { user } = useAuthContext();
    const navigate = useNavigate();
    const location = useLocation();
    // 모달·탭은 주소에서 파생(?tab=decisions|checklist, ?modal=schedule|day-pick…) — 뒤로가기로 모달만 닫히고,
    // 새로고침·딥링크에도 같은 탭이 열림. 여닫기는 useQueryModal(탭 위치 유지)
    const qm = useQueryModal();
    const showScheduleModal = qm.modal === 'schedule';
    const openScheduleModal = (opts) => qm.open('schedule', {}, opts);
    const closeScheduleModal = () => {
        setSelectedSchedule(null);
        qm.close();
    };
    const tabParam = qm.get('tab');
    const activeTab = tabParam === 'decisions' || tabParam === 'checklist' ? tabParam : 'schedule';
    const setActiveTab = (tab) => navigate(tab === 'schedule' ? location.pathname : `${location.pathname}?tab=${tab}`, { replace: true });
    // 여행 중이면 오늘 Day부터 열림(그 밖엔 Day 1)
    const todayDay = getTripPhase(trip) === 'ongoing' ? getTripTodayDay(trip) : null;
    const [activeDayRaw, setActiveDay] = useState(todayDay || 1);
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [daySchedules, setDaySchedules] = useState({});
    const [travelTimes, setTravelTimes] = useState({});
    const [totalBudget, setTotalBudget] = useState(0);
    const [usedBudget, setUsedBudget] = useState(0);
    // 완료 체크는 누르는 즉시 화면에 반영(서버 확인 전) — { [scheduleId]: true|false }, 실패하면 되돌림
    const [doneOverrides, setDoneOverrides] = useState({});

    const decisionsTabRef = React.useRef(null);
    const checklistTabRef = React.useRef(null);

    const { schedules, loading } = useTripSchedules(trip.id);
    const { decisions } = useTravelDecisions(trip.id);

    // 후보 → 일정: "어느 날에 추가할까요?"(?modal=day-pick&d=&o=) — 후보는 주소의 id로 찾음
    const showDaySelector = qm.modal === 'day-pick';
    const optionForSchedule = showDaySelector
        ? (decisions.find(d => d.id === qm.get('d'))?.options || []).find(o => o.id === qm.get('o')) || null
        : null;

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

    // 체크리스트 탭 배지(v1.0.24~) — 예전엔 탭에 들어가야만 진행 상황을 알 수 있었음. 선택 사항 배지와 같은 모양으로
    // 남은(체크 안 한) 항목 수를 보여주고, 전부 체크하면 초록 ✓. 같은 문서를 체크리스트 탭도 구독하지만
    // Firestore SDK가 같은 문서 리스너를 하나로 합쳐서 읽기 비용은 늘지 않음.
    const { checklist } = useTravelChecklist(trip.id);
    const checklistItems = checklist?.items || [];
    const checklistRemaining = checklistItems.filter(item => !item.completed).length;

    // 미평가 개수 계산
    const unscorredCount = decisions.reduce((count, decision) => {
      return count + (decision.options || []).filter(opt => !hasUserScored(opt, user?.uid)).length;
    }, 0);

    const tripDays = getTripDayCount(trip.startDate, trip.endDate);
    // 기간이 줄어 보고 있던 Day가 없어지면 마지막 Day를 봄
    const activeDay = Math.min(activeDayRaw, tripDays);

    useEffect(() => {
        const organized = {};
        schedules.forEach(schedule => {
            organized[schedule.day] = schedule.schedules || [];
        });
        setDaySchedules(organized);

        // 예산 합계는 여행 기간 안의 Day만
        let used = 0;
        Object.entries(organized).forEach(([day, dayList]) => {
            if (Number(day) > tripDays) return;
            dayList.forEach(s => { if (s.cost && s.cost > 0) used += s.cost; });
        });
        setUsedBudget(used);
    }, [schedules, tripDays]);

    useEffect(() => {
        const unsubscribe = subscribeTravelTimes(trip.id, activeDay, (times) => {
            const timesMap = {};
            times.forEach(time => {
                timesMap[`${time.fromScheduleId}-${time.toScheduleId}`] = { time: time.travelTime, mode: time.mode || 'car' };
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

    // 모달의 "날짜" 선택지 — "Day 2 · 11.09 (토)"
    const dayOptions = Array.from({ length: tripDays }, (_, i) => ({ day: i + 1, label: `Day ${i + 1} · ${getDayDate(i + 1)}` }));

    // 일정 주소로 여행 지역 자동 추가(우리 지도) — 이미 있는 지역이면 조용히 넘어감, 실패해도 일정 저장과 무관
    const syncRegionsFromSchedule = (scheduleData) => {
        if (!scheduleData?.location) return;
        addTripRegionsFromText(trip.id, scheduleData.location).catch((error) => console.warn('여행 지역 자동 추가 실패:', error));
    };

    const handleSaveSchedule = async (scheduleData, targetDay = activeDay) => {
        // 기존 일정의 날짜를 바꾼 경우 → 다른 날로 옮김(완료 여부·이동시간 정리는 moveTripSchedule이 처리).
        // 여러 개를 연달아 옮길 수 있게 화면은 지금 보던 날에 그대로 둠
        if (scheduleData.id && targetDay !== activeDay) {
            try {
                await moveTripSchedule(trip.id, activeDay, targetDay, scheduleData);
                syncRegionsFromSchedule(scheduleData);
                closeScheduleModal();
                toast.success(`Day ${targetDay}(${getDayDate(targetDay)})로 옮겼어요.`);
            } catch (error) {
                console.error('Error moving schedule:', error);
                toast.error(getFriendlyErrorMessage(error, '일정을 옮기지 못했어요. 잠시 후 다시 시도해주세요.'));
            }
            return;
        }
        try {
            // 저장 버튼 클릭 시(렌더 중이 아님)에만 실행되는 이벤트 핸들러라 Date.now()/
            // Math.random()을 여기서 써도 안전함 — react-hooks/purity는 렌더 중 호출만
            // 문제 삼는 규칙인데 이 파일의 다른 부분 때문에 분석이 이 줄까지 닿으면서
            // 오탐으로 걸림.
            const newId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            // 화면이 들고 있던 목록이 아니라 서버 최신 목록에 이 변경만 적용(동시 수정 유실 방지)
            // 후보에서 만든 새 일정이면 어느 후보인지 남김(선택 사항의 "Day N 일정" 표시) — 모달 폼엔 없는 값이라
            // 모달을 열 때 넘긴 미리 채움 데이터(selectedSchedule)에서 가져옴
            const sourceOptionId = !scheduleData.id ? selectedSchedule?.sourceOptionId : undefined;
            await mutateTripSchedule(trip.id, targetDay, (current) => (
                scheduleData.id && current.find(s => s.id === scheduleData.id)
                    // 완료 여부는 모달에서 편집하는 값이 아니라서 서버 최신 값을 유지(그 사이 상대가 체크했을 수 있음).
                    // 폼에 없는 값(sourceOptionId 등)도 지워지지 않게 기존 항목 위에 덮어씀
                    ? current.map(s => s.id === scheduleData.id ? { ...s, ...scheduleData, completed: s.completed } : s)
                    : [...current, { ...scheduleData, id: newId, ...(sourceOptionId ? { sourceOptionId } : {}) }]
            ));
            syncRegionsFromSchedule(scheduleData);
            closeScheduleModal();
            // 새 일정을 다른 날에 넣었으면 그날로 이동해서 바로 보이게
            if (targetDay !== activeDay) setActiveDay(targetDay);
            toast.success(scheduleData.id ? '일정이 수정됐어요.' : '일정이 추가됐어요.');
        } catch (error) {
            console.error('Error saving schedule:', error);
            toast.error('일정 저장 중 오류가 발생했어요.');
        }
    };

    const dayPickRef = useDialog(showDaySelector && !!optionForSchedule, qm.close);
    // 당일치기는 고를 날이 하나뿐이라 묻지 않고 바로 일정 모달
    const handleAddOptionToSchedule = (decision, option) => (tripDays <= 1
        ? openScheduleFromOption(option, 1, {})
        : qm.open('day-pick', { d: decision.id, o: option.id }));

    // 날짜 고르기 자리를 일정 모달로 바꿈 — 닫으면 날짜 고르기가 아니라 그 전 화면(후보)으로
    const handleDaySelected = (day) => openScheduleFromOption(optionForSchedule, day, { replace: true });

    const openScheduleFromOption = (option, day, navOpts) => {
        if (!option) return;
        setActiveDay(day);

        // 선택한 옵션 정보를 일정 모달에 pre-fill — 후보 칸을 일정의 같은 의미 칸으로 그대로 옮김
        // (예전엔 설명에 `[제목]`을 또 붙여서 제목이 두 번 들어갔음). 링크는 일정에 별도 칸이 없어 설명 끝에 둠.
        const { title, description, url, address, price } = option;
        const priceNumber = normalizeIfPureNumber(price);
        const scheduleData = {
            title: title || '',
            description: [description, extractUrl(url) || url].map(v => (v || '').trim()).filter(Boolean).join('\n'),
            location: address || '',
            // 가격이 순수 숫자일 때만 비용으로(자유 텍스트로 저장된 예전 값은 일정 비용 칸 검증에 걸림)
            cost: /^\d+$/.test(priceNumber) ? priceNumber : '',
            time: '',
            endTime: '',
            sourceOptionId: option.id,
        };

        setSelectedSchedule(scheduleData);
        openScheduleModal(navOpts);
    };

    const handleDeleteSchedule = async (scheduleId) => {
        try {
            await mutateTripSchedule(trip.id, activeDay, (current) => current.filter(s => s.id !== scheduleId));
            deleteTravelTimesOf(trip.id, activeDay, scheduleId).catch((error) => console.warn('이동 시간 정리 실패:', error));
            toast.success('일정을 삭제했어요.');
        } catch (error) {
            console.error('Error deleting schedule:', error);
            toast.error('일정 삭제 중 오류가 발생했어요.');
        }
    };

    // 완료 체크 — 바로 반영하고 서버에 저장, 실패하면 되돌리고 알림(예전엔 실패해도 아무 반응이 없었음).
    // 서버가 필요한 동작(트랜잭션)이라 오프라인이면 시도하지 않고 안내.
    const handleToggleCompletion = async (scheduleId) => {
        if (isOffline()) { toast.info('오프라인이에요. 연결되면 다시 눌러 주세요.', { toastId: 'schedule-offline' }); return; }
        const current = (daySchedules[activeDay] || []).find(s => s.id === scheduleId);
        if (!current) return;
        const next = !(scheduleId in doneOverrides ? doneOverrides[scheduleId] : current.completed);
        setDoneOverrides(prev => ({ ...prev, [scheduleId]: next }));
        const clear = () => setDoneOverrides(prev => { const { [scheduleId]: _drop, ...rest } = prev; return rest; });
        try {
            await toggleScheduleCompletion(trip.id, activeDay, scheduleId, next);
            setTimeout(clear, 1500); // 서버 값이 화면에 도착한 뒤 임시 표시를 걷음
        } catch (error) {
            console.error('Error toggling schedule completion:', error);
            clear();
            toast.error(getFriendlyErrorMessage(error, '완료 표시를 저장하지 못했어요. 잠시 후 다시 눌러 주세요.'));
        }
    };

    const handleMoveUntimed = async (scheduleId, dir) => {
        try { await moveUntimedSchedule(trip.id, activeDay, scheduleId, dir); }
        catch (error) {
            console.error('Error reordering schedule:', error);
            toast.error(getFriendlyErrorMessage(error, '순서를 바꾸지 못했어요. 잠시 후 다시 시도해주세요.'));
        }
    };

    const handleSaveTravelTime = async (fromScheduleId, toScheduleId, travelTime, mode = 'car') => {
        try {
            await saveTravelTime(trip.id, activeDay, fromScheduleId, toScheduleId, travelTime, mode);
            const key = `${fromScheduleId}-${toScheduleId}`;
            setTravelTimes(prev => ({
                ...prev,
                [activeDay]: { ...prev[activeDay], [key]: travelTime.trim() ? { time: travelTime.trim(), mode } : undefined }
            }));
            toast.success(travelTime.trim() ? '이동 시간을 저장했어요.' : '이동 시간을 삭제했어요.');
        } catch (error) {
            console.error('Error saving travel time:', error);
            toast.error('이동 시간 저장 중 오류가 발생했어요.');
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
        .map(s => (s.id in doneOverrides ? { ...s, completed: doneOverrides[s.id] } : s))
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

            {/* 끝난 여행의 기록(두 사람의 기분·기록·TOP 3) */}
            <TripRecordCard trip={trip} schedules={schedules} />

            {/* 탭(+ 일정 탭이면 Day 줄) — 스크롤해도 위에 붙어 있음 */}
            <div className="td-sticky">
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
                    {checklistItems.length > 0 && (checklistRemaining > 0
                        ? <span className="td-tab-badge" aria-label={`남은 항목 ${checklistRemaining}개`}>{checklistRemaining}</span>
                        : <span className="td-tab-badge td-tab-badge-done" aria-label="모두 완료">✓</span>)}
                </button>
            </div>

            {activeTab === 'schedule' && (
                <DayTabs
                    tripDays={tripDays}
                    activeDay={activeDay}
                    todayDay={todayDay}
                    onSelect={setActiveDay}
                    getDayDate={getDayDate}
                />
            )}
            </div>

            {/* Day별 일정 탭 */}
            {activeTab === 'schedule' && (
                <>
                    <ScheduleTimeline
                        key={activeDay}
                        activeDay={activeDay}
                        schedules={currentDaySchedules}
                        travelTimes={travelTimes[activeDay]}
                        loading={loading}
                        onEdit={s => { setSelectedSchedule(s); openScheduleModal(); }}
                        onToggleComplete={handleToggleCompletion}
                        onSaveTravelTime={handleSaveTravelTime}
                        onMoveUntimed={handleMoveUntimed}
                        onAddFirst={handleFABScheduleAdd}
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
                    <div className="day-selector-modal" ref={dayPickRef} role="dialog" aria-modal="true" aria-label="어느 날에 추가할까요?" tabIndex={-1}>
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
                            onClick={qm.close}
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
                    day={activeDay}
                    dayOptions={dayOptions}
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
