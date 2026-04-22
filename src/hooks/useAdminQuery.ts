import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Admin-dashboard data hook. Wraps an arbitrary async query with:
 *   - 60s in-memory cache keyed by `key` (page-to-page navigation doesn't re-fetch)
 *   - manual `refresh()` for pull-to-refresh buttons
 *   - `isLoading` / `error` that a consumer can render
 *
 * We deliberately DO NOT subscribe to Firestore listeners here. The admin
 * page refreshes on demand — listeners on lists of thousands of requests
 * would be expensive and unnecessary.
 */

const CACHE_MS = 60 * 1000;
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

  useEffect(() => {
    if (data) return;
    void refresh();
  }, [key, data, refresh]);

  return { data, isLoading, error, refresh };
}

/** For tests that need to reset cached results between runs. */
export function __clearAdminQueryCache(): void {
  cache.clear();
}
