// src/components/Recap/RecapListPage.jsx
// /recap — 지난 월간 요약 목록(커플 일정이 1개 이상 있는 달만). 설정 → "지난 요약 다시 보기"에서 진입.
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HiChevronRight } from 'react-icons/hi2';
import { useAuthContext } from '../../contexts/AuthContext';
import { fetchRecapData } from '../../services/recap/recapData';
import { listRecapMonths } from '../../services/recap/monthlyRecap';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import MenuPageHeader from '../common/MenuPage';
import '../common/MenuPage.css';
import '../Settings/SettingsPage.css';
import './Recap.css';

const RecapListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { coupleId } = useAuthContext();
  const [state, setState] = useState({ loading: true, error: '', months: [], counts: {} });

  useEffect(() => {
    if (!coupleId) return;
    let alive = true;
    fetchRecapData(coupleId)
      .then(data => {
        if (!alive) return;
        const counts = {};
        data.events.forEach(e => { const k = e.startStr.slice(0, 7); counts[k] = (counts[k] || 0) + 1; });
        setState({ loading: false, error: '', months: listRecapMonths(data), counts });
      })
      .catch(err => alive && setState({ loading: false, error: getFriendlyErrorMessage(err, '목록을 불러오지 못했어요.'), months: [], counts: {} }));
    return () => { alive = false; };
  }, [coupleId]);

  const back = () => {
    if (location.key === 'default') navigate('/settings', { replace: true });
    else navigate(-1);
  };

  return (
    <div className="menu-page recap-list-page">
      <MenuPageHeader title="지난 요약" onBack={back} />
      {state.loading && <p className="recap-list-msg">불러오는 중…</p>}
      {state.error && <p className="recap-list-msg">{state.error}</p>}
      {!state.loading && !state.error && state.months.length === 0 && (
        <p className="recap-list-msg">아직 요약할 일정이 없어요. 함께한 일정이 생기면 달마다 요약이 만들어져요.</p>
      )}
      <div className="recap-list">
        {state.months.map(k => {
          const [y, m] = k.split('-').map(Number);
          return (
            <button key={k} type="button" className="settings-item" onClick={() => navigate(`/recap/${k}`)}>
              <span className="recap-list-month" aria-hidden="true">{m}월</span>
              <span className="settings-item-text">
                <span className="settings-item-title">{y}년 {m}월의 우리</span>
                <span className="settings-item-desc">함께한 일정 {state.counts[k] || 0}개</span>
              </span>
              <HiChevronRight className="settings-item-arrow" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RecapListPage;
