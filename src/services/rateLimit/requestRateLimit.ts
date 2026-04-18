import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Client-side rate limiting for "create a service request".
 *
 * Design goal: first request goes through instantly; each subsequent attempt
 * within the same hour costs the user a longer cooldown. If the user keeps
 * hammering after crossing 5 requests/hour we apply a 1-hour hard block.
 *
 * This is intentionally a CLIENT-side speed bump — the Worker enforces the
 * real limit server-side (defense in depth). Rules:
 *
 *   Requests in last hour   Wait until next one
 *   ────────────────────    ────────────────────
 *   0 (none)                0 — allow immediately
 *   1                       30s from the last attempt
 *   2                       2 min
 *   3                       5 min
 *   4                       15 min
 *   5+                      60 min (hard "spam" block — count >= 5)
 *
 * We store the ISO timestamps of successful submissions in AsyncStorage and
 * prune entries older than the cooldown window before making decisions.
 * Pruning means a user who quiets down for a few hours gets a clean slate.
 */

const STORAGE_KEY = 'ai-fixly:request-rate-limit:v1';
// Entries older than this are irrelevant — their cooldown contribution has
// long expired AND they don't count toward the 5/hour spam threshold.
const MAX_TRACKED_WINDOW_MS = 60 * 60 * 1000;

export const COOLDOWN_STEPS_SEC = [0, 30, 120, 300, 900] as const;
export const SPAM_BLOCK_SEC = 60 * 60;
/** When `countInWindow >= SPAM_BLOCK_THRESHOLD`, we apply SPAM_BLOCK_SEC. */
export const SPAM_BLOCK_THRESHOLD = 5;

export type CooldownReason = 'allowed' | 'cooldown' | 'spam-block';

export interface CooldownDecision {
  /** Unix ms at which the user may submit again. Equal to `now` if allowed. */
  allowedAt: number;
  /** Full-second remaining wait. Equal to 0 when allowed. */
  waitMs: number;
  reason: CooldownReason;
  /** How many successful submissions fell inside the tracked window. */
  countInWindow: number;
}

/**
 * Pure decision function. Given the sorted timestamps of previous successful
 * submissions (newest last, in Unix ms) and the current time, return whether
 * the next submission is allowed now and if not, until when.
 *
 * Keeping this pure makes it trivial to unit-test the tier boundaries.
 */
export function decideCooldown(
  previousTimestamps: number[],
  now: number = Date.now(),
): CooldownDecision {
  const inWindow = previousTimestamps
    .filter((t) => now - t < MAX_TRACKED_WINDOW_MS)
    .sort((a, b) => a - b);
  const count = inWindow.length;
  if (count === 0) {
    return { allowedAt: now, waitMs: 0, reason: 'allowed', countInWindow: 0 };
  }
  const last = inWindow[inWindow.length - 1];
  if (count >= SPAM_BLOCK_THRESHOLD) {
    const allowedAt = last + SPAM_BLOCK_SEC * 1000;
    return {
      allowedAt,
      waitMs: Math.max(0, allowedAt - now),
      reason: 'spam-block',
      countInWindow: count,
    };
  }
  const waitSec = COOLDOWN_STEPS_SEC[count] ?? 0;
  const allowedAt = last + waitSec * 1000;
  const waitMs = Math.max(0, allowedAt - now);
  return {
    allowedAt,
    waitMs,
    reason: waitMs === 0 ? 'allowed' : 'cooldown',
    countInWindow: count,
  };
}

/**
 * Load the stored timestamps from AsyncStorage, pruning anything older than
 * the tracked window so the list stays tiny.
 */
export async function loadTimestamps(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed
      .filter((n: unknown) => typeof n === 'number' && isFinite(n))
      .filter((t: number) => now - t < MAX_TRACKED_WINDOW_MS);
  } catch {
    return [];
  }
}

/** Append a fresh timestamp and persist (pruned). */
export async function recordSubmission(at: number = Date.now()): Promise<void> {
  try {
    const existing = await loadTimestamps();
    const next = [...existing, at]
      .filter((t) => at - t < MAX_TRACKED_WINDOW_MS)
      .slice(-20); // Safety cap so corrupt state can't grow unbounded.
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Persisting the timestamp is a nice-to-have. If it fails the Worker
    // still enforces the real limit.
  }
}

/** Reset everything — useful in dev tools or on "delete account". */
export async function resetSubmissions(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
