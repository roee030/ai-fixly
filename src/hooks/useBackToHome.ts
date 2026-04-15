import { useEffect, useRef } from 'react';
import { BackHandler, Platform, Alert, ToastAndroid } from 'react-native';
import { router, usePathname } from 'expo-router';

/**
 * Android hardware back behavior:
 *
 *   On an inner screen → go back (normal navigation).
 *   On home tab        → first press shows a "press again to exit" toast;
 *                        second press exits the app within 2 seconds.
 *
 * iOS and web don't have a global back button, so this is a no-op there.
 * Call once at the root layout. Ignores all screens outside the tabs.
 */
export function useBackToHome() {
  const pathname = usePathname();
  const exitArmedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const isHome = pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/';
      const isOtherTab = pathname.startsWith('/(tabs)/') && !isHome;

      if (isOtherTab) {
        // Any other tab → jump to home instead of exiting.
        router.replace('/(tabs)');
        return true;
      }

      if (isHome) {
        if (exitArmedRef.current) return false; // let system close the app

        exitArmedRef.current = true;
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
        setTimeout(() => { exitArmedRef.current = false; }, 2000);
        return true;
      }

      // Inner screen (request details, chat, capture, etc.) — default back.
      return false;
    });

    return () => sub.remove();
  }, [pathname]);
}
