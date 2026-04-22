import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Admin-dashboard data hook.
 *
 * - Short in-memory cache keyed by `key` so navigating between detail
 *   pages and back avoids a re-fetch within the cache TTL.
 * - When `key` changes (e.g. a filter chip is tapped), we refresh
 *   automatically — no manual "refresh" button press required.
 * - `refresh()` is exposed for pull-to-refresh / explicit re-fetch.
 */

const CACHE_MS = 30 * 1000;
const cache = new Map<string, { at: number; data: unknown }>();

export interface UseAdminQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useAdminQuery<T>(
  key: string,
  fn: () => Promise<T>,
): UseAdminQueryResult<T> {
  const [data, setData] = useState<T | null>(() => {
    const hit = cache.get(key);
    return hit && Date.now() - hit.at < CACHE_MS ? (hit.data as T) : null;
  });
  const [isLoading, setIsLoading] = useState(!data);
  const [error, setError] = useState<Error | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fnRef.current();
      cache.set(key, { at: Date.now(), data: result });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [key]);

  // When `key` changes (filter / param update), re-read the cache for
  // the new key. If cached fresh → use it instantly. Otherwise → fetch.
  // This is what makes chip filters update results without a refresh tap.
  useEffect(() => {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) {
      setData(hit.data as T);
      setIsLoading(false);
      setError(null);
      return;
    }
    void refresh();
  }, [key, refresh]);

  return { data, isLoading, error, refresh };
}

/** For tests that need to reset cached results between runs. */
export function __clearAdminQueryCache(): void {
  cache.clear();
}
