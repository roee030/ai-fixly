import {
  getFirestore, collection, doc, setDoc, getDocs, query,
  where, orderBy, serverTimestamp, updateDoc,
} from '@react-native-firebase/firestore';
import { BidService, Bid } from './types';
import { REQUEST_STATUS } from '../../constants/status';

const MOCK_PROVIDERS = [
  { name: 'שמעון - אינסטלציה מקצועית', phone: '+972501111111', rating: 4.8 },
  { name: 'דוד חשמל ותאורה', phone: '+972502222222', rating: 4.5 },
  { name: 'יוסי תיקונים כלליים', phone: '+972503333333', rating: 4.2 },
  { name: 'אבי השרברב', phone: '+972504444444', rating: 4.9 },
  { name: 'מוטי מיזוג אוויר', phone: '+972505555555', rating: 4.6 },
];

const MOCK_AVAILABILITIES = [
  'היום אחה"צ',
  'מחר בבוקר',
  'יום ראשון',
  'תוך שעתיים',
  'מחר בין 10-14',
];

class FirebaseBidService implements BidService {
  private db = getFirestore();

  async getBidsForRequest(requestId: string): Promise<Bid[]> {
    // Simple query without orderBy to avoid requiring composite index
    const q = query(
      collection(this.db, 'bids'),
      where('requestId', '==', requestId)
    );
    const snapshot = await getDocs(q).catch(() => null);
    if (!snapshot) return [];
    // Sort client-side instead
    return snapshot.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          requestId: data.requestId,
          providerName: data.providerName,
          providerPhone: data.providerPhone,
          price: data.price,
          availability: data.availability,
          rating: data.rating,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createMockBids(requestId: string): Promise<void> {
    const shuffled = [...MOCK_PROVIDERS].sort(() => Math.random() - 0.5);
    const count = 2 + Math.floor(Math.random() * 3);
    const selected = shuffled.slice(0, count);

    for (const provider of selected) {
      const bidRef = doc(collection(this.db, 'bids'));
      const availIndex = Math.floor(Math.random() * MOCK_AVAILABILITIES.length);
      await setDoc(bidRef, {
        requestId,
        providerName: provider.name,
        providerPhone: provider.phone,
        price: 150 + Math.floor(Math.random() * 500),
        availability: MOCK_AVAILABILITIES[availIndex],
        rating: provider.rating,
        createdAt: serverTimestamp(),
      });
    }
  }

  async selectBid(requestId: string, bidId: string): Promise<void> {
    const requestRef = doc(this.db, 'serviceRequests', requestId);
    await updateDoc(requestRef, {
      status: REQUEST_STATUS.IN_PROGRESS,
      selectedBidId: bidId,
    });
  }
}

export const bidService: BidService = new FirebaseBidService();
