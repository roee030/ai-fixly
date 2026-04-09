import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';
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

      if (!snapshot || !snapshot.exists) return null;

      const data = snapshot.data();
      if (!data) return null;
      return {
        id: snapshot.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as ServiceRequest;
    } catch (err) {
      console.warn('[getRequest] failed', err);
      return null;
    }
  }

  async getUserRequests(userId: string): Promise<ServiceRequest[]> {
    try {
      // Simple query without orderBy - sort client-side to avoid index requirement
      const q = query(
        collection(this.db, this.collectionName),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      if (!snapshot || !snapshot.docs) return [];

      return snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as ServiceRequest;
        })
        .sort((a, b) => {
          const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          return timeB - timeA;
        });
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
}

export const requestService: RequestService = new FirebaseRequestService();
