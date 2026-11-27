// src/components/Decisions/DecisionHomeCard.jsx
// 홈 '우리 이야기'의 같이 정해요 카드 — 정하는 중인 주제가 있으면 그 판 요약(후보 이름·내 평가 남음),
// 없으면 한 줄("같이 정할 게 있나요?"). 누르면 그 주제 / 목록.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiScale } from 'react-icons/hi2';
import { useAuthContext } from '../../contexts/AuthContext';
import { useDecisionTopics } from '../../hooks/useDailyDecisions';
import { pickHomeTopic, summarizeRound } from '../../services/decisions/dailyDecisionLogic';
import { subscribeDecisionRound } from '../../services/decisions/dailyDecisionService';
import { useNameByUid } from '../../hooks/useNameByUid';
import { pressable } from '../../utils/pressable';
import './Decisions.css';

const DecisionHomeCard = () => {
  const navigate = useNavigate();
  const { user, coupleId } = useAuthContext();
  const nameByUid = useNameByUid();
  const { topics, loading } = useDecisionTopics(coupleId);
  const topic = pickHomeTopic(topics);
  const roundKey = topic ? `${topic.id}/${topic.currentRoundId}` : null;
  const [roundState, setRoundState] = useState({ key: null, round: null });

  useEffect(() => {
    if (!roundKey) return undefined;
    const [tId, rId] = roundKey.split('/');
    return subscribeDecisionRound(tId, rId, (round) => setRoundState({ key: roundKey, round }), () => setRoundState({ key: roundKey, round: null }));
  }, [roundKey]);

  if (loading) return null;
  const round = roundState.key === roundKey ? roundState.round : null;

  if (!topic) {
    return (
      <div className="home-card home-decision-card" {...pressable(() => navigate('/decisions'))}>
        <div className="card-label"><HiScale className="card-label-icon" />같이 정해요</div>
        <span className="hdc-title">같이 정할 게 있나요?</span>
        <span className="hdc-sub">저녁 메뉴·주말 계획처럼 둘이 고민되는 걸 후보로 비교해요</span>
      </div>
    );
  }

  const s = round ? summarizeRound(round, user?.uid) : null;
  const partnerId = (round?.options || []).flatMap((o) => o.scores || []).find((x) => x.userId !== user?.uid)?.userId;
  const partnerName = partnerId ? nameByUid(partnerId) : '';
  const sub = !s ? '' : s.count === 0 ? '아직 후보가 없어요'
    : [`후보 ${s.count}개`, s.partnerScored && partnerName ? `${partnerName}님이 평가했어요` : null, s.unscoredByMe > 0 ? '내 평가를 기다려요' : '평가 다 했어요'].filter(Boolean).join(' · ');
  const go = () => navigate(`/decisions/${topic.id}`);

  return (
    <div className="home-card home-decision-card live" {...pressable(go)}>
      <div className="card-label"><HiScale className="card-label-icon" />같이 정해요</div>
      <span className="hdc-title">{topic.title} 정하는 중</span>
      {sub && <span className="hdc-sub">{sub}</span>}
      {s?.titles.length > 0 && (
        <div className="hdc-chips">
          {s.titles.slice(0, 3).map((t, i) => <span key={`${t}-${i}`} className="hdc-chip">{t}</span>)}
          {s.titles.length > 3 && <span className="hdc-chip">+{s.titles.length - 3}</span>}
        </div>
      )}
      <button type="button" className="hdc-go" onClick={(e) => { e.stopPropagation(); go(); }}>
        {s && s.count > 0 && s.unscoredByMe > 0 ? '평가하러 가기' : '결정 보러 가기'}
      </button>
    </div>
  );
};

export default DecisionHomeCard;
