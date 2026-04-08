export type AnalyticsEvent =
  | 'app_opened'
  | 'capture_started'
  | 'capture_photo_added'
  | 'capture_submitted'
  | 'ai_analysis_started'
  | 'ai_analysis_completed'
  | 'ai_analysis_failed'
  | 'request_created'
  | 'request_sent'
  | 'request_paused'
  | 'request_closed'
  | 'bid_received'
  | 'bid_selected'
  | 'provider_contacted';

export interface AnalyticsService {
  trackEvent(event: AnalyticsEvent, params?: Record<string, string | number>): void;
  setUserId(userId: string): void;
}
