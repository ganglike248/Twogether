// src/components/Decisions/DecisionTopicPage.jsx
// 같이 정해요 — 주제 상세(/decisions/:topicId): 위 '이번 결정'(여행 후보 카드 그대로: 평가·즐겨찾기·확정) +
// [돌림판으로 정하기], 아래 '지난 결정'(날짜·고른 것·후보 수). 확정하면 이번 판이 지난 결정으로 내려가고 [새로 정하기]만 남음.
// 모달은 주소에서 파생(?modal=option|option-add|option-edit(&photo=1)|new-round|wheel|rename) — 뒤로가기로 닫힘. 확인창만 상태.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MdClose } from 'react-icons/md';
import MenuPageHeader from '../common/MenuPage';
import ConfirmModal from '../common/ConfirmModal';
import { useAuthContext } from '../../contexts/AuthContext';
import { useQueryModal } from '../../hooks/useQueryModal';
import { useDecisionRounds, useDecisionTopics } from '../../hooks/useDailyDecisions';
import { lastResultAfterRemoving, splitRounds, summarizeRound } from '../../services/decisions/dailyDecisionLogic';
import {
  addRoundOption, decideRoundOption, deleteDecisionTopic, deleteHistoryRound, deleteRoundOption,
  renameDecisionTopic, scoreRoundOption, startDecisionRound, toggleRoundFavorite, updateRoundOption,
} from '../../services/decisions/dailyDecisionService';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import { CardRow } from '../Travel/Decisions/DecisionSection';
import OptionDetailSheet from '../Travel/Decisions/OptionDetailSheet';
import OptionFormSheet from '../Travel/Decisions/OptionFormSheet';
import { getMembers } from '../Travel/Decisions/optionScoreUtils';
import { getRankMap } from '../Travel/Decisions/decisionViewUtils';
import '../Travel/Decisions/DecisionSection.css';
import NewRoundSheet from './NewRoundSheet';
import DecisionWheelSheet from './DecisionWheelSheet';
import TopicNameSheet from './TopicNameSheet';
import { formatDay, withRo } from './decisionFormat';
import './Decisions.css';

