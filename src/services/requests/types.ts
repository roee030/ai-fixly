import { AIAnalysisResult } from '../ai/types';
import { UploadedMedia } from '../media/types';
import { RequestStatus } from '../../constants/status';

export interface CreateRequestInput {
  userId: string;
  media: UploadedMedia[];
  aiAnalysis: AIAnalysisResult;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  textDescription?: string;
}

export interface ServiceRequest {
  id: string;
  userId: string;
  status: RequestStatus;
  media: UploadedMedia[];
  aiAnalysis: AIAnalysisResult;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  textDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BroadcastedProvider {
  name: string;
  phone: string;
  sent: boolean;
}

export interface RequestService {
  createRequest(input: CreateRequestInput): Promise<ServiceRequest>;
  getRequest(requestId: string): Promise<ServiceRequest | null>;
  getUserRequests(userId: string): Promise<ServiceRequest[]>;
  updateStatus(requestId: string, status: RequestStatus): Promise<void>;
  saveBroadcastResult(requestId: string, providers: BroadcastedProvider[]): Promise<void>;
  onRequestChanged(requestId: string, callback: (req: ServiceRequest | null) => void): () => void;
  /** Real-time listener for all of a user's requests. Sorted newest first. */
  onUserRequestsChanged(
    userId: string,
    callback: (requests: ServiceRequest[]) => void
  ): () => void;
}
