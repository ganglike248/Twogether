// src/hooks/useTrip.js
import { useState, useEffect } from 'react';
import { subscribeToTrips, subscribeToTripSchedules } from '../services/tripService';
import { subscribeWithPermissionRetry } from '../services/subscribeError';

export const useTrips = (coupleId) => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coupleId) {
      setTrips([]);
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeToTrips(coupleId, (tripsData) => {
      setTrips(tripsData);
      setLoading(false);
    }, () => setLoading(false)); // 구독 실패해도 로딩이 끝나게(안내는 서비스에서)
    return () => { if (unsubscribe) unsubscribe(); };
  }, [coupleId]);

  return { trips, loading };
};

export const useTripSchedules = (tripId) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) {
      setSchedules([]);
      setLoading(false);
      return;
    }
    // 방금 만든 여행이면 서버 반영 전에 한 번 거부될 수 있어 조용히 다시 시도(subscribeWithPermissionRetry)
    const unsubscribe = subscribeWithPermissionRetry((onErr) => subscribeToTripSchedules(tripId, (schedulesData) => {
      setSchedules(schedulesData);
      setLoading(false);
    }, (err) => { const r = onErr(err); if (r !== 'retry') setLoading(false); return r; }));
    return () => { if (unsubscribe) unsubscribe(); };
  }, [tripId]);

  return { schedules, loading };
};
