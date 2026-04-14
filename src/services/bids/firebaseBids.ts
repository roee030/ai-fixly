import {
  getFirestore, collection, doc, setDoc, getDocs, query,
  where, serverTimestamp, updateDoc, onSnapshot,
} from '../firestore/imports';
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

    // Track the last callback value to avoid redundant updates
    let lastJson = '';

    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot || !Array.isArray(snapshot.docs)) {
          if (lastJson !== '[]') {
            lastJson = '[]';
            callback([]);
          }
          return;
        }
        const bids = snapshot.docs.map((d: any) => this.docToBid(d)).sort(byNewestFirst);
        // Only call back if the serialized content actually changed
        const json = JSON.stringify(
          bids.map(
            (b) =>
              `${b.id}:${b.price}:${b.availability}:${b.availabilityStartAt || ''}:${b.createdAt.getTime()}`
          )
        );
        if (json !== lastJson) {
          lastJson = json;
          callback(bids);
        }
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

  async selectBid(requestId: string, bid: Bid): Promise<void> {
    const requestRef = doc(this.db, 'serviceRequests', requestId);
    // Denormalize the selected provider's details onto the request doc so:
    // 1. The chat screen can forward messages without another lookup
    // 2. The worker webhook can check 'is this the selected provider?'
    await updateDoc(requestRef, {
      status: REQUEST_STATUS.IN_PROGRESS,
      selectedBidId: bid.id,
      selectedProviderPhone: bid.providerPhone,
      selectedProviderName: bid.providerName,
    });
  }

  private docToBid(d: any): Bid {
    const data = d.data();
    return {
      id: d.id,
      requestId: data.requestId || '',
      providerName: data.providerName || 'בעל מקצוע',
      displayName: data.displayName || undefined,
      providerPhone: data.providerPhone || '',
      price: typeof data.price === 'number' ? data.price : 0,
      availability: data.availability || '',
      availabilityStartAt: toIsoOrNull(data.availabilityStartAt),
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

/**
 * Convert a Firestore timestamp field (or raw ISO string) into a canonical
 * ISO string, or null if invalid/missing. Used for availabilityStartAt
 * which is a Firestore timestampValue from the worker.
 */
function toIsoOrNull(value: any): string | null {
  if (!value) return null;
  if (value.toDate && typeof value.toDate === 'function') {
    try {
      return value.toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

export const bidService: BidService = new FirebaseBidService();
