import {
  getFirestore, collection, doc, setDoc, getDocs, query,
  where, serverTimestamp,
} from '../firestore/imports';
import type { Review, ReviewService } from './types';

class FirebaseReviewService implements ReviewService {
  private db = getFirestore();

  async submitReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<void> {
    const colRef = collection(this.db, 'reviews');
    const docRef = doc(colRef);
    await setDoc(docRef, {
      ...review,
      createdAt: serverTimestamp(),
    });
  }

  async getReviewsForProvider(providerPhone: string): Promise<Review[]> {
    const q = query(
      collection(this.db, 'reviews'),
      where('providerPhone', '==', providerPhone)
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
      where('requestId', '==', requestId)
    );
    const snapshot = await getDocs(q).catch(() => null);
    return (snapshot?.docs?.length || 0) > 0;
  }
}

export const reviewService: ReviewService = new FirebaseReviewService();
