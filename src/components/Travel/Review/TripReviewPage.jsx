// src/components/Travel/Review/TripReviewPage.jsx
// /travel/:tripId/review?step=1|2|3 — 여행이 끝난 뒤 기록(시안 '여행 끝 2~4').
//  1. 기분 + 자유 기록(상대 기록은 바로 보임)  2. 좋았던 순간 TOP 3  3. 우리 지도 기록 확인
// 단계마다 저장해서 중간에 나가도 쓴 글이 남음. 단계는 URL에서 파생하되 replace로 바꿈 — 방문 기록엔 기록 화면이
// 한 칸만 남아, 끝낸 뒤 지도·여행 상세에서 뒤로 가면 기록 중간 단계가 아니라 원래 화면으로 감.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MdClose, MdArrowBack } from 'react-icons/md';
import { useAuthContext } from '../../../contexts/AuthContext';
import { useTrips, useTripSchedules } from '../../../hooks/useTrip';
import AutoGrowTextarea from '../../common/AutoGrowTextarea';
import RegionPicker from '../Trip/RegionPicker';
import { getScheduleCategory } from '../Schedule/scheduleCategories';
import {
  MOODS, moodLabel, REVIEW_TEXT_MAX, saveMyReview, finishReview, firstTimeSggs,
} from '../../../services/tripReviewService';
import { groupRegions, SGG_BY_CODE } from '../../../services/regions/regionData';
import { getFriendlyErrorMessage } from '../../../utils/errorMessages';
import MoodFace from './MoodFace';
import { useNameByUid } from '../../../hooks/useNameByUid';
import './TripReview.css';

