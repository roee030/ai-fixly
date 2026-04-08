import messaging from '@react-native-firebase/messaging';
import { getFirestore, doc, updateDoc } from '@react-native-firebase/firestore';
import { NotificationService } from './types';
import { logger } from '../logger';

class FirebaseNotificationService implements NotificationService {
  async requestPermission(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      logger.info('Push notification permission', { enabled: enabled.toString() });
      return enabled;
    } catch (err) {
      logger.error('Push permission error', err as Error);
      return false;
    }
  }

  async getToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
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

  onNotificationReceived(callback: (notification: any) => void): () => void {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      logger.info('Notification received (foreground)', {
        title: remoteMessage.notification?.title || '',
      });
      callback(remoteMessage);
    });

    // Background handler
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      logger.info('Notification received (background)', {
        title: remoteMessage.notification?.title || '',
      });
    });

    return unsubscribe;
  }
}

export const notificationService: NotificationService = new FirebaseNotificationService();
