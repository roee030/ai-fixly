import { useEffect } from 'react';
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
        if (!granted || cancelled) return;

        const token = await notificationService.getToken();
        if (token && !cancelled) {
          await notificationService.saveToken(uid, token);
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

    // Fires while app is in foreground. No navigation — user is already in the app.
    const unsubscribeForeground = notificationService.onNotificationReceived(
      (notification) => {
        logger.info('Push notification in foreground', {
          title: notification.title || 'No title',
        });
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