const TripReviewPage = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const step = Math.min(3, Math.max(1, Number(searchParams.get('step')) || 1));
  const { user, coupleId } = useAuthContext();
  const nameOf = useNameByUid();
  const uid = user?.uid;
  const { trips, loading } = useTrips(coupleId);
  const trip = trips.find(t => t.id === tripId);
  const { schedules } = useTripSchedules(tripId);

  const [mood, setMood] = useState('');
  const [text, setText] = useState('');
  const [top3, setTop3] = useState([]);
  const [regions, setRegions] = useState([]);
  const [editRegions, setEditRegions] = useState(false);
  const [saving, setSaving] = useState(false);
  const initRef = useRef(false);

  // 처음 한 번만 서버 값으로 채움(이후엔 내가 고치는 중인 값 유지)
  useEffect(() => {
    if (!trip || initRef.current) return;
    initRef.current = true;
    const mine = trip.review?.[uid] || {};
    setMood(mine.mood || '');
    setText(mine.text || '');
    setTop3(mine.top3 || []);
    setRegions(trip.regions || []);
  }, [trip, uid]);

  const partnerUid = useMemo(() => Object.keys(trip?.review || {}).find(k => k !== uid), [trip, uid]);
  const partnerReview = partnerUid ? trip.review[partnerUid] : null;
  const confirmedByOther = trip?.regionsConfirmedBy && trip.regionsConfirmedBy !== uid;
  const days = useMemo(() => schedules
    .filter(d => (d.schedules || []).length)
    .sort((a, b) => a.day - b.day), [schedules]);
  const newSggs = useMemo(() => (trip ? firstTimeSggs(trips, trip.id, regions) : []), [trips, trip, regions]);
  const newKeys = useMemo(() => new Set(newSggs.map(c => { const s = SGG_BY_CODE[c]; return `${s.sido}:${s.city}`; })), [newSggs]);

  const goStep = (n) => navigate(`/travel/${tripId}/review?step=${n}`, { replace: true });
  const close = () => {
    if (location.key === 'default') navigate(`/travel/${tripId}`, { replace: true });
    else navigate(-1);
  };

  const run = async (fn) => {
    if (saving) return;
    setSaving(true);
    try { await fn(); } catch (err) {
      toast.error(getFriendlyErrorMessage(err, '기록을 저장하지 못했어요. 잠시 후 다시 시도해주세요.'));
    } finally { setSaving(false); }
  };

  const next1 = () => run(async () => {
    await saveMyReview(tripId, uid, { mood, text: text.trim() });
    goStep(2);
  });
  const next2 = (skip) => run(async () => {
    await saveMyReview(tripId, uid, { top3: skip ? [] : top3 });
    goStep(3);
  });
  const finish = () => run(async () => {
    const confirm = !confirmedByOther || editRegions;
    const sparks = confirm ? newSggs : [];
    await finishReview(tripId, uid, { regions, confirmRegions: confirm });
    if (sparks.length) {
      navigate(`/map/${SGG_BY_CODE[sparks[0]].sido}`, { replace: true, state: { spark: sparks } });
    } else {
      toast.success('여행을 기록했어요');
      navigate(`/travel/${tripId}`, { replace: true });
    }
  });

  const toggleTop = (id) => setTop3(prev => (prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 3 ? prev : [...prev, id]));

  if (loading) return <div className="trv-page trv-center"><p className="trv-sub">불러오는 중…</p></div>;
  if (!trip) return <div className="trv-page trv-center"><p className="trv-sub">여행을 찾을 수 없어요.</p><button type="button" className="trv-btn" onClick={() => navigate('/travel', { replace: true })}>여행 목록으로</button></div>;

  return (
    <div className="trv-page">
      <div className="trv-top">
        <button type="button" className="trv-icon" onClick={step === 1 ? close : () => goStep(step - 1)} aria-label={step === 1 ? '닫기' : '이전 단계'}>
          {step === 1 ? <MdClose /> : <MdArrowBack />}
        </button>
        <span className="trv-top-title">{trip.title} 기록</span>
      </div>
      <div className="trv-steps" aria-label={`3단계 중 ${step}단계`}>{[1, 2, 3].map(n => <span key={n} className={n <= step ? 'on' : ''} />)}</div>

      {step === 1 && (
        <>
          <h1 className="trv-q">이번 여행 어땠어요?</h1>
          <div className="trv-moods" role="radiogroup" aria-label="기분">
            {MOODS.map(m => (
              <button key={m.key} type="button" role="radio" aria-checked={mood === m.key} className={`trv-mood${mood === m.key ? ' on' : ''}`} onClick={() => setMood(mood === m.key ? '' : m.key)}>
                <MoodFace kind={m.key} />{m.label}
              </button>
            ))}
          </div>
          <AutoGrowTextarea
            className="trv-text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, REVIEW_TEXT_MAX))}
            placeholder="자유롭게 남겨 보세요. 일기처럼 길게 써도 좋아요."
            maxLength={REVIEW_TEXT_MAX}
            aria-label="여행 기록"
          />
          <p className="trv-count">{text.length} / {REVIEW_TEXT_MAX}</p>
          {partnerReview && (partnerReview.text || partnerReview.mood) && (
            <div className="trv-partner">
              <b>{nameOf(partnerUid)}님의 기록{partnerReview.mood ? ` · ${moodLabel(partnerReview.mood)}` : ''}</b>
              {partnerReview.text && <p>{partnerReview.text}</p>}
            </div>
          )}
          <div className="trv-actions"><button type="button" className="trv-btn primary" onClick={next1} disabled={saving}>다음</button></div>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="trv-q">좋았던 순간 TOP 3</h1>
          <p className="trv-sub">좋았던 순서대로 눌러 주세요 · 다시 누르면 빠져요</p>
          {days.length === 0 && <p className="trv-empty">이 여행엔 일정표가 없어요. 건너뛰어도 괜찮아요.</p>}
          {days.map(d => (
            <div key={d.day} className="trv-day">
              <p className="trv-day-label">{d.day}일차</p>
              {d.schedules.map(s => {
                const rank = top3.indexOf(s.id) + 1;
                const cat = getScheduleCategory(s.category);
                return (
                  <button key={s.id} type="button" className={`trv-pick${rank ? ' on' : ''}`} onClick={() => toggleTop(s.id)} aria-pressed={!!rank}>
                    {cat && <span className="trv-pick-ic" style={{ color: cat.color, background: cat.bg }} aria-hidden="true"><cat.Icon /></span>}
                    <span className="trv-pick-tx"><b>{s.title}</b>{(s.time || s.location) && <span>{[s.time, s.location].filter(Boolean).join(' · ')}</span>}</span>
                    {rank ? <span className={`trv-rank r${rank}`}>{rank}</span> : <span className="trv-rank-empty" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="trv-actions">
            <button type="button" className="trv-btn" onClick={() => next2(true)} disabled={saving}>건너뛰기</button>
            <button type="button" className="trv-btn primary" onClick={() => next2(false)} disabled={saving}>다음</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          {confirmedByOther && !editRegions ? (
            <>
              <h1 className="trv-q">여행 지도는<br />이미 기록됐어요</h1>
              <p className="trv-who">{nameOf(trip.regionsConfirmedBy)}님이 우리 지도에 기록했어요</p>
              <div className="trv-paper">
                <div className="trv-chips">
                  {groupRegions(trip.regions || []).map(g => <span key={g.key} className="trv-chip">{g.codes.length ? `${g.sidoShort} · ${g.label}` : g.label}</span>)}
                  {!(trip.regions || []).length && <span className="trv-sub">고른 지역이 없어요</span>}
                </div>
                <p className="trv-sub small">고치면 두 사람의 지도에 같이 반영돼요</p>
              </div>
              <div className="trv-actions">
                <button type="button" className="trv-btn" onClick={() => { setRegions(trip.regions || []); setEditRegions(true); }} disabled={saving}>고치기</button>
                <button type="button" className="trv-btn primary" onClick={finish} disabled={saving}>이대로 좋아요</button>
              </div>
            </>
          ) : (
            <>
              <h1 className="trv-q">여행 지도에<br />이렇게 기록할까요?</h1>
              <div className="trv-paper">
                <RegionPicker value={regions} onChange={setRegions} newKeys={newKeys} />
                <p className="trv-sub small">여행지와 일정 주소에서 찾았어요 · 칩을 누르면 뺄 수 있어요</p>
              </div>
              <div className="trv-actions"><button type="button" className="trv-btn primary" onClick={finish} disabled={saving}>{regions.length ? '지도에 기록하기' : '기록 마치기'}</button></div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default TripReviewPage;
