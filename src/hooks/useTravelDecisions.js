// src/hooks/useTravelDecisions.js
import { useState, useEffect } from 'react';
import { subscribeToDecisions } from '../services/travelDecisionService';

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
      const unsubscribe = subscribeToDecisions(tripId, (data) => {
        setDecisions(data);
        setLoading(false);
      });

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
