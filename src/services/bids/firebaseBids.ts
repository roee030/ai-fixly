import {
  getFirestore, collection, doc, setDoc, getDocs, query,
  where, serverTimestamp, updateDoc, onSnapshot,
} from '@react-native-firebase/firestore';
import { BidService, Bid, BidSource } from './types';
import { REQUEST_STATUS } from '../../constants/status';

class FirebaseBidService implements BidService {
  private db = getFirestore();

  async getBidsForRequest(requestId: string): Promise<Bid[]> {
    const q = query(collection(this.db, 'bids'), where('requestId', '==', requestId));
    const snapshot = await getDocs(q).catch(() => null);
    if (!snapshot || !snapshot.docs) return [];

    return snapshot.docs.map(this.docToBid).sort(byNewestFirst);
  }

  /**
   * Subscribe to real-time bid updates for a request. The callback fires
   * whenever a bid is added/updated/removed in Firestore.
   */
  onBidsChanged(requestId: string, callback: (bids: Bid[]) => void): () => void {
    const q = query(collection(this.db, 'bids'), where('requestId', '==', requestId));

    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot || !snapshot.docs) {
          callback([]);
          return;
        }
        const bids = snapshot.docs.map(this.docToBid).sort(byNewestFirst);
        callback(bids);
      },
      (error) => {
        console.warn('[onBidsChanged] error', error);
        callback([]);
      }
    );
  }

  /**
   * @deprecated The worker now creates bids automatically (real or demo).
   * This method is kept for backward compat with existing screens but does
   * nothing.
   */
  async createMockBids(_requestId: string): Promise<void> {
    // No-op. Bids are created by the broker worker (real WhatsApp replies
    // or demo bids in dry-run mode).
  }

  async selectBid(requestId: string, bidId: string): Promise<void> {
    const requestRef = doc(this.db, 'serviceRequests', requestId);
    await updateDoc(requestRef, {
      status: REQUEST_STATUS.IN_PROGRESS,
      selectedBidId: bidId,
    });
  }

  private docToBid(d: any): Bid {
    const data = d.data();
    return {
      id: d.id,
      requestId: data.requestId || '',
      providerName: data.providerName || 'בעל מקצוע',
      providerPhone: data.providerPhone || '',
      price: typeof data.price === 'number' ? data.price : 0,
      availability: data.availability || '',
      rating: typeof data.rating === 'number' ? data.rating : null,
      address: data.address,
      isReal: data.isReal === true,
      source: (data.source as BidSource) || 'mock',
      createdAt: parseDate(data.createdAt, data.receivedAt),
    };
  }
}

function byNewestFirst(a: Bid, b: Bid): number {
  const ta = a.createdAt instanceof Date && !isNaN(a.createdAt.getTime()) ? a.createdAt.getTime() : 0;
  const tb = b.createdAt instanceof Date && !isNaN(b.createdAt.getTime()) ? b.createdAt.getTime() : 0;
  return tb - ta;
}

function parseDate(firestoreTimestamp: any, isoString: string | undefined): Date {
  if (firestoreTimestamp?.toDate) {
    try {
      return firestoreTimestamp.toDate();
    } catch {
      // fall through
    }
  }
  if (isoString) {
    const d = new Date(isoString);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

export const bidService: BidService = new FirebaseBidService();
