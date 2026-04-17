import { useEffect } from 'react';
import { Platform, ToastAndroid } from 'react-native';
import { router } from 'expo-router';
import { notificationService } from '../services/notifications';
import type { RemoteNotification } from '../services/notifications/types';
import { useAuthStore } from '../stores/useAuthStore';
import { logger } from '../services/logger/logger';

/**
 * Subscribe to FCM push notifications for the signed-in user.
 *
 * This hook handles:
 *  1. Requesting permission and saving the FCM token to Firestore
 *  2. Handling foreground notifications (logged for now — UI badges do the rest)
 *  3. Handling notification taps (background → foreground) → deep link
 *  4. Handling the initial notification that launched the app from quit state
 *
 * Deep-link targets based on notification data.type:
 *   - 'new_bid'   → /request/{requestId}
 *   - 'selection' → /request/{requestId}
 *   - 'chat'      → /chat/{requestId}
 */
export function useNotifications() {
  const uid = useAuthStore((s) => s.user?.uid || null);

  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    const setup = async () => {
      try {
        const granted = await notificationService.requestPermission();
        logger.info('[push] permission', { granted: String(granted) });
        if (!granted || cancelled) return;

        const token = await notificationService.getToken();
        logger.info('[push] token', {
          hasToken: String(!!token),
          preview: token ? token.slice(0, 12) + '...' : 'none',
        });
        if (token && !cancelled) {
          await notificationService.saveToken(uid, token);
          logger.info('[push] token saved to Firestore', { uid });
        }

        // Check if the app was opened from a killed state by tapping a notification
        const initial = await notificationService.getInitialNotification();
        if (initial && !cancelled) {
          handleNotificationNavigation(initial);
        }
      } catch (err) {
        logger.error('Push setup failed', err as Error);
      }
    };

    setup();

    // Fires while app is in foreground. FCM does NOT auto-show a system
    // banner when the app is in the foreground — we must render something
    // ourselves, otherwise the user receives the push silently and thinks
    // notifications are broken. ToastAndroid is the lightest-weight option
    // and mirrors what WhatsApp / Gmail do when you're inside their app.
    const unsubscribeForeground = notificationService.onNotificationReceived(
      (notification) => {
        const title = notification.title || 'ai-fixly';
        const body = notification.body || '';
        logger.info('Push notification in foreground', { title });
        if (Platform.OS === 'android') {
          ToastAndroid.showWithGravity(
            body ? `${title}\n${body}` : title,
            ToastAndroid.LONG,
            ToastAndroid.TOP,
          );
        }
        // iOS: the system already shows a banner for foreground pushes when
        // the app opts into the UNUserNotificationCenterDelegate behavior,
        // which @react-native-firebase/messaging does by default. Nothing
        // extra to do here.
      }
    );

    // Fires when user taps a notification while app is in the background.
    const unsubscribeOpened = notificationService.onNotificationOpened(
      (notification) => {
        handleNotificationNavigation(notification);
      }
    );

    return () => {
      cancelled = true;
      unsubscribeForeground();
      unsubscribeOpened();
    };
  }, [uid]);
}

/**
 * Decides which screen to open based on the notification's `type` field.
 * Uses setTimeout(0) to ensure the root navigator is mounted before
 * attempting to navigate (same issue we hit in _layout.tsx).
 *
 * Routing:
 *   - 'new_bid'   → /request/{id}  (show the bids so user can pick)
 *   - 'selection' → /chat/{id}     (provider confirmed, next action is chat)
 *   - 'chat'      → /chat/{id}     (new chat message — jump straight in)
 *   - default     → /request/{id}
 */
function handleNotificationNavigation(notification: RemoteNotification): void {
  const requestId = notification.data?.requestId;
  const type = notification.data?.type;

  if (!requestId) {
    logger.warn('[push] notification has no requestId, cannot navigate');
    return;
  }

  setTimeout(() => {
    try {
      if (type === 'chat' || type === 'selection') {
        router.push({ pathname: '/chat/[requestId]', params: { requestId } });
      } else {
        // new_bid or fallback: open the request details
        router.push({ pathname: '/request/[id]', params: { id: requestId } });
      }
    } catch (err) {
      logger.error('[push] navigation failed', err as Error);
    }
  }, 0);
}
