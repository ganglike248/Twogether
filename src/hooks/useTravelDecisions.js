// src/hooks/useTravelDecisions.js
import { useState, useEffect } from 'react';
import { subscribeToDecisions } from '../services/travelDecisionService';
import { subscribeWithPermissionRetry } from '../services/subscribeError';

export const useTravelDecisions = (tripId) => {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tripId) {
      setLoading(false);
      setDecisions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 방금 만든 여행이면 한 번 거부될 수 있어 조용히 다시 시도, 그래도 실패하면 로딩 종료
      const unsubscribe = subscribeWithPermissionRetry((onErr) => subscribeToDecisions(tripId, (data) => {
        setDecisions(data);
        setLoading(false);
      }, (err) => { const r = onErr(err); if (r !== 'retry') { setError(err); setLoading(false); } return r; }));

      return () => {
        if (unsubscribe) unsubscribe();
      };
    } catch (err) {
      console.error('Error subscribing to decisions:', err);
      setError(err);
      setLoading(false);
    }
  }, [tripId]);

  return { decisions, loading, error };
};
