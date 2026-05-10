import { useCallback } from 'react';
import { logAnalyticsEvent } from '../services/analyticsService';

const useAnalytics = () => {
  const logEvent = useCallback((eventName, eventData = {}) => {
    logAnalyticsEvent(eventName, {
      ...eventData,
      timestamp: new Date().toISOString(),
    });
  }, []);

  return { logEvent };
};

export default useAnalytics;
