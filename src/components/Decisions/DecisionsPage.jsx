// src/components/Decisions/DecisionsPage.jsx
// 같이 정해요 — 주제 목록(/decisions). 주제는 계속 다시 쓰고(저녁 메뉴·주말 뭐 하지), 누르면 주제 상세.
// 맨 위 한 줄로 새 주제(같은 이름이 있으면 그 주제로), 정하는 중 → 지난 주제 순.
import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import MenuPageHeader from '../common/MenuPage';
import { useAuthContext } from '../../contexts/AuthContext';
import { useDecisionTopics } from '../../hooks/useDailyDecisions';
import { sortTopics } from '../../services/decisions/dailyDecisionLogic';
import { createDecisionTopic } from '../../services/decisions/dailyDecisionService';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import { pressable } from '../../utils/pressable';
import { formatDay, withRo, SUGGESTED_TOPICS } from './decisionFormat';
import './Decisions.css';

const TopicRow = ({ topic, onOpen }) => {
  const live = !!topic.currentRoundId;
  const last = topic.lastResult;
  const sub = live
    ? (last ? `정하는 중 · 지난번엔 ${withRo(last.title)} 정했어요` : '후보를 모으고 평가하는 중이에요')
    : (last ? `${withRo(last.title)} 정했어요 · ${formatDay(last.atMs)}` : '아직 정한 적 없어요');
  return (
    <div className={`dcp-topic ${live ? 'live' : ''}`} {...pressable(() => onOpen(topic))}>
      <span className="dcp-topic-text">
        <span className="dcp-topic-title">{topic.title}</span>
        <span className="dcp-topic-sub">{sub}</span>
      </span>
      {live ? <span className="dcp-tag">정하는 중</span> : topic.roundCount > 0 && <span className="dcp-count">{topic.roundCount}번</span>}
    </div>
  );
};

const DecisionsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, coupleId } = useAuthContext();
  const { topics, loading } = useDecisionTopics(coupleId);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const { live, past } = useMemo(() => sortTopics(topics), [topics]);

  const back = () => (location.key === 'default' ? navigate('/', { replace: true }) : navigate(-1));
  const open = (topic) => navigate(`/decisions/${topic.id}`);

  const create = async (raw) => {
    const t = (raw ?? title).trim();
    if (!t || saving) return;
    const same = topics.find((x) => x.title.trim().toLowerCase() === t.toLowerCase());
    if (same) {
      toast.info('이미 있는 주제예요. 그 주제로 갈게요.');
      open(same);
      return;
    }
    setSaving(true);
    try {
      const id = await createDecisionTopic({ coupleId, userId: user.uid, title: t });
      setTitle('');
      navigate(`/decisions/${id}`);
    } catch (error) {
      toast.error(`주제를 만들지 못했어요.\n${getFriendlyErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="menu-page dcp-page">
      <MenuPageHeader title="같이 정해요" onBack={back} />

      <form className="dcp-add" onSubmit={(e) => { e.preventDefault(); create(); }}>
        <label className="dcs-sr" htmlFor="dcp-new-topic">새 주제 이름</label>
        <input
          id="dcp-new-topic"
          className="dcp-add-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="무엇을 정할까요? 예: 저녁 메뉴"
          maxLength={40}
        />
        <button type="submit" className="dcs-btn primary small" disabled={!title.trim() || saving}>+ 새 주제</button>
      </form>

      {loading ? (
        <div className="dcp-skeleton" aria-hidden="true"><span /><span /><span /></div>
      ) : topics.length === 0 ? (
        <div className="dcp-empty">
          <p className="dcp-empty-title">둘이 자주 고민하는 걸 적어 보세요</p>
          <p className="dcp-empty-text">후보를 모아 각자 평가하고, 정한 건 기록으로 남아요. 같은 주제는 다음에도 다시 써요.</p>
          <div className="dcp-suggest">
            {SUGGESTED_TOPICS.map((s) => (
              <button type="button" key={s} className="dcp-suggest-chip" onClick={() => create(s)} disabled={saving}>{s}</button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {live.length > 0 && (
            <section className="dcp-section">
              <h2 className="dcp-section-title">정하는 중</h2>
              {live.map((t) => <TopicRow key={t.id} topic={t} onOpen={open} />)}
            </section>
          )}
          {past.length > 0 && (
            <section className="dcp-section">
              <h2 className="dcp-section-title">지난 주제</h2>
              {past.map((t) => <TopicRow key={t.id} topic={t} onOpen={open} />)}
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default DecisionsPage;
