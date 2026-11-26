// src/hooks/useTrip.js
import { useState, useEffect } from 'react';
import { subscribeToTrips, subscribeToTripSchedules } from '../services/tripService';

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
    const unsubscribe = subscribeToTripSchedules(tripId, (schedulesData) => {
      setSchedules(schedulesData);
      setLoading(false);
    }, () => setLoading(false));
    return () => { if (unsubscribe) unsubscribe(); };
  }, [tripId]);

  return { schedules, loading };
};
