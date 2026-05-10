import { logEvent as firebaseLogEvent } from 'firebase/analytics';
import { analytics } from '../firebase';

export const logPageView = (pageName, pagePath) => {
  try {
    firebaseLogEvent(analytics, 'page_view', {
      page_title: pageName,
      page_path: pagePath,
      page_location: window.location.href,
    });
  } catch (error) {
    console.warn('Failed to log page view:', error);
  }
};

export const logAnalyticsEvent = (eventName, eventData = {}) => {
  try {
    firebaseLogEvent(analytics, eventName, eventData);
  } catch (error) {
    console.warn(`Failed to log event "${eventName}":`, error);
  }
};
