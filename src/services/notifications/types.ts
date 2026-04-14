/**
 * Data payload attached to every push notification from the worker.
 * Used by the app to decide where to navigate when the user taps it.
 */
export interface NotificationData {
  requestId?: string;
  /**
   * Hint for navigation target:
   *   - 'new_bid'   → open the request details screen (show offers)
   *   - 'selection' → open the request details screen (provider confirmed)
   *   - 'chat'      → open the chat screen for that request
   */
  type?: 'new_bid' | 'selection' | 'chat';
}

export interface RemoteNotification {
  title?: string;
  body?: string;
  data?: NotificationData;
}

export interface NotificationService {
  requestPermission(): Promise<boolean>;
  getToken(): Promise<string | null>;
  saveToken(userId: string, token: string): Promise<void>;

  /** Fires while the app is in the foreground and a push arrives. */
  onNotificationReceived(callback: (notification: RemoteNotification) => void): () => void;

  /**
   * Fires when the user taps a push while the app is in the background
   * (but still running). The app is brought to the foreground.
   */
  onNotificationOpened(callback: (notification: RemoteNotification) => void): () => void;

  /**
   * Returns the notification that opened the app from a killed/quit state
   * (or null if the app was opened normally). Call this once on startup.
   */
  getInitialNotification(): Promise<RemoteNotification | null>;
}
