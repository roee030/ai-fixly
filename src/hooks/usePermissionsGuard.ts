import { useEffect } from 'react';
import { AppState, Platform, PermissionsAndroid } from 'react-native';
import * as Location from 'expo-location';
import {
  getMessaging,
  hasPermission,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';
import { useAppStore } from '../stores/useAppStore';
import { logger } from '../services/logger';

/**
 * Continuously enforce the "the user has granted location + notifications"
 * invariant throughout the app's lifetime.
 *
 * The /auth/permissions screen is a one-time hard gate at onboarding. Users
 * can (and do) go into Android Settings and revoke those permissions after
 * the fact — at which point the app silently stops getting pushes and the
 * broadcast loop starts to fall apart without any UI signal.
 *
 * This hook re-checks both permissions every time the app returns to the
 * foreground. If either was revoked we clear `hasCompletedPermissions` in
 * the app store, which makes AuthGate (in app/_layout.tsx) route the user
 * back to /auth/permissions the next render. Once they grant again, the
 * permissions screen writes the flag back to true and forwards to tabs.
 *
 * Web is exempt — browser permissions are handled per-action at runtime,
 * and there's no "system settings" path to revoke ahead of time.
 */
export function usePermissionsGuard() {
  const hasCompleted = useAppStore((s) => s.hasCompletedPermissions);
  const setHasCompleted = useAppStore((s) => s.setHasCompletedPermissions);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    // Only guard after the user has passed the onboarding permissions
    // screen once — otherwise we'd force users away from onboarding into
    // permissions, which is a different flow.
    if (!hasCompleted) return;

    let cancelled = false;

    const check = async () => {
      try {
        const locationOk = await isLocationStillGranted();
        const notifOk = await isNotificationStillGranted();
        if (cancelled) return;
        if (!locationOk || !notifOk) {
          logger.info('[permissions-guard] revoked — forcing re-grant', {
            locationOk: String(locationOk),
            notifOk: String(notifOk),
          });
          setHasCompleted(false);
        }
      } catch (err) {
        logger.error('[permissions-guard] check failed', err as Error);
      }
    };

    // First check on mount, then on every foreground transition.
    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [hasCompleted, setHasCompleted]);
}

async function isLocationStillGranted(): Promise<boolean> {
  const res = await Location.getForegroundPermissionsAsync();
  return res.status === 'granted';
}

async function isNotificationStillGranted(): Promise<boolean> {
  // Android 13+: check the runtime POST_NOTIFICATIONS permission directly.
  // Below 13: notifications are granted by default unless the user disabled
  // them in the app's notification settings — Firebase Messaging's
  // hasPermission() reflects that, so we defer to it.
  if (Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= 33) {
    try {
      const granted = await PermissionsAndroid.check(
        'android.permission.POST_NOTIFICATIONS' as any,
      );
      if (!granted) return false;
    } catch {
      return false;
    }
  }
  try {
    const messaging = getMessaging(getApp());
    const status = await hasPermission(messaging);
    return (
      status === AuthorizationStatus.AUTHORIZED ||
      status === AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}
