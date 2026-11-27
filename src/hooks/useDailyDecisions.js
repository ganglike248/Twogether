// src/hooks/useDailyDecisions.js — 같이 정해요: 주제 목록 / 한 주제의 판 목록 구독
// 로딩은 "구독한 키의 첫 결과가 왔는지"로 파생(effect 안에서 상태를 바로 바꾸지 않음)
import { useEffect, useState } from 'react';
import { subscribeDecisionRounds, subscribeDecisionTopics } from '../services/decisions/dailyDecisionService';

export const useDecisionTopics = (coupleId) => {
  const [state, setState] = useState({ key: null, topics: [] });
  useEffect(() => {
    if (!coupleId) return undefined;
    return subscribeDecisionTopics(
      coupleId,
      (topics) => setState({ key: coupleId, topics }),
      () => setState((prev) => ({ key: coupleId, topics: prev.key === coupleId ? prev.topics : [] })),
    );
  }, [coupleId]);
  return { topics: state.key === coupleId ? state.topics : [], loading: !!coupleId && state.key !== coupleId };
};

export const useDecisionRounds = (topicId, coupleId) => {
  const key = topicId && coupleId ? `${topicId}:${coupleId}` : null;
  const [state, setState] = useState({ key: null, rounds: [] });
  useEffect(() => {
    if (!key) return undefined;
    return subscribeDecisionRounds(
      topicId,
      coupleId,
      (rounds) => setState({ key, rounds }),
      () => setState((prev) => ({ key, rounds: prev.key === key ? prev.rounds : [] })),
    );
  }, [key, topicId, coupleId]);
  return { rounds: state.key === key ? state.rounds : [], loading: !!key && state.key !== key };
};
