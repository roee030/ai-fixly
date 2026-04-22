import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';

/**
 * Redirects the user back to the permissions screen whenever location
 * access is revoked while the app is running. Covers the case where a
 * user grants permission at onboarding, then disables it later in
 * system Settings.
 *
 * Call once from a layout that wraps every authenticated screen.
 */
export function useLocationGuard() {
  useEffect(() => {
    const check = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          router.replace('/(auth)/permissions');
        }
      } catch {
        // Permission API unavailable (e.g. running on web during dev) —
        // fail open rather than bouncing the user unnecessarily.
      }
    };

    void check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => sub.remove();
  }, []);
}
