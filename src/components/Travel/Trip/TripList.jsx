// src/components/Travel/Trip/TripList.jsx
// 여행 목록(v1.2.5 개편, 시안 '여행 목록 A') — 구역으로 나눔: 여행 중(큰 카드) / 다가오는(D-day 카드) / 다녀옴(한 줄 목록).
// 상태·순서는 날짜로 계산(services/tripPhase.js). 수정·삭제와 예산 사용 금액은 상세 화면에서만
// (예전엔 카드마다 일정표를 따로 구독해 사용 금액을 더했음 — 여행이 많으면 목록이 느려짐).
import React, { useState } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { useTripSchedules } from '../../../hooks/useTrip';
import { tripPlaceName } from '../../../services/regions/regionData';
import {
  groupTripsByPhase, getTripDday, getTripTodayDay, getTripDayCount, tripDateStr,
} from '../../../services/tripPhase';
import { REVIEW_FEATURE_START, isReviewDone, moodLabel } from '../../../services/tripReviewService';
import { getLocalDateStr } from '../../../utils/dataUtils';
import { pressable } from '../../../utils/pressable';
import './TripList.css';

const PAST_PREVIEW = 5;

// '2026-11-25' → '11.25'
const md = (s) => (s ? `${Number(s.slice(5, 7))}.${s.slice(8, 10)}` : '');
const rangeText = (trip) => {
  const s = tripDateStr(trip.startDate); const e = tripDateStr(trip.endDate) || s;
  return s === e ? md(s) : `${md(s)} – ${md(e)}`;
};
const nightsText = (days) => (days <= 1 ? '당일치기' : `${days - 1}박 ${days}일`);

// 여행 중 — 오늘 Day와 오늘 일정 진행(이 카드만 일정표를 구독)
const TripNowCard = ({ trip, todayStr, onOpen }) => {
  const { schedules } = useTripSchedules(trip.id);
  const days = getTripDayCount(trip.startDate, trip.endDate);
  const today = Math.min(getTripTodayDay(trip, todayStr), days);
  const items = schedules.find(d => d.day === today)?.schedules || [];
  const done = items.filter(s => s.completed).length;
  const place = tripPlaceName(trip);
  return (
    <div className="tvl-item tvl-now" {...pressable(() => onOpen(trip))}>
      <span className="tvl-tape" aria-hidden="true" />
      <p className="tvl-now-k">지금 여행 중{days > 1 ? ` · Day ${today} / ${days}` : ''}</p>
      <h3 className="tvl-now-t">{trip.title}</h3>
      <p className="tvl-now-m">
        {[rangeText(trip), place, items.length ? `오늘 일정 ${items.length}개 중 ${done}개 완료` : '오늘 일정은 아직 없어요'].filter(Boolean).join(' · ')}
      </p>
      {items.length > 0 && (
        <span className="tvl-bar" aria-hidden="true"><i style={{ width: `${Math.round((done / items.length) * 100)}%` }} /></span>
      )}
    </div>
  );
};

const TripUpcomingCard = ({ trip, todayStr, onOpen }) => {
  const dday = getTripDday(trip, todayStr);
  const days = getTripDayCount(trip.startDate, trip.endDate);
  const place = tripPlaceName(trip);
  return (
    <div className="tvl-item tvl-card" {...pressable(() => onOpen(trip))}>
      <span className="tvl-dd"><b>D-{dday}</b><small>{md(tripDateStr(trip.startDate))}</small></span>
      <span className="tvl-tx">
        <b>{trip.title}</b>
        <span>{[rangeText(trip), nightsText(days), place].filter(Boolean).join(' · ')}</span>
        {trip.budget > 0 && <span>예산 {trip.budget.toLocaleString()}원</span>}
      </span>
    </div>
  );
};

const TripPastRow = ({ trip, uid, todayStr, onOpen }) => {
  const end = tripDateStr(trip.endDate) || tripDateStr(trip.startDate);
  const sameYear = end.slice(0, 4) === todayStr.slice(0, 4);
  const mine = trip.review?.[uid];
  const waiting = end >= REVIEW_FEATURE_START && !isReviewDone(trip, uid);
  const side = waiting ? '기록 남기기 ›' : mine?.mood ? moodLabel(mine.mood) : tripPlaceName(trip);
  return (
    <li className="tvl-item tvl-prow" {...pressable(() => onOpen(trip))}>
      <em>{sameYear ? `${Number(end.slice(5, 7))}월` : `${end.slice(2, 4)}.${Number(end.slice(5, 7))}월`}</em>
      <b>{trip.title}</b>
      <span className={waiting ? 'wait' : ''}>{side}</span>
    </li>
  );
};

const TripList = ({ trips, onOpen }) => {
  const { user } = useAuthContext();
  const [showAllPast, setShowAllPast] = useState(false);
  const todayStr = getLocalDateStr();
  const { ongoing, upcoming, past } = groupTripsByPhase(trips, todayStr);
  const visiblePast = showAllPast ? past : past.slice(0, PAST_PREVIEW);

  return (
    <div className="tvl">
      {ongoing.length > 0 && (
        <section className="tvl-section" aria-label="여행 중">
          <h2 className="tvl-sec">여행 중</h2>
          {ongoing.map(t => <TripNowCard key={t.id} trip={t} todayStr={todayStr} onOpen={onOpen} />)}
        </section>
      )}
      {upcoming.length > 0 && (
        <section className="tvl-section" aria-label="다가오는 여행">
          <h2 className="tvl-sec">다가오는 <span>{upcoming.length}</span></h2>
          {upcoming.map(t => <TripUpcomingCard key={t.id} trip={t} todayStr={todayStr} onOpen={onOpen} />)}
        </section>
      )}
      {past.length > 0 && (
        <section className="tvl-section" aria-label="다녀온 여행">
          <h2 className="tvl-sec">다녀옴 <span>{past.length}</span></h2>
          <ul className="tvl-past">
            {visiblePast.map(t => <TripPastRow key={t.id} trip={t} uid={user?.uid} todayStr={todayStr} onOpen={onOpen} />)}
          </ul>
          {past.length > PAST_PREVIEW && (
            <button type="button" className="tvl-more" onClick={() => setShowAllPast(v => !v)}>
              {showAllPast ? '접기' : `${past.length - PAST_PREVIEW}개 더 보기`}
            </button>
          )}
        </section>
      )}
    </div>
  );
};

export default TripList;
