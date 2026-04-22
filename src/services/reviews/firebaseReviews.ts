import {
  getFirestore, collection, getDocs, query, where,
} from '../firestore/imports';
import { getAuth } from '@react-native-firebase/auth';
import { logger } from '../logger';
import type { Review, ReviewService } from './types';

/**
 * Reviews used to be written directly to Firestore from the client.
 * They now flow through the Worker's /review endpoint so we can:
 *   1. Validate ownership + state server-side (rules alone can't gate
 *      "only after CLOSED + no existing review + user owns the request").
 *   2. Denormalize the summary onto the serviceRequest doc atomically
 *      with the review write and the provider aggregate update.
 *
 * Reads (getReviewsForProvider, hasReviewForRequest) still hit Firestore
 * directly — no need for a server round-trip on a simple read.
 */

class WorkerBackedReviewService implements ReviewService {
  private db = getFirestore();

  async submitReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<void> {
    const workerUrl = process.env.EXPO_PUBLIC_BROKER_URL;
    if (!workerUrl) {
      throw new Error('EXPO_PUBLIC_BROKER_URL not configured');
    }
    const user = getAuth().currentUser;
    if (!user) throw new Error('not_signed_in');
    const idToken = await user.getIdToken();

    const response = await fetch(`${workerUrl}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        requestId: review.requestId,
        rating: review.rating,
        comment: review.comment,
        pricePaid: review.pricePaid ?? 0,
        selectedCategories: review.categories,
        classificationCorrect: review.classificationCorrect,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      logger.error('[review] submit failed', new Error(`${response.status} ${text}`));
      throw new Error(`review_submit_failed:${response.status}`);
    }
  }

  async getReviewsForProvider(providerPhone: string): Promise<Review[]> {
    const q = query(
      collection(this.db, 'reviews'),
      where('providerPhone', '==', providerPhone),
    );
    const snapshot = await getDocs(q).catch(() => null);
    if (!snapshot?.docs) return [];
    return snapshot.docs.map((d: any) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      } as Review;
    });
  }

  async hasReviewForRequest(requestId: string): Promise<boolean> {
    const q = query(
      collection(this.db, 'reviews'),
      where('requestId', '==', requestId),
    );
    const snapshot = await getDocs(q).catch(() => null);
    return (snapshot?.docs?.length || 0) > 0;
  }
}

export const reviewService: ReviewService = new WorkerBackedReviewService();
