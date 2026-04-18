import { useCallback, useEffect, useState } from 'react';
import {
  CooldownDecision,
  decideCooldown,
  loadTimestamps,
  recordSubmission,
} from '../services/rateLimit/requestRateLimit';

/**
 * Hook that tracks the cooldown state for "create a service request".
 *
 * - Loads the stored timestamps on mount and whenever the screen refocuses.
 * - Re-evaluates the cooldown once per second so the countdown UI stays
 *   current without re-rendering 60 times a second.
 * - Exposes a `markSubmitted()` callback the caller invokes after a
 *   SUCCESSFUL broadcast — we deliberately don't increment on failed
 *   attempts, so network errors don't unfairly throttle the user.
 */
export function useRequestRateLimit() {
  const [decision, setDecision] = useState<CooldownDecision>({
    allowedAt: Date.now(),
    waitMs: 0,
    reason: 'allowed',
    countInWindow: 0,
  });

  const refresh = useCallback(async () => {
    const stamps = await loadTimestamps();
    setDecision(decideCooldown(stamps));
  }, []);

  useEffect(() => {
    void refresh();
    // Live countdown: re-evaluate once per second. Cheaper than using
    // setInterval(100ms) and close enough for the "X:YY" display.
    const id = setInterval(() => {
      void refresh();
    }, 1000);
    return () => clearInterval(id);
  }, [refresh]);

  const markSubmitted = useCallback(async () => {
    await recordSubmission();
    await refresh();
  }, [refresh]);

  return {
    decision,
    isBlocked: decision.waitMs > 0,
    markSubmitted,
    refresh,
  };
}
