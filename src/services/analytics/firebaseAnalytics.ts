import analytics from '@react-native-firebase/analytics';
import { AnalyticsService, AnalyticsEvent } from './types';

class FirebaseAnalyticsService implements AnalyticsService {
  trackEvent(event: AnalyticsEvent, params?: Record<string, string | number>): void {
    analytics().logEvent(event, params).catch(() => {});
  }

  setUserId(userId: string): void {
    analytics().setUserId(userId).catch(() => {});
  }
}

export const analyticsService: AnalyticsService = new FirebaseAnalyticsService();
