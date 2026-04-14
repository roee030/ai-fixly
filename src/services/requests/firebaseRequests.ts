import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from '../firestore/imports';
import { RequestService, CreateRequestInput, ServiceRequest } from './types';
import { REQUEST_STATUS } from '../../constants/status';

class FirebaseRequestService implements RequestService {
  private db = getFirestore();
  private collectionName = 'serviceRequests';

  async createRequest(input: CreateRequestInput): Promise<ServiceRequest> {
    const docRef = doc(collection(this.db, this.collectionName));
    const now = new Date();

    const requestData = {
      userId: input.userId,
      status: REQUEST_STATUS.DRAFT,
      media: input.media,
      aiAnalysis: input.aiAnalysis,
      location: input.location,
      textDescription: input.textDescription || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, requestData);

    return {
      id: docRef.id,
      ...input,
      status: REQUEST_STATUS.DRAFT,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getRequest(requestId: string): Promise<ServiceRequest | null> {
    try {
      const docRef = doc(this.db, this.collectionName, requestId);
      const snapshot = await getDoc(docRef);
      if (!snapshot) return null;
      return snapshotToRequest(snapshot);
    } catch (err) {
      console.warn('[getRequest] failed', err);
      return null;
    }
  }

  async getUserRequests(userId: string): Promise<ServiceRequest[]> {
    try {
      const q = query(collection(this.db, this.collectionName), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      if (!snapshot || !snapshot.docs) return [];

      return snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: toDateSafe(data.createdAt),
            updatedAt: toDateSafe(data.updatedAt),
          } as ServiceRequest;
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (err) {
      console.warn('[getUserRequests] failed', err);
      return [];
    }
  }

  async updateStatus(requestId: string, status: string): Promise<void> {
    const docRef = doc(this.db, this.collectionName, requestId);
    const update: Record<string, any> = {
      status,
      updatedAt: serverTimestamp(),
    };

    // Clear selection when going back to OPEN
    if (status === REQUEST_STATUS.OPEN) {
      update.selectedBidId = null;
    }

    await updateDoc(docRef, update);
  }

  /**
   * Save the broadcast result so the user can see which providers were
   * contacted (even before they reply). Stores the list as a denormalized
   * field on the request document.
   *
   * Note: In production flows this is done by the worker directly. Kept here
   * for completeness.
   */
  async saveBroadcastResult(
    requestId: string,
    providers: Array<{ name: string; phone: string; sent: boolean }>
  ): Promise<void> {
    try {
      const docRef = doc(this.db, this.collectionName, requestId);
      await updateDoc(docRef, {
        broadcastedProviders: providers,
        broadcastedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('[saveBroadcastResult] failed', err);
    }
  }

  /**
   * Subscribe to real-time updates of ALL of a user's requests.
   * Used by the requests store to keep the list and tab-bar badge fresh
   * without re-fetching on every navigation focus.
   */
  onUserRequestsChanged(
    userId: string,
    callback: (requests: ServiceRequest[]) => void
  ): () => void {
    const q = query(
      collection(this.db, this.collectionName),
      where('userId', '==', userId)
    );

    let lastSignature = '';

    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot || !Array.isArray(snapshot.docs)) {
          if (lastSignature !== '[]') {
            lastSignature = '[]';
            callback([]);
          }
          return;
        }
        const requests = snapshot.docs
          .map((d: any) => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              createdAt: toDateSafe(data.createdAt),
              updatedAt: toDateSafe(data.updatedAt),
            } as ServiceRequest;
          })
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        // Signature tracks the fields we care about for rerendering
        const signature = requests
          .map(
            (r) =>
              `${r.id}:${r.status}:${(r as any).selectedBidId || ''}:${r.updatedAt.getTime()}`
          )
          .join('|');

        if (signature !== lastSignature) {
          lastSignature = signature;
          callback(requests);
        }
      },
      (error) => {
        console.warn('[onUserRequestsChanged] error', error);
      }
    );
  }

  /**
   * Subscribe to real-time updates of a single request document.
   * Fires when the worker updates it (e.g. adds broadcastedProviders).
   */
  onRequestChanged(requestId: string, callback: (req: ServiceRequest | null) => void): () => void {
    const docRef = doc(this.db, this.collectionName, requestId);

    // Track last emitted signature to avoid redundant updates
    let lastSignature = '';

    return onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot) {
          if (lastSignature !== 'null') {
            lastSignature = 'null';
            callback(null);
          }
          return;
        }
        const req = snapshotToRequest(snapshot);
        // Create a signature of the relevant fields
        const signature = req
          ? `${req.id}:${req.status}:${(req as any).selectedBidId || ''}:${(req as any).broadcastedProviders?.length || 0}:${req.updatedAt.getTime()}`
          : 'null';

        if (signature !== lastSignature) {
          lastSignature = signature;
          callback(req);
        }
      },
      (error) => {
        console.warn('[onRequestChanged] error', error);
        callback(null);
      }
    );
  }
}

/**
 * Convert a Firestore DocumentSnapshot to a ServiceRequest.
 * Handles @react-native-firebase v22+ where `exists` is a method, not a property.
 */
function snapshotToRequest(snapshot: any): ServiceRequest | null {
  // In v22+ `exists` is a method. Fall back to the property for older versions.
  const exists =
    typeof snapshot.exists === 'function' ? snapshot.exists() : snapshot.exists;
  if (!exists) return null;

  const data = snapshot.data?.();
  if (!data) return null;

  return {
    id: snapshot.id,
    ...data,
    createdAt: toDateSafe(data.createdAt),
    updatedAt: toDateSafe(data.updatedAt),
  } as ServiceRequest;
}

function toDateSafe(value: any): Date {
  if (value && typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch {
      // fall through
    }
  }
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

export const requestService: RequestService = new FirebaseRequestService();
