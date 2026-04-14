import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { firebaseApp } from '../../config/firebaseWeb';
import type {
  NotificationService,
  RemoteNotification,
  NotificationData,
} from './types';

const VAPID_KEY = ''; // Generate from Firebase Console -> Cloud Messaging -> Web Push certificates

class WebNotificationService implements NotificationService {
  private messaging: ReturnType<typeof getMessaging> | null = null;

  private getMessagingInstance() {
    if (!this.messaging && firebaseApp) {
      try {
        this.messaging = getMessaging(firebaseApp);
      } catch {
        // Messaging not supported (e.g., SSR, incognito)
      }
    }
    return this.messaging;
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }

  async getToken(): Promise<string | null> {
    const msg = this.getMessagingInstance();
    if (!msg) return null;

    try {
      const sw = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js'
      );

      const token = await getToken(msg, {
        vapidKey: VAPID_KEY || undefined,
        serviceWorkerRegistration: sw,
      });

      if (token) {
        console.log('[web-push] FCM token:', token.slice(0, 20) + '...');
        return token;
      }
      return null;
    } catch (err) {
      console.warn('[web-push] getToken failed:', err);
      return null;
    }
  }

  async saveToken(userId: string, token: string): Promise<void> {
    if (!firebaseApp) return;
    try {
      const db = getFirestore(firebaseApp);
      await updateDoc(doc(db, 'users', userId), { fcmTokenWeb: token });
    } catch (err) {
      console.warn('[web-push] saveToken failed:', err);
    }
  }

  onNotificationReceived(
    callback: (notification: RemoteNotification) => void
  ): () => void {
    const msg = this.getMessagingInstance();
    if (!msg) return () => {};

    try {
      return onMessage(msg, (payload) => {
        console.log('[web-push] Foreground message:', payload);

        const data: NotificationData = {
          requestId: payload.data?.requestId,
          type: payload.data?.type as NotificationData['type'],
        };

        callback({
          title: payload.notification?.title,
          body: payload.notification?.body,
          data,
        });

        // Show browser notification for foreground messages too
        if (Notification.permission === 'granted' && payload.notification) {
          new Notification(payload.notification.title || 'ai-fixly', {
            body: payload.notification.body || '',
            icon: '/favicon.png',
          });
        }
      });
    } catch {
      return () => {};
    }
  }

  onNotificationOpened(
    callback: (notification: RemoteNotification) => void
  ): () => void {
    if (typeof window === 'undefined') return () => {};

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        const url: string = event.data.url || '';
        callback({
          title: undefined,
          body: undefined,
          data: {
            requestId: url.split('/').pop(),
            type: url.includes('/chat/') ? 'chat' : 'new_bid',
          },
        });
      }
    };

    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }

  async getInitialNotification(): Promise<RemoteNotification | null> {
    return null;
  }
}

export const notificationService: NotificationService =
  new WebNotificationService();