const DecisionTopicPage = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, coupleId, coupleDoc, getMemberName } = useAuthContext();
  const { topics, loading: topicsLoading } = useDecisionTopics(coupleId);
  const { rounds, loading: roundsLoading } = useDecisionRounds(topicId, coupleId);
  const topic = topics.find((t) => t.id === topicId) || null;
  const { current, history } = useMemo(() => splitRounds(rounds, topic?.currentRoundId), [rounds, topic?.currentRoundId]);
  const members = getMembers(coupleDoc, getMemberName);
  const uid = user?.uid;

  const qm = useQueryModal();
  const modal = qm.modal;
  // { type: 'decide'|'deleteOption'|'deleteTopic'|'deleteHistory', option?, round?, viaWheel? }
  const [confirm, setConfirm] = useState(null);

  // 모달 여닫기가 겹치면(iOS) 히스토리가 꼬이므로 전환 하나가 끝날 때까지 다음 요청 무시(여행 후보 탭과 같음)
  const navLockRef = useRef(false);
  useEffect(() => { navLockRef.current = false; }, [location.key]);
  const guarded = (fn) => {
    if (navLockRef.current) return;
    navLockRef.current = true;
    setTimeout(() => { navLockRef.current = false; }, 700);
    fn();
  };
  const openModal = (type, params, opts) => guarded(() => qm.open(type, params, opts));
  const closeModal = () => guarded(() => qm.close());
  const back = () => (location.key === 'default' ? navigate('/decisions', { replace: true }) : navigate(-1));

  // 지워진 주제(다른 기기에서 삭제 등)면 목록으로
  const missing = !topicsLoading && !topic;
  useEffect(() => {
    if (!missing) return;
    toast.info('이미 지워진 주제예요.');
    navigate('/decisions', { replace: true });
  }, [missing, navigate]);

  const run = async (task, success, failure) => {
    try {
      await task();
      if (success) toast.success(success);
      return true;
    } catch (error) {
      console.error(failure, error);
      toast.error(`${failure}\n${getFriendlyErrorMessage(error)}`);
      return false;
    }
  };

  const roundId = current?.id;
  const sheetOption = current && modal === 'option' ? (current.options || []).find((o) => o.id === qm.get('o')) : null;
  const editOption = current && modal === 'option-edit' ? (current.options || []).find((o) => o.id === qm.get('o')) : null;

  // 여행 후보 카드·상세 시트가 부르는 동작(같은 이름으로 맞춤)
  const actions = {
    toggleFavorite: (_d, option) => run(() => toggleRoundFavorite(topicId, roundId, option.id), null, '즐겨찾기 처리 중 오류가 발생했어요.'),
    saveScore: (_d, option, score, comment) => run(
      () => scoreRoundOption(topicId, roundId, option.id, uid, score, comment), `${score}점 평가했어요!`, '점수 저장 중 오류가 발생했어요.',
    ),
    toggleDecided: (_d, option) => setConfirm({ type: 'decide', option }),
    requestDeleteOption: (_d, option) => setConfirm({ type: 'deleteOption', option }),
    editOption: (_d, option) => openModal('option-edit', { o: option.id }),
    addOption: () => openModal('option-add'),
  };

  const handleConfirm = async () => {
    const c = confirm;
    setConfirm(null);
    if (c.type === 'decide') {
      const ok = await run(
        () => decideRoundOption(topicId, roundId, c.option.id, uid, c.viaWheel),
        `${withRo(c.option.title)} 정했어요!`,
        '확정 중 오류가 발생했어요.',
      );
      if (ok && modal) closeModal();
    } else if (c.type === 'deleteOption') {
      const ok = await run(() => deleteRoundOption(topicId, roundId, c.option.id), '후보를 삭제했어요.', '후보 삭제 중 오류가 발생했어요.');
      if (ok && sheetOption?.id === c.option.id) closeModal();
    } else if (c.type === 'deleteHistory') {
      await run(
        () => deleteHistoryRound(topicId, c.round.id, lastResultAfterRemoving(history, c.round.id)),
        '지난 결정을 지웠어요.',
        '지우는 중 오류가 발생했어요.',
      );
    } else if (c.type === 'deleteTopic') {
      const ok = await run(() => deleteDecisionTopic(topicId, coupleId), '주제를 삭제했어요.', '주제 삭제 중 오류가 발생했어요.');
      if (ok) navigate('/decisions', { replace: true });
    }
  };

  const confirmCopy = confirm && {
    decide: {
      title: confirm.viaWheel ? '돌림판 결과로 정할까요?' : '이걸로 정할까요?',
      message: `${withRo(confirm.option?.title)} 정하면 이번 결정이 끝나고 지난 결정에 남아요.`,
      confirmText: '정했어요', danger: false,
    },
    deleteOption: { title: '후보 삭제', message: '이 후보를 삭제할까요?', confirmText: '삭제', danger: true },
    deleteHistory: { title: '지난 결정 지우기', message: '이 기록을 지울까요?', confirmText: '지우기', danger: true },
    deleteTopic: {
      title: '주제 삭제',
      message: history.length > 0 ? `이 주제를 삭제할까요? 지난 결정 ${history.length}개도 함께 지워져요.` : '이 주제를 삭제할까요?',
      confirmText: '삭제', danger: true,
    },
  }[confirm.type];

  if (topicsLoading || roundsLoading || !topic) {
    return (
      <div className="menu-page dcp-page">
        <MenuPageHeader title="같이 정해요" onBack={back} />
        <div className="dcp-skeleton" aria-hidden="true"><span className="tall" /><span /><span /></div>
      </div>
    );
  }

  const summary = current ? summarizeRound(current, uid) : null;
  const options = current ? [...(current.options || [])].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0)) : [];

  return (
    <div className="menu-page dcp-page">
      <MenuPageHeader title={topic.title} onBack={back} />

      <section className="dcp-section">
        <div className="dcp-sechd">
          <h2 className="dcp-section-title">이번 결정</h2>
          <span className="dcp-sechd-sub">
            {current
              ? (summary.count === 0 ? '후보를 더해 주세요' : `후보 ${summary.count}개${summary.unscoredByMe > 0 ? ` · 내 평가 ${summary.unscoredByMe}개 남음` : ' · 평가 다 했어요'}`)
              : topic.lastResult ? `지난번: ${topic.lastResult.title} · ${formatDay(topic.lastResult.atMs)}` : ''}
          </span>
        </div>
        {current ? (
          <>
            <div className="dcp-cards">
              <CardRow
                decision={current}
                options={options}
                rankMap={getRankMap(current.options)}
                cardProps={{ members, currentUserId: uid, actions, onOpenSheet: (_d, option, opts = {}) => openModal('option', { o: option.id, score: opts.score ? '1' : '' }) }}
                actions={actions}
              />
            </div>
            <button
              type="button"
              className="dcs-btn wide"
              onClick={() => (options.length < 2 ? toast.info('후보가 2개 이상 있어야 돌릴 수 있어요.') : openModal('wheel'))}
            >
              돌림판으로 정하기
            </button>
          </>
        ) : (
          <div className="dcp-again">
            <p className="dcp-again-title">다시 정해 볼까요?</p>
            <button type="button" className="dcs-btn primary" onClick={() => openModal('new-round')}>새로 정하기</button>
          </div>
        )}
      </section>

      <section className="dcp-section">
        <div className="dcp-sechd">
          <h2 className="dcp-section-title">지난 결정</h2>
          {history.length > 0 && <span className="dcp-sechd-sub">{history.length}번</span>}
        </div>
        {history.length === 0 ? (
          <p className="dcp-none">정하고 나면 여기에 차곡차곡 남아요.</p>
        ) : history.map((r) => (
          <div key={r.id} className="dcp-hist">
            <span className="dcp-hist-day">{formatDay(r.decidedAtMs)}</span>
            <span className="dcp-hist-text">
              <span className="dcp-hist-title">{r.decidedTitle}</span>
              <span className="dcp-hist-sub">후보 {(r.options || []).length}개 중{r.viaWheel ? ' · 돌림판' : ''}</span>
            </span>
            <button type="button" className="dcp-hist-del" onClick={() => setConfirm({ type: 'deleteHistory', round: r })} aria-label={`${r.decidedTitle} 기록 지우기`}>
              <MdClose />
            </button>
          </div>
        ))}
      </section>

      <div className="dcp-topic-acts">
        <button type="button" className="dcp-link" onClick={() => openModal('rename')}>이름 바꾸기</button>
        <button type="button" className="dcp-link danger" onClick={() => setConfirm({ type: 'deleteTopic' })}>주제 삭제</button>
      </div>

      {sheetOption && (
        <OptionDetailSheet
          key={sheetOption.id}
          decision={current}
          option={sheetOption}
          rank={getRankMap(current.options)[sheetOption.id]}
          members={members}
          currentUserId={uid}
          actions={actions}
          startScoring={qm.get('score') === '1'}
          onClose={closeModal}
        />
      )}
      {current && modal === 'option-add' && (
        <OptionFormSheet
          mode="add"
          topicTitle={topic.title}
          photoOpen={qm.get('photo') === '1'}
          onOpenPhoto={() => openModal('option-add', { photo: '1' })}
          onClose={closeModal}
          onSave={async (option) => {
            const ok = await run(() => addRoundOption(topicId, roundId, option), '후보가 추가됐어요.', '후보 추가 중 오류가 발생했어요.');
            if (ok) closeModal();
          }}
        />
      )}
      {editOption && (
        <OptionFormSheet
          key={editOption.id}
          mode="edit"
          topicTitle={topic.title}
          option={editOption}
          photoOpen={qm.get('photo') === '1'}
          onOpenPhoto={() => openModal('option-edit', { o: editOption.id, photo: '1' })}
          onClose={closeModal}
          onSave={async (fields) => {
            const ok = await run(() => updateRoundOption(topicId, roundId, editOption.id, fields), '후보가 수정됐어요.', '후보 수정 중 오류가 발생했어요.');
            if (ok) closeModal();
          }}
        />
      )}
      {!current && modal === 'new-round' && (
        <NewRoundSheet
          history={history}
          onClose={closeModal}
          onStart={async (opts) => {
            const ok = await run(() => startDecisionRound({ topicId, coupleId, userId: uid, options: opts }), null, '시작하지 못했어요.');
            if (ok) closeModal();
            return ok;
          }}
        />
      )}
      {current && modal === 'wheel' && (
        <DecisionWheelSheet
          options={current.options || []}
          onClose={closeModal}
          onDecide={(optionId) => {
            const option = (current.options || []).find((o) => o.id === optionId);
            if (option) setConfirm({ type: 'decide', option, viaWheel: true });
          }}
        />
      )}
      {modal === 'rename' && (
        <TopicNameSheet
          initial={topic.title}
          onClose={closeModal}
          onSave={async (t) => {
            const ok = await run(() => renameDecisionTopic(topicId, t), '이름을 바꿨어요.', '이름을 바꾸지 못했어요.');
            if (ok) closeModal();
            return ok;
          }}
        />
      )}
      <ConfirmModal
        isOpen={!!confirm}
        {...(confirmCopy || {})}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
};

export default DecisionTopicPage;
