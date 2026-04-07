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
    const docRef = doc(this.db, this.collectionName, requestId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists) return null;

    const data = snapshot.data()!;
    return {
      id: snapshot.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as ServiceRequest;
  }

  async getUserRequests(userId: string): Promise<ServiceRequest[]> {
    const q = query(
      collection(this.db, this.collectionName),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as ServiceRequest;
    });
  }

  async updateStatus(requestId: string, status: string): Promise<void> {
    const docRef = doc(this.db, this.collectionName, requestId);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  }
}

export const requestService: RequestService = new FirebaseRequestService();
