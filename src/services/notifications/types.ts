export interface NotificationService {
  requestPermission(): Promise<boolean>;
  getToken(): Promise<string | null>;
  saveToken(userId: string, token: string): Promise<void>;
  onNotificationReceived(callback: (notification: any) => void): () => void;
}
