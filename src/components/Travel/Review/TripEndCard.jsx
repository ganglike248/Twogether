// src/components/Travel/Review/TripEndCard.jsx
// 홈 '오늘' 탭 맨 위 "○○, 어땠어요?" — 끝난 여행을 내가 기록하거나 건너뛸 때까지 계속 보임(사람마다 따로).
// 여행이 끝나면 여행 탭엔 잘 안 들어가서 홈에서 상기시킴(시안 '여행 끝 1').
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getPendingReviewTrip, skipReview, tripDateStr, moodLabel } from '../../../services/tripReviewService';
import { getLocalDateStr } from '../../../utils/dataUtils';
import { getFriendlyErrorMessage } from '../../../utils/errorMessages';
import { useNameByUid } from '../../../hooks/useNameByUid';
import './TripReview.css';
import { pressable } from '../../../utils/pressable';

const dayDiff = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
const md = (s) => { const [, m, d] = s.split('-').map(Number); return `${m}월 ${d}일`; };

const TripEndCard = ({ trips, uid }) => {
  const nameOf = useNameByUid();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const trip = getPendingReviewTrip(trips, uid);
  if (!trip) return null;

  const end = tripDateStr(trip.endDate);
  const start = tripDateStr(trip.startDate);
  const ago = dayDiff(end, getLocalDateStr(new Date()));
  const nights = Math.max(0, dayDiff(start, end));
  const partnerUid = Object.keys(trip.review || {}).find(k => k !== uid);
  const partner = partnerUid ? trip.review[partnerUid] : null;

  const skip = async () => {
    if (busy) return;
    setBusy(true);
    try { await skipReview(trip.id, uid); } catch (err) {
      toast.error(getFriendlyErrorMessage(err, '잠시 후 다시 시도해주세요.'));
      setBusy(false);
    }
  };

  return (
    <div className="home-card trip-end-card" {...pressable(() => navigate(`/travel/${trip.id}/review`))}>
      <p className="trip-end-k">{ago <= 1 ? '어제 끝난 여행' : `${ago}일 전에 끝난 여행`}</p>
      <h2 className="trip-end-t">{trip.title},<br />어땠어요?</h2>
      <p className="trip-end-sub">{md(start)}{start !== end ? ` – ${md(end)} · ${nights}박 ${nights + 1}일` : ''}</p>
      {partner?.doneAt && (
        <p className="trip-end-partner">{nameOf(partnerUid)}님은 이미 기록했어요{partner.mood ? ` · ${moodLabel(partner.mood)}` : ''}</p>
      )}
      <div className="trip-end-actions">
        <button type="button" className="trv-btn" onClick={(e) => { e.stopPropagation(); skip(); }} disabled={busy}>이번엔 건너뛰기</button>
        <button type="button" className="trv-btn primary" onClick={(e) => { e.stopPropagation(); navigate(`/travel/${trip.id}/review`); }}>기록하러 가기</button>
      </div>
    </div>
  );
};

export default TripEndCard;
