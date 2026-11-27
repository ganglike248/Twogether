// src/components/Travel/Trip/TripDetailHeader.jsx
// 여행 상세 상단: 카드 없는 헤더 줄(뒤로 · 가운데 제목 · 수정/삭제) + 흰 여행 정보 카드
import React, { useState } from 'react';
import { HiArrowLeft, HiPencil, HiTrash, HiMapPin, HiCalendarDays, HiDocumentText, HiChevronDown, HiChevronUp } from 'react-icons/hi2';
import { tripPlaceName } from '../../../services/regions/regionData';
import { formatDate } from '../../../utils/dataUtils';
import { groupRegions } from '../../../services/regions/regionData';
import TripMiniMap from '../../Map/TripMiniMap';
import { getTripPhaseInfo } from '../../../services/tripPhase';

// 여행 지역을 시·도별로 묶음 — [{ sido: '전남광주', places: ['광주 동구', '광주 서구'] }]
const regionLines = (regions) => {
    const map = new Map();
    groupRegions(regions).forEach(g => {
        if (!map.has(g.sidoShort)) map.set(g.sidoShort, []);
        if (g.codes.length) map.get(g.sidoShort).push(g.label);
    });
    return [...map.entries()].map(([sido, places]) => ({ sido, places }));
};

// "2026.10.31 – 11.02" — 같은 해면 종료일의 연도는 생략
const formatTripRange = (startDate, endDate) => {
    const start = formatDate(startDate, 'yyyy.MM.dd');
    if (!endDate) return start;
    const sameYear = formatDate(startDate, 'yyyy') === formatDate(endDate, 'yyyy');
    const end = formatDate(endDate, sameYear ? 'MM.dd' : 'yyyy.MM.dd');
    return `${start} – ${end}`;
};

// 약도·정보 카드 접힘 상태 — 기기에 기억({ [tripId]: true|false }). 고른 적 없으면 다가오는 여행만 펼친 채로 시작
// (여행 중·다녀온 여행은 일정이 바로 보이게 접힘).
const INFO_OPEN_KEY = 'twogether_trip_info_open';
const loadInfoOpen = (tripId, fallback) => {
    try {
        const saved = JSON.parse(localStorage.getItem(INFO_OPEN_KEY) || '{}')[tripId];
        return typeof saved === 'boolean' ? saved : fallback;
    } catch { return fallback; }
};
const saveInfoOpen = (tripId, open) => {
    try {
        const map = JSON.parse(localStorage.getItem(INFO_OPEN_KEY) || '{}');
        localStorage.setItem(INFO_OPEN_KEY, JSON.stringify({ ...map, [tripId]: open }));
    } catch { /* 기억만 못 함 */ }
};

const formatNightsDays = (tripDays) => (tripDays <= 1 ? '당일치기' : `${tripDays - 1}박 ${tripDays}일`);

