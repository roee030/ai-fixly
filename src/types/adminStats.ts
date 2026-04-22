/**
 * Pre-computed daily rollup written by the worker cron. Admin overview
 * graphs read 30 or 90 of these instead of aggregating across all
 * serviceRequests on every page load.
 */

export interface DailyCityStats {
  requestsCreated: number;
  reviewsSubmitted: number;
  avgTimeToFirstResponseMin: number;
  avgRating: number;
  grossValue: number;
}

export interface AdminDailyStats {
  /** 'YYYY-MM-DD' in Israel local time. */
  date: string;
  requestsCreated: number;
  reviewsSubmitted: number;
  avgTimeToFirstResponseMin: number;
  avgRating: number;
  grossValue: number;
  byCity: Record<string, DailyCityStats>;
}
