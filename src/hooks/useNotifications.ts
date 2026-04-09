import { useEffect } from 'react';
import { notificationService } from '../services/notifications';
import { useAuthStore } from '../stores/useAuthStore';
import { logger } from '../services/logger/logger';

/**
 * Subscribe to FCM push notifications for the signed-in user.
 * Uses uid (primitive) as the effect dep so the effect only re-runs when
 * the actual user changes, not whenever any other auth state updates.
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
      } catch (err) {
        logger.error('Push setup failed', err as Error);
      }
    };

    setup();

    const unsubscribe = notificationService.onNotificationReceived((notification) => {
      logger.info('Push notification in foreground', {
        title: notification?.notification?.title || 'No title',
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid]);
}
