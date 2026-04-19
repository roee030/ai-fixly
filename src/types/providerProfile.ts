/**
 * Provider profile — a sub-document on the user record that turns a regular
 * customer account into a service provider. Owners (admins) attach this
 * field to a user via the `add-provider` / `import-providers` CLI scripts;
 * the app then unlocks the Dashboard tab when it sees this field.
 *
 * The provider's location is required because:
 *   - The broker matches requests to providers by distance (lat/lng + radius).
 *   - V2 will render a service-area map with the radius circle.
 *
 * Vacation toggle: when `isOnVacation` is true, the broker SKIPS this
 * provider when dispatching new WhatsApp jobs. Existing in-flight jobs
 * keep going — vacation only affects future broadcasts.
 */
export interface ProviderProfile {
  /** Profession key from PROFESSIONS in `src/constants/problemMatrix.ts`. */
  profession: string;
  /** Hebrew display label, denormalized so the app doesn't have to look it up. */
  professionLabelHe: string;
  /**
   * The provider's WhatsApp-capable phone in E.164 format. Stored on the
   * profile (in addition to the user's auth phone) so the broker can match
   * legacy bids by phone even if the provider's auth phone changes later.
   */
  phone: string;
  /** Service-area center. Defaults to where the provider is based. */
  location: { lat: number; lng: number };
  /** Service radius in km. V1 default 20km — V2 will let the provider edit on map. */
  serviceRadiusKm: number;
  /** Vacation switch — true means the broker skips this provider in dispatch. */
  isOnVacation: boolean;
  /** When the owner approved + activated this provider. */
  approvedAt: Date;
}

/**
 * Status of a single bid from the provider's perspective. Derived
 * client-side by joining `bids` with their parent `serviceRequest`:
 *
 *   - 'sent'      — bid exists, request still OPEN, no winner picked
 *   - 'selected'  — request.selectedBidId === this bid's id, status IN_PROGRESS
 *   - 'completed' — request.selectedBidId === this bid's id, status CLOSED
 *   - 'lost'      — request was CLOSED but a different bid was selected
 *   - 'expired'   — request still OPEN but its availability time has passed
 */
export type ProviderBidStatus =
  | 'sent'
  | 'selected'
  | 'completed'
  | 'lost'
  | 'expired';

/** A single row on the provider's "ההצעות שלי" history list. */
export interface ProviderBidHistoryItem {
  bidId: string;
  requestId: string;
  /** Short description of the issue, taken from the parent request. */
  problemSummary: string;
  /** City of the request, for context ("דליפה בנתניה"). */
  city: string;
  price: number | null;
  /** UTC ISO start of the offered window. */
  availabilityStartAt: string | null;
  /** UTC ISO end of the offered window. */
  availabilityEndAt: string | null;
  status: ProviderBidStatus;
  /** When the bid was submitted. */
  createdAt: Date;
}

/**
 * Aggregate counters for the provider's stats card. We always compute
 * relative to the calendar month (Israel local) the dashboard is opened
 * in — this is by design, so the numbers reset visibly on the 1st and
 * give the provider a fresh psychological hook each month.
 */
export interface ProviderMonthlyStats {
  /** Calendar month covered by these stats — 0-indexed (0 = Jan). */
  monthIndex: number;
  /** Year for clarity / future "show me last March" UI. */
  year: number;
  /** Bids submitted this month. */
  bidsSent: number;
  /** Of those, how many the customer picked. */
  bidsSelected: number;
  /** Of selected, how many reached the CLOSED state (job done). */
  jobsCompleted: number;
  /**
   * Selected / Sent, rounded to nearest integer percent. 0 when no bids
   * sent (we display "—" in the UI in that case rather than 0%).
   */
  successRatePct: number;
}
