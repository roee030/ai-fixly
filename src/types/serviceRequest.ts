import { RequestStatus } from '@/constants/status';

export interface MediaItem {
  type: 'video' | 'image' | 'voice';
  url: string;
  storagePath: string;
  thumbnailUrl?: string;
}

export interface AIAnalysis {
  category: string;
  summary: string;
  urgency: 'low' | 'medium' | 'high';
  confidence: number;
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface ServiceRequest {
  id: string;
  userId: string;
  status: RequestStatus;
  media: MediaItem[];
  aiAnalysis?: AIAnalysis;
  location?: Location;
  selectedBidId?: string;
  selectedProviderId?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
