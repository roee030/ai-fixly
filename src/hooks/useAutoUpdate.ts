import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * Silently fetch + apply OTA updates whenever the app returns to the
 * foreground. The user never has to manually tap "check for updates".
 *
 * Flow:
 *   1. App comes back to foreground (AppState 'active').
 *   2. Throttle: skip if we checked in the last 60s.
 *   3. checkForUpdateAsync() — cheap HEAD request to EAS.
 *   4. If available, fetchUpdateAsync() downloads the bundle in parallel
 *      with whatever the user is doing.
 *   5. reloadAsync() on success — small flash, new JS active.
 *
 * Swallows ALL errors. If EAS is down or there's no network, we silently
 * fall back to whatever version is already running.
 *
 * Wire this once from the root layout (_layout.tsx).
 */

const MIN_CHECK_INTERVAL_MS = 60 * 1000;

export function useAutoUpdate() {
  const lastCheckedAt = useRef<number>(0);
  const inFlight = useRef(false);

  useEffect(() => {
    // expo-updates is a no-op in dev; bail early to avoid noise.
    if (__DEV__) return;

    const check = async (why: string) => {
      if (inFlight.current) return;
      const now = Date.now();
      if (now - lastCheckedAt.current < MIN_CHECK_INTERVAL_MS) return;
      lastCheckedAt.current = now;
      inFlight.current = true;

      try {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable) return;

        await Updates.fetchUpdateAsync();
        // Slight delay to let any in-progress UI animation settle before
        // the JS engine reload kicks in.
        setTimeout(() => { void Updates.reloadAsync(); }, 300);
      } catch {
        // EAS unreachable or transient network issue — silent.
      } finally {
        inFlight.current = false;
      }
    };

    // Kick one check immediately on mount (covers cold start).
    void check('mount');

    const handle = (state: AppStateStatus) => {
      if (state === 'active') void check('resume');
    };
    const sub = AppState.addEventListener('change', handle);
    return () => sub.remove();
  }, []);
}
