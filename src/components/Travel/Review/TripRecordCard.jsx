// src/components/Travel/Review/TripRecordCard.jsx
// 여행 상세의 '여행 기록' 카드(시안 '여행 끝 6') — 끝난 여행에서만. 두 사람의 기분·기록·TOP 3, 둘 다 1위로 고른 곳.
// 아직 아무도 안 썼으면 [여행 기록하기] 한 줄만. 긴 기록은 접어 두고 [전체 보기].
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../../contexts/AuthContext';
import { moodLabel, tripDateStr, isReviewDone } from '../../../services/tripReviewService';
import { getLocalDateStr } from '../../../utils/dataUtils';
import MoodFace from './MoodFace';
import { useNameByUid } from '../../../hooks/useNameByUid';
import './TripReview.css';

const LONG = 160;

const ReviewBlock = ({ name, review, titleOf }) => {
  const [open, setOpen] = useState(false);
  const text = review.text || '';
  const top = (review.top3 || []).map(titleOf).filter(Boolean);
  return (
    <div className="trc-rv">
      <div className="trc-rv-h">
        {review.mood && <span className="trc-mood"><MoodFace kind={review.mood} size={18} /></span>}
        <b>{name}</b>{review.mood && <span>· {moodLabel(review.mood)}</span>}
      </div>
      {text && <p className={open ? '' : 'clamp'}>{open || text.length <= LONG ? text : `${text.slice(0, LONG)}…`}</p>}
      {text.length > LONG && <button type="button" className="trc-more" onClick={() => setOpen(o => !o)}>{open ? '접기' : '전체 보기'}</button>}
      {top.length > 0 && (
        <ol className="trc-top">{top.map((t, i) => <li key={i}><em>{i + 1}</em>{t}</li>)}</ol>
      )}
    </div>
  );
};

const TripRecordCard = ({ trip, schedules = [] }) => {
  const navigate = useNavigate();
  const { user, coupleDoc } = useAuthContext();
  const nameOf = useNameByUid();
  const end = tripDateStr(trip.endDate);
  if (!end || end >= getLocalDateStr(new Date())) return null; // 끝난 여행만

  const titles = {};
  schedules.forEach(d => (d.schedules || []).forEach(s => { titles[s.id] = s.title; }));
  const titleOf = (id) => titles[id];
  const members = coupleDoc?.members || Object.keys(trip.review || {});
  const written = members
    .map(uid => ({ uid, review: trip.review?.[uid] }))
    .filter(x => x.review && (x.review.text || x.review.mood || (x.review.top3 || []).length));
  const firsts = written.map(x => x.review.top3?.[0]).filter(Boolean);
  const bothFirst = written.length === 2 && firsts.length === 2 && firsts[0] === firsts[1] ? titleOf(firsts[0]) : null;
  const mineDone = isReviewDone(trip, user?.uid) && trip.review?.[user?.uid]?.doneAt;
  const go = () => navigate(`/travel/${trip.id}/review`);

  return (
    <section className="trc" aria-label="여행 기록">
      <div className="trc-head">
        <h2 className="trc-title">여행 기록</h2>
        <button type="button" className="trc-edit" onClick={go}>{mineDone ? '내 기록 고치기' : '기록하기'}</button>
      </div>
      {written.length === 0 ? (
        <button type="button" className="trc-empty" onClick={go}>이번 여행은 어땠나요? 기분과 좋았던 순간을 남겨 보세요</button>
      ) : (
        <>
          {bothFirst && <p className="trc-both">둘 다 1위로 고른 곳 <b>{bothFirst}</b></p>}
          {written.map(x => <ReviewBlock key={x.uid} name={nameOf(x.uid)} review={x.review} titleOf={titleOf} />)}
        </>
      )}
    </section>
  );
};

export default TripRecordCard;
