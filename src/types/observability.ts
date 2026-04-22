/**
 * Types that back the admin observability layer.
 *
 * Every service call (Gemini, uploads, Firestore writes, Places search,
 * Twilio send, push notification) emits a RequestEvent into
 * `serviceRequests/{id}/events/*`. The main request doc carries denormalized
 * summaries so admin list views stay fast.
 *
 * See docs/plans/2026-04-22-admin-and-foundation-design.md for rationale.
 */

export type RequestEventType =
  | 'gemini'
  | 'upload_image'
  | 'upload_video'
  | 'firestore_write'
  | 'places_search'
  | 'twilio_send'
  | 'push_notify'
  | 'first_response'
  | 'review_submitted'
  | 'broadcast_failed';

export interface RequestEvent {
  id: string;
  type: RequestEventType;
  ok: boolean;
  /** Server timestamp when the event was logged. */
  startedAt: Date;
  durationMs: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface BroadcastSummary {
  sentCount: number;
  failedCount: number;
  providersFound: number;
  startedAt: Date;
  finishedAt?: Date;
}

export interface ServiceSummary {
  geminiMs: number;
  uploadMs: number;
  firestoreWriteMs: number;
  totalMs: number;
  hadError: boolean;
}

/**
 * Coarse bucket for filtering requests and providers in the admin by
 * geography. Resolved from lat/lng via hardcoded bounding boxes in
 * src/utils/resolveCity.ts.
 */
export interface LocationSummary {
  city: string;
  region: string;
}

export interface ReviewSummary {
  rating: number;
  comment: string;
  pricePaid: number;
  submittedAt: Date;
}
