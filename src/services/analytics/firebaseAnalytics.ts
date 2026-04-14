import { getApp } from '@react-native-firebase/app';
import { getAnalytics, logEvent, setUserId } from '@react-native-firebase/analytics';
import { AnalyticsService, AnalyticsEvent } from './types';

/**
 * Firebase Analytics using the v22+ modular API.
 * The namespaced API (analytics().xxx) was deprecated in v22.
 */
class FirebaseAnalyticsService implements AnalyticsService {
  private get analytics() {
    return getAnalytics(getApp());
  }

  trackEvent(event: AnalyticsEvent, params?: Record<string, string | number>): void {
    logEvent(this.analytics, event, params).catch(() => {});
  }

  setUserId(userId: string): void {
    setUserId(this.analytics, userId).catch(() => {});
  }
}

export const analyticsService: AnalyticsService = new FirebaseAnalyticsService();
