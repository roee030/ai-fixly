import { Platform } from 'react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useRequestsStore } from '../stores/useRequestsStore';
import { authService } from '../services/auth';
import { getFirestore, doc, getDoc } from '../services/firestore/imports';
import { setSessionUser } from '../services/analytics/sessionLogger';
import { setErrorReportingUser } from '../services/errorReporting';

/**
 * Subscribe to Firebase auth changes ONCE at module load. This runs outside
 * any React component or hook, so it's guaranteed to execute exactly once
 * even with React StrictMode, hot reloads, or multiple consumers of useAuth.
 *
 * KEY FIX: On web, Firebase fires onAuthStateChanged(null) FIRST, then fires
 * again with the cached user. We debounce the first null to prevent the
 * AuthGate from redirecting to the phone screen for 500ms.
 */
(function initAuthSubscription() {
  const { setUser, setLoading, setHasCompletedProfile } = useAuthStore.getState();
  setLoading(true);

  let isFirstCallback = true;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  authService.onAuthStateChanged(async (authUser) => {
    // On web, the FIRST callback often fires with null before the real user
    // loads from IndexedDB. Debounce the first null for 500ms to give
    // Firebase time to restore the session. If the real user arrives within
    // that window, the null is ignored entirely.
    if (Platform.OS === 'web' && isFirstCallback && authUser === null) {
      isFirstCallback = false;
      debounceTimer = setTimeout(() => {
        // Still null after 500ms — user is genuinely not logged in
        setUser(null);
        setHasCompletedProfile(false);
        useRequestsStore.getState().stopListening();
        setLoading(false);
      }, 500);
      return;
    }

    // Cancel the debounce if the real user arrived
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    isFirstCallback = false;

    setUser(authUser);
    // Tag every Sentry report with the current user — null on sign-out
    // clears the tag so signed-out crashes don't get attributed to the
    // last user.
    setErrorReportingUser(authUser?.uid || null);

    if (authUser) {
      setSessionUser(authUser.uid);

      // Don't block the loading state on the profile check.
      // Set loading=false FIRST so the app renders immediately,
      // then update hasCompletedProfile in the background.
      setLoading(false);

      // Background profile check (non-blocking)
      try {
        const userDoc = await getDoc(doc(getFirestore(), 'users', authUser.uid));
        const exists =
          typeof (userDoc as any).exists === 'function'
            ? (userDoc as any).exists()
            : (userDoc as any).exists;
        setHasCompletedProfile(Boolean(exists) && !!userDoc.data()?.displayName);
      } catch {
        setHasCompletedProfile(false);
      }

      // Start the persistent requests listener
      useRequestsStore.getState().startListening(authUser.uid);
    } else {
      setHasCompletedProfile(false);
      useRequestsStore.getState().stopListening();
      setLoading(false);
    }
  });
})();

/**
 * React hook that reads the current auth state from the store.
 * No subscription setup — that happens at module load.
 */
export function useAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hasCompletedProfile = useAuthStore((s) => s.hasCompletedProfile);
  return { isAuthenticated, isLoading, hasCompletedProfile };
}
