import { RequestStatus } from '@/constants/status';
import type {
  BroadcastSummary,
  ServiceSummary,
  LocationSummary,
  ReviewSummary,
} from './observability';

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

  // ── Admin observability (all optional — old docs lack them) ──────────────
  /** Bounding-box resolved metro + region for admin filtering. */
  locationSummary?: LocationSummary;
  /** Worker-written summary of the broadcast run for this request. */
  broadcastSummary?: BroadcastSummary;
  /** Client-written summary of client-side service timings. */
  serviceSummary?: ServiceSummary;
  /** Minutes between broadcast start and the first inbound bid. */
  timeToFirstResponse?: number;
  /** Denormalized price of the bid the customer selected. */
  selectedBidPrice?: number;
  /** Denormalized copy of the customer review for admin read speed. */
  reviewSummary?: ReviewSummary;
}
