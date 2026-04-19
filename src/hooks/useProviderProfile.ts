import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { subscribeToProviderProfile } from '../services/providers/providerProfileService';
import type { ProviderProfile } from '../types/providerProfile';

interface UseProviderProfileResult {
  /** Null while loading, null when user isn't a provider, populated when they are. */
  profile: ProviderProfile | null;
  /** True until the first snapshot resolves. */
  isLoading: boolean;
  /** Convenience boolean — true once `profile` is non-null. */
  isProvider: boolean;
}

/**
 * Live binding to the current user's `providerProfile`. Returns null
 * while loading AND when the user is a regular customer; consumers can
 * use `isProvider` to disambiguate.
 *
 * Used by:
 *   - Tab navigator (decides whether to render the Dashboard tab).
 *   - Profile screen (renders the badge + provider section).
 *   - Dashboard screen itself (header + vacation toggle binding).
 */
export function useProviderProfile(): UseProviderProfileResult {
  const uid = useAuthStore((s) => s.user?.uid);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const unsubscribe = subscribeToProviderProfile(uid, (next) => {
      setProfile(next);
      setIsLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  return { profile, isLoading, isProvider: profile !== null };
}
