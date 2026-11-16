// src/components/Recap/RecapPage.jsx
// /recap/:period — 'YYYY-MM'이면 월간 요약, 'YYYY'면 연말 랩업. 데이터를 읽어 계산한 뒤 스토리 뷰어로 보여줌.
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { fetchRecapData } from '../../services/recap/recapData';
import { buildMonthlyRecap } from '../../services/recap/monthlyRecap';
import { buildYearRecap } from '../../services/recap/yearRecap';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import { captureRecapImage } from '../../services/recap/recapImage';
import { saveImageFile } from '../../services/fileSave';
import RecapExport from './RecapExport';
import RecapStory from './RecapStory';
import { MonthCalendarCard, MonthNumbersCard, MonthHighlightsCard, MonthNextCard } from './MonthlyCards';
import {
  YearCoverCard, YearCalendarCard, YearMonthsCard, YearTripsCard, YearBucketsCard, YearMomentsCard,
  YearLettersCard, YearWordsCard, YearHabitsCard, YearCompareCard, YearSummaryCard,
} from './YearCards';
import './Recap.css';

const parsePeriod = (period) => {
  const m = /^(\d{4})(?:-(\d{2}))?$/.exec(period || '');
  if (!m) return null;
  const month = m[2] ? Number(m[2]) : null;
  if (month !== null && (month < 1 || month > 12)) return null;
  return { year: Number(m[1]), month };
};

const RecapPage = () => {
  const { period } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userDoc, partnerDoc, coupleDoc, coupleId } = useAuthContext();
  const [state, setState] = useState({ loading: true, error: '', recap: null });
  const [saving, setSaving] = useState(false);
  const exportRef = useRef(null);

  const parsed = parsePeriod(period);
  const year = parsed?.year ?? null;
  const month = parsed?.month ?? null;
  const isYear = !!parsed && month === null;
  const what = isYear ? `${year}년` : `${month}월`;

  useEffect(() => {
    if (!coupleId || !year) return;
    let alive = true;
    fetchRecapData(coupleId)
      .then(data => {
        if (!alive) return;
        const nameOf = (uid) => (uid === user?.uid ? userDoc?.displayName : partnerDoc?.displayName) || '';
        const recap = month === null
          ? buildYearRecap(data, { year, coupleDoc, nameOf })
          : buildMonthlyRecap(data, { year, month, coupleDoc, nameOf });
        setState({ loading: false, error: '', recap });
      })
      .catch(err => alive && setState({ loading: false, error: getFriendlyErrorMessage(err, '요약을 불러오지 못했어요.'), recap: null }));
    return () => { alive = false; };
  }, [coupleId, year, month, coupleDoc, user?.uid, userDoc?.displayName, partnerDoc?.displayName]);

  const close = () => {
    if (location.key === 'default') navigate('/', { replace: true });
    else navigate(-1);
  };

  const saveImage = async () => {
    if (saving || !exportRef.current) return;
    setSaving(true);
    try {
      const dataUrl = await captureRecapImage(exportRef.current);
      const result = await saveImageFile({ fileName: `우리두리_${period}${isYear ? '_랩업' : ''}.png`, dataUrl });
      if (result.saved) toast.success('이미지를 저장했어요');
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, '이미지를 저장하지 못했어요.'));
    } finally {
      setSaving(false);
    }
  };

  if (!parsed) return <div className="rc-screen rc-center"><p className="rc-d">잘못된 주소예요.</p><button type="button" className="rc-btn" onClick={close}>닫기</button></div>;
  if (state.loading) return <div className="rc-screen rc-center"><p className="rc-d">{what}의 우리를 모으는 중…</p></div>;
  if (state.error || !state.recap) {
    return (
      <div className="rc-screen rc-center">
        <p className="rc-d">{state.error || (isYear
          ? `${year}년에는 함께한 일정이 5개가 안 돼서 랩업을 만들지 않았어요.`
          : `${month}월에는 함께한 일정이 없어서 요약을 만들지 않았어요.`)}</p>
        <button type="button" className="rc-btn" onClick={close}>닫기</button>
      </div>
    );
  }

  const { recap } = state;
  if (isYear) {
    const cards = [
      <YearCoverCard key="cover" cover={recap.cover} />,
      <YearCalendarCard key="cal" calendar={recap.calendar} />,
      recap.monthScenes && <YearMonthsCard key="months" scenes={recap.monthScenes} />,
      recap.trips && <YearTripsCard key="trips" trips={recap.trips} />,
      recap.buckets && <YearBucketsCard key="buckets" buckets={recap.buckets} />,
      recap.moments && <YearMomentsCard key="moments" moments={recap.moments} />,
      recap.letters && <YearLettersCard key="letters" letters={recap.letters} />,
      <YearWordsCard key="words" words={recap.words} />,
      <YearHabitsCard key="habits" habits={recap.habits} />,
      recap.compare && <YearCompareCard key="compare" compare={recap.compare} />,
      <YearSummaryCard key="summary" summary={recap.summary} onClose={close} onSave={saveImage} saving={saving} />,
    ].filter(Boolean);
    return (
      <>
        <RecapStory key={period} label={`${year} 우리두리 랩업`} cards={cards} onClose={close} />
        <RecapExport ref={exportRef} recap={recap} isYear />
      </>
    );
  }

  const cards = [
    <MonthCalendarCard key="cal" calendar={recap.calendar} />,
    <MonthNumbersCard key="num" numbers={recap.numbers} />,
    recap.highlights && <MonthHighlightsCard key="hl" highlights={recap.highlights} />,
    <MonthNextCard key="next" next={recap.next} onAddEvent={() => navigate(`/calendar/event/new/${recap.next.year}-${String(recap.next.month).padStart(2, '0')}-01`, { state: { modal: true } })} onSave={saveImage} saving={saving} />,
  ].filter(Boolean);

  return (
    <>
      <RecapStory key={period} label={`${year}년 ${month}월의 우리`} cards={cards} onClose={close} />
      <RecapExport ref={exportRef} recap={recap} isYear={false} />
    </>
  );
};

export default RecapPage;
