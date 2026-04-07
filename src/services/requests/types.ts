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

export interface RequestService {
  createRequest(input: CreateRequestInput): Promise<ServiceRequest>;
  getRequest(requestId: string): Promise<ServiceRequest | null>;
  getUserRequests(userId: string): Promise<ServiceRequest[]>;
  updateStatus(requestId: string, status: RequestStatus): Promise<void>;
}
