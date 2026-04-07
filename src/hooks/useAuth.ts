import { useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { authService } from '../services/auth';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';

export function useAuth() {
  const { setUser, setLoading, setHasCompletedProfile } = useAuthStore();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(getFirestore(), 'users', user.uid));
          setHasCompletedProfile(userDoc.exists && !!userDoc.data()?.displayName);
        } catch {
          setHasCompletedProfile(false);
        }
      } else {
        setHasCompletedProfile(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [setUser, setLoading, setHasCompletedProfile]);

  return useAuthStore();
}
