// src/components/Travel/Trip/TripDetailHeader.jsx
// 여행 상세 상단: 카드 없는 헤더 줄(뒤로 · 가운데 제목 · 수정/삭제) + 흰 여행 정보 카드
import React from 'react';
import { HiArrowLeft, HiPencil, HiTrash, HiMapPin, HiCalendarDays, HiDocumentText } from 'react-icons/hi2';
import { formatDate } from '../../../utils/dataUtils';
import { groupRegions } from '../../../services/regions/regionData';
import TripMiniMap from '../../Map/TripMiniMap';

// 여행 지역을 시·도별로 묶음 — [{ sido: '전남광주', places: ['광주 동구', '광주 서구'] }]
const regionLines = (regions) => {
    const map = new Map();
    groupRegions(regions).forEach(g => {
        if (!map.has(g.sidoShort)) map.set(g.sidoShort, []);
        if (g.codes.length) map.get(g.sidoShort).push(g.label);
    });
    return [...map.entries()].map(([sido, places]) => ({ sido, places }));
};

const STATUS_MAP = {
    planning: { text: '계획중', cls: 'planning' },
    confirmed: { text: '확정', cls: 'confirmed' },
    ongoing: { text: '진행중', cls: 'ongoing' },
    completed: { text: '완료', cls: 'completed' },
};

// "2026.10.31 – 11.02" — 같은 해면 종료일의 연도는 생략
const formatTripRange = (startDate, endDate) => {
    const start = formatDate(startDate, 'yyyy.MM.dd');
    if (!endDate) return start;
    const sameYear = formatDate(startDate, 'yyyy') === formatDate(endDate, 'yyyy');
    const end = formatDate(endDate, sameYear ? 'MM.dd' : 'yyyy.MM.dd');
    return `${start} – ${end}`;
};

const formatNightsDays = (tripDays) => (tripDays <= 1 ? '당일치기' : `${tripDays - 1}박 ${tripDays}일`);

const TripDetailHeader = ({ trip, tripDays, usedBudget, totalBudget, onBack, onEdit, onDelete }) => {
    const status = STATUS_MAP[trip.status] || STATUS_MAP.planning;
    const budgetPercent = totalBudget > 0 ? Math.min((usedBudget / totalBudget) * 100, 100) : 0;
    const isOverBudget = usedBudget > totalBudget && totalBudget > 0;

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
            </div>
        </>
    );
};

export default TripDetailHeader;
