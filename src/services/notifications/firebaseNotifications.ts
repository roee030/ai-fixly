import { PermissionsAndroid, Platform } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import {
  getMessaging,
  requestPermission,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  setBackgroundMessageHandler,
  AuthorizationStatus,
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import { getFirestore, doc, updateDoc } from '../firestore/imports';
import { NotificationService, RemoteNotification, NotificationData } from './types';
import { logger } from '../logger';

/**
 * FCM push notification service using the v22+ modular API.
 * Handles foreground, background, and killed-state notification delivery
 * as well as tap-to-navigate deep linking.
 */
class FirebaseNotificationService implements NotificationService {
  private get messaging() {
    return getMessaging(getApp());
  }

  async requestPermission(): Promise<boolean> {
    try {
      // Android 13+ requires runtime POST_NOTIFICATIONS permission before
      // the system will display push notifications when the app is
      // backgrounded or killed. Without this, the FCM onMessage handler
      // still fires in foreground but system notifications are silently
      // dropped. Firebase Messaging's requestPermission() does NOT request
      // POST_NOTIFICATIONS on Android — we have to ask ourselves.
      if (Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= 33) {
        const result = await PermissionsAndroid.request(
          'android.permission.POST_NOTIFICATIONS' as any
        );
        logger.info('POST_NOTIFICATIONS permission', { result });
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          return false;
        }
      }

      const authStatus = await requestPermission(this.messaging);
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;
      logger.info('Push notification permission', { enabled: enabled.toString() });
      return enabled;
    } catch (err) {
      logger.error('Push permission error', err as Error);
      return false;
    }
  }

  async getToken(): Promise<string | null> {
    try {
      const token = await getToken(this.messaging);
      logger.info('FCM token received', { tokenLength: token.length.toString() });
      return token;
    } catch (err) {
      logger.error('FCM token error', err as Error);
      return null;
    }
  }

  async saveToken(userId: string, token: string): Promise<void> {
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'users', userId), { fcmToken: token });
    } catch (err) {
      logger.error('Save FCM token error', err as Error);
    }
  }

  onNotificationReceived(
    callback: (notification: RemoteNotification) => void
  ): () => void {
    const unsubscribe = onMessage(this.messaging, async (remoteMessage) => {
      logger.info('Notification received (foreground)', {
        title: remoteMessage.notification?.title || '',
      });
      callback(toRemoteNotification(remoteMessage));
    });

    // Background handler — fires when app is in background or quit.
    // Android auto-displays the system notification for messages with a
    // `notification` field in the payload, so this is just for logging.
    setBackgroundMessageHandler(this.messaging, async (remoteMessage) => {
      logger.info('Notification received (background)', {
        title: remoteMessage.notification?.title || '',
      });
    });

    return unsubscribe;
  }

  onNotificationOpened(
    callback: (notification: RemoteNotification) => void
  ): () => void {
    return onNotificationOpenedApp(this.messaging, (remoteMessage) => {
      if (!remoteMessage) return;
      logger.info('Notification tapped (background)', {
        title: remoteMessage.notification?.title || '',
      });
      callback(toRemoteNotification(remoteMessage));
    });
  }

  async getInitialNotification(): Promise<RemoteNotification | null> {
    try {
      const remoteMessage = await getInitialNotification(this.messaging);
      if (!remoteMessage) return null;
      logger.info('Notification tapped (killed)', {
        title: remoteMessage.notification?.title || '',
      });
      return toRemoteNotification(remoteMessage);
    } catch (err) {
      logger.error('getInitialNotification failed', err as Error);
      return null;
    }
  }
}

function toRemoteNotification(
  msg: FirebaseMessagingTypes.RemoteMessage
): RemoteNotification {
  const raw = msg.data || {};
  const data: NotificationData = {
    requestId: typeof raw.requestId === 'string' ? raw.requestId : undefined,
    type: isValidType(raw.type) ? raw.type : undefined,
  };
  return {
    title: msg.notification?.title,
    body: msg.notification?.body,
    data,
  };
}

function isValidType(v: unknown): v is NotificationData['type'] {
  return v === 'new_bid' || v === 'selection' || v === 'chat';
}

export const notificationService: NotificationService = new FirebaseNotificationService();
