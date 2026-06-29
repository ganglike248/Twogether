// src/hooks/useTravelChecklist.js
import { useState, useEffect } from 'react';
import { subscribeToChecklist } from '../services/travelChecklistService';

export const useTravelChecklist = (tripId) => {
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tripId) {
      setLoading(false);
      setChecklist(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const unsubscribe = subscribeToChecklist(tripId, (data) => {
        setChecklist(data);
        setLoading(false);
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    } catch (err) {
      console.error('Error subscribing to checklist:', err);
      setError(err);
      setLoading(false);
    }
  }, [tripId]);

  return { checklist, loading, error };
};
