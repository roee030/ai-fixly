import { getAnalytics, logEvent, setUserId } from 'firebase/analytics';
import { firebaseApp } from '../../config/firebaseWeb';
import { AnalyticsService, AnalyticsEvent } from './types';

let analytics: ReturnType<typeof getAnalytics> | null = null;
try {
  analytics = getAnalytics(firebaseApp);
} catch {
  // Analytics may not be available (e.g. localhost without measurement ID)
}

class FirebaseAnalyticsWebService implements AnalyticsService {
  trackEvent(event: AnalyticsEvent, params?: Record<string, string | number>): void {
    if (analytics) logEvent(analytics, event, params);
  }

  setUserId(userId: string): void {
    if (analytics) setUserId(analytics, userId);
  }
}

export const analyticsService: AnalyticsService = new FirebaseAnalyticsWebService();
