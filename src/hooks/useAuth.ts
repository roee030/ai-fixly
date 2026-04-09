import { useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { authService } from '../services/auth';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';

export function useAuth() {
  // Select individual values to avoid unnecessary re-renders
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompletedProfile = useAuthStore((s) => s.hasCompletedProfile);

  useEffect(() => {
    const { setUser, setLoading, setHasCompletedProfile } = useAuthStore.getState();
    setLoading(true);

    const unsubscribe = authService.onAuthStateChanged(async (authUser) => {
      setUser(authUser);
      if (authUser) {
        try {
          const userDoc = await getDoc(doc(getFirestore(), 'users', authUser.uid));
          // In @react-native-firebase v22+, `exists` is a method, not a property
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

    return unsubscribe;
  }, []);

  return { user, isLoading, isAuthenticated, hasCompletedProfile };
}
