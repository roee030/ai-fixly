import { useEffect } from 'react';
import { notificationService } from '../services/notifications';
import { useAuthStore } from '../stores/useAuthStore';
import { logger } from '../services/logger/logger';

export function useNotifications() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;

    async function setup() {
      const granted = await notificationService.requestPermission();
      if (!granted) return;

      const token = await notificationService.getToken();
      if (token) {
        await notificationService.saveToken(user!.uid, token);
      }
    }

    setup();

    const unsubscribe = notificationService.onNotificationReceived((notification) => {
      logger.info('Push notification in foreground', {
        title: notification?.notification?.title || 'No title',
      });
    });

    return unsubscribe;
  }, [user]);
}
