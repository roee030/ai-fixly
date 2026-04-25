/**
 * Auto-suspension logic for low-rated providers.
 *
 * The rule: when a provider gets a fresh review, append it to a rolling
 * buffer of their last N ratings. If the buffer has at least
 * MIN_SAMPLES_FOR_DECISION entries AND the average of the buffer is below
 * MIN_AVG_RATING, mark the provider suspended.
 *
 * Why not "any 2 of last 5 below 3⭐":
 *   - Easier to communicate to providers ("your last 5 averaged 2.6").
 *   - Less sensitive to a single bad review in an otherwise-strong run
 *     (one 1⭐ in [5,5,5,5,1] gives avg 4.2 — fine).
 *   - Catches consistent decline ([3,2,3,2,1] → 2.2) AND late-stage slide
 *     ([5,2,3,2,1] → 2.6) without bespoke "consecutive" tracking.
 *
 * The buffer is stored on `providers_agg/{phone}.stats.recentRatings`,
 * oldest first. We read, push, slice to BUFFER_SIZE, write back atomically
 * with the review commit.
 *
 * Suspension is a soft block — the broadcast handler skips suspended
 * providers, but admin can flip `suspended: false` from the dashboard
 * and we'll start sending again. We never delete the provider doc.
 */

const BUFFER_SIZE = 5;
const MIN_SAMPLES_FOR_DECISION = 3;
const MIN_AVG_RATING = 3.0;

export interface SuspensionDecision {
  /** The new rolling buffer (after appending the new rating + slicing). */
  recentRatings: number[];
  /** Whether the provider should be suspended after this review. */
  shouldSuspend: boolean;
  /**
   * If shouldSuspend, a short Hebrew reason string for the admin alert.
   * undefined when shouldSuspend === false.
   */
  reason?: string;
  /** Average over the rolling buffer — exposed for the admin alert. */
  avgInBuffer: number;
}

/**
 * Decide whether a provider should be auto-suspended after a new review.
 *
 * Pure function — no I/O, no side effects. The caller is responsible for
 * persisting `recentRatings` and (if `shouldSuspend`) flipping the
 * suspended flag + creating the admin alert.
 *
 * @param previousRatings  The provider's last N ratings before this review
 *                         (oldest first, max BUFFER_SIZE entries).
 * @param newRating        The just-submitted rating (1-5 integer).
 * @param alreadySuspended Whether the provider is already suspended. If
 *                         true we never re-suspend (the admin's manual
 *                         decision wins).
 */
export function decideAutoSuspension(
  previousRatings: number[],
  newRating: number,
  alreadySuspended: boolean,
): SuspensionDecision {
  // Append the new rating, drop the oldest if we're past the buffer size.
  const next = [...previousRatings, newRating].slice(-BUFFER_SIZE);

  const avgInBuffer =
    next.reduce((sum, r) => sum + r, 0) / Math.max(next.length, 1);

  // Don't auto-suspend if the admin already manually un-suspended.
  // (We track this via the `alreadySuspended` flag — if it was true
  // when we re-evaluate, we keep the existing state.)
  if (alreadySuspended) {
    return { recentRatings: next, shouldSuspend: true, avgInBuffer };
  }

  // Need enough samples to make a fair call. A new provider's first
  // 1-star review shouldn't trigger suspension.
  if (next.length < MIN_SAMPLES_FOR_DECISION) {
    return { recentRatings: next, shouldSuspend: false, avgInBuffer };
  }

  if (avgInBuffer < MIN_AVG_RATING) {
    const sampleStr = next.join(',');
    return {
      recentRatings: next,
      shouldSuspend: true,
      avgInBuffer,
      reason: `ממוצע ${avgInBuffer.toFixed(1)}⭐ ב-${next.length} הביקורות האחרונות (${sampleStr})`,
    };
  }

  return { recentRatings: next, shouldSuspend: false, avgInBuffer };
}

export const PROVIDER_SUSPENSION_CONFIG = {
  BUFFER_SIZE,
  MIN_SAMPLES_FOR_DECISION,
  MIN_AVG_RATING,
};
