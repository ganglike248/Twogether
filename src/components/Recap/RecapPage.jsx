// src/components/Recap/RecapPage.jsx
// /recap/:period — 'YYYY-MM'이면 월간 요약(연말 랩업 'YYYY'는 2단계). 데이터를 읽어 계산한 뒤 스토리 뷰어로 보여줌.
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { fetchRecapData } from '../../services/recap/recapData';
import { buildMonthlyRecap } from '../../services/recap/monthlyRecap';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import RecapStory from './RecapStory';
import { MonthCalendarCard, MonthNumbersCard, MonthHighlightsCard, MonthNextCard } from './MonthlyCards';
import './Recap.css';

const RecapPage = () => {
  const { period } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userDoc, partnerDoc, coupleDoc, coupleId } = useAuthContext();
  const [state, setState] = useState({ loading: true, error: '', recap: null });

  const match = /^(\d{4})-(\d{2})$/.exec(period || '');
  const year = match ? Number(match[1]) : null;
  const month = match ? Number(match[2]) : null;

  useEffect(() => {
    if (!coupleId || !year) return;
    let alive = true;
    fetchRecapData(coupleId)
      .then(data => {
        if (!alive) return;
        const nameOf = (uid) => (uid === user?.uid ? userDoc?.displayName : partnerDoc?.displayName) || '';
        setState({ loading: false, error: '', recap: buildMonthlyRecap(data, { year, month, coupleDoc, nameOf }) });
      })
      .catch(err => alive && setState({ loading: false, error: getFriendlyErrorMessage(err, '요약을 불러오지 못했어요.'), recap: null }));
    return () => { alive = false; };
  }, [coupleId, year, month, coupleDoc, user?.uid, userDoc?.displayName, partnerDoc?.displayName]);

  const close = () => {
    if (location.key === 'default') navigate('/', { replace: true });
    else navigate(-1);
  };

  if (!year) return <div className="rc-screen rc-center"><p className="rc-d">잘못된 주소예요.</p><button type="button" className="rc-btn" onClick={close}>닫기</button></div>;
  if (state.loading) return <div className="rc-screen rc-center"><p className="rc-d">{month}월의 우리를 모으는 중…</p></div>;
  if (state.error || !state.recap) {
    return (
      <div className="rc-screen rc-center">
        <p className="rc-d">{state.error || `${month}월에는 함께한 일정이 없어서 요약을 만들지 않았어요.`}</p>
        <button type="button" className="rc-btn" onClick={close}>닫기</button>
      </div>
    );
  }

  const { recap } = state;
  const cards = [
    <MonthCalendarCard key="cal" calendar={recap.calendar} />,
    <MonthNumbersCard key="num" numbers={recap.numbers} />,
    recap.highlights && <MonthHighlightsCard key="hl" highlights={recap.highlights} />,
    <MonthNextCard key="next" next={recap.next} onAddEvent={() => navigate(`/calendar/event/new/${recap.next.year}-${String(recap.next.month).padStart(2, '0')}-01`, { state: { modal: true } })} />,
  ].filter(Boolean);

  return <RecapStory label={`${year}년 ${month}월의 우리`} cards={cards} onClose={close} />;
};

export default RecapPage;
