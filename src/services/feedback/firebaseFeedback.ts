import { Platform } from 'react-native';
import { getFirestore, collection, doc, setDoc, getDocs, query, orderBy, serverTimestamp } from '../firestore/imports';
import type { Feedback, FeedbackSeverity } from './types';

class FirebaseFeedbackService {
  private db = getFirestore();

  async submitFeedback(params: {
    userId: string;
    userPhone: string;
    screen: string;
    errorMessage?: string;
    freeText: string;
    severity: FeedbackSeverity;
  }): Promise<void> {
    const colRef = collection(this.db, 'feedback');
    const docRef = doc(colRef);
    await setDoc(docRef, {
      ...params,
      errorMessage: params.errorMessage || null,
      platform: Platform.OS,
      createdAt: serverTimestamp(),
    });

    if (params.severity === 'critical') {
      this.sendCriticalAlert(params).catch(() => {});
    }
  }

  private async sendCriticalAlert(params: {
    freeText: string;
    screen: string;
    errorMessage?: string;
  }): Promise<void> {
    const workerUrl = process.env.EXPO_PUBLIC_BROKER_URL;
    if (!workerUrl) return;
    try {
      await fetch(`${workerUrl}/feedback/critical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: params.freeText,
          screen: params.screen,
          error: params.errorMessage || '',
        }),
      });
    } catch {
      // Don't block on alert failure
    }
  }

  async getRecentFeedback(limit: number = 20): Promise<Feedback[]> {
    try {
      const q = query(collection(this.db, 'feedback'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      if (!snapshot?.docs) return [];
      return snapshot.docs.slice(0, limit).map((d: any) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || new Date(),
      })) as Feedback[];
    } catch {
      return [];
    }
  }
}

export const feedbackService = new FirebaseFeedbackService();