const TripDetailHeader = ({ trip, tripDays, usedBudget, totalBudget, onBack, onEdit, onDelete }) => {
    // 상태는 날짜로 계산(다가오는/여행 중/다녀옴)
    const phase = getTripPhaseInfo(trip);
    const status = { text: phase.label, cls: phase.cls };
    const budgetPercent = totalBudget > 0 ? Math.min((usedBudget / totalBudget) * 100, 100) : 0;
    const isOverBudget = usedBudget > totalBudget && totalBudget > 0;
    const [infoOpen, setInfoOpen] = useState(() => loadInfoOpen(trip.id, phase.key === 'upcoming'));
    const toggleInfo = () => setInfoOpen(prev => { saveInfoOpen(trip.id, !prev); return !prev; });
    const summary = [formatTripRange(trip.startDate, trip.endDate), formatNightsDays(tripDays), tripPlaceName(trip)].filter(Boolean).join(' · ');

    return (
        <>
            <div className="td-header">
                <button className="td-header-back" onClick={onBack} aria-label="뒤로">
                    <HiArrowLeft />
                </button>
                <div className="td-header-title-cell">
                    {/* 제목 텍스트만 기준으로 가운데 정렬 — 상태 칩은 제목 왼쪽 바깥에 따로 붙음 */}
                    <span className="td-header-title-wrap">
                        <span className={`td-title-status ${status.cls}`}>{status.text}</span>
                        <h1 className="td-header-title">{trip.title}</h1>
                    </span>
                </div>
                <div className="td-header-actions">
                    {onEdit && (
                        <button className="td-header-action edit" onClick={() => onEdit(trip)} aria-label="여행 수정">
                            <HiPencil />
                        </button>
                    )}
                    {onDelete && (
                        <button className="td-header-action delete" onClick={() => onDelete(trip.id)} aria-label="여행 삭제">
                            <HiTrash />
                        </button>
                    )}
                </div>
            </div>

            {!infoOpen ? (
                <>
                <button type="button" className="td-summary" onClick={toggleInfo} aria-expanded="false">
                    <span className="td-summary-text">{summary}</span>
                    <span className="td-summary-more">지도·정보 보기<HiChevronDown aria-hidden="true" /></span>
                </button>
                {/* 접혀 있어도 지역을 아직 안 골랐으면 알려 줌(펼친 약도 자리의 '지역 고르기'와 같은 동작) */}
                {!(trip.regions?.length > 0) && onEdit && (
                    <button type="button" className="td-summary-region" onClick={() => onEdit(trip)}>
                        우리 지도에 칠할 지역을 아직 안 골랐어요 · <b>지역 고르기</b>
                    </button>
                )}
                </>
            ) : (
            <>
            {/* 이번 여행 약도 — 제목 바로 아래 별도 섹션, 여행 지역 둘레로 확대 */}
            <div className="td-map-section"><TripMiniMap trip={trip} onPickRegion={onEdit} /></div>

            <div className="td-info-card">
                <div className="td-info-row">
                    <span className="td-info-icon"><HiCalendarDays /></span>
                    <span className="td-info-content">
                        <span className="td-info-label">여행 기간</span>
                        <span className="td-info-value">
                            {formatTripRange(trip.startDate, trip.endDate)}{' '}
                            <span className="td-info-sub">({formatNightsDays(tripDays)})</span>
                        </span>
                    </span>
                </div>
                {(trip.destination || trip.regions?.length > 0) && (
                    <div className="td-info-row">
                        <span className="td-info-icon"><HiMapPin /></span>
                        <span className="td-info-content">
                            <span className="td-info-label">여행지</span>
                            {/* 여행지를 직접 썼을 때만 큰 글씨로 — 비워 두면 아래 지역 줄이 곧 여행지라 같은 이름을 두 번 보여주지 않음 */}
                            {trip.destination?.trim() && <span className="td-info-value">{trip.destination}</span>}
                            {/* 지역은 시·도별로 한 줄씩: [전남광주] 광주 동구 · 광주 서구 */}
                            {trip.regions?.length > 0 && (
                                <span className="td-regions">
                                    {regionLines(trip.regions).map(l => (
                                        <span key={l.sido} className="td-region-line">
                                            <b className="td-region-sido">{l.sido}</b>
                                            {l.places.length > 0 && <span className="td-region-places">{l.places.join(' · ')}</span>}
                                        </span>
                                    ))}
                                </span>
                            )}
                        </span>
                    </div>
                )}
                {totalBudget > 0 && (
                    <div className="td-info-row">
                        <span className="td-info-icon td-info-icon-text">₩</span>
                        <span className="td-info-content td-info-content-budget">
                            <span className="td-info-label">예산</span>
                            <span className="td-info-value">
                                {usedBudget.toLocaleString()}원 / {totalBudget.toLocaleString()}원
                                {isOverBudget && <span className="td-info-over"> 초과!</span>}
                            </span>
                            <span className="td-info-budget-bar">
                                <span
                                    className={`td-info-budget-fill ${isOverBudget ? 'over' : ''}`}
                                    style={{ width: `${budgetPercent}%` }}
                                />
                            </span>
                        </span>
                    </div>
                )}
                {trip.description && (
                    <div className="td-info-row td-info-row-top">
                        <span className="td-info-icon"><HiDocumentText /></span>
                        <span className="td-info-content">
                            <span className="td-info-label">메모</span>
                            <span className="td-info-memo">{trip.description}</span>
                        </span>
                    </div>
                )}
                <button type="button" className="td-info-fold" onClick={toggleInfo} aria-expanded="true">접기<HiChevronUp aria-hidden="true" /></button>
            </div>
            </>
            )}
        </>
    );
};

export default TripDetailHeader;
