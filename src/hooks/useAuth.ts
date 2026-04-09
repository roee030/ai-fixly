import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { authService } from '../services/auth';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';

/**
 * Initialize the auth subscription once at app start.
 * Returns nothing — consumers should call useAuthStore selectors directly
 * for the values they need (isLoading, isAuthenticated, hasCompletedProfile).
 *
 * This avoids returning a new object on every render (which would destabilize
 * any useEffect dep using it).
 */
let subscriptionInitialized = false;

export function useAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hasCompletedProfile = useAuthStore((s) => s.hasCompletedProfile);

  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current || subscriptionInitialized) return;
    initRef.current = true;
    subscriptionInitialized = true;

    const { setUser, setLoading, setHasCompletedProfile } = useAuthStore.getState();
    setLoading(true);

    const unsubscribe = authService.onAuthStateChanged(async (authUser) => {
      setUser(authUser);
      if (authUser) {
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
      } else {
        setHasCompletedProfile(false);
      }
      setLoading(false);
    });

    // Store unsubscribe on module so hot-reload doesn't leak
    return () => {
      subscriptionInitialized = false;
      unsubscribe();
    };
  }, []);

  return { isAuthenticated, isLoading, hasCompletedProfile };
}
