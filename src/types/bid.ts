import { BidStatus } from '@/constants/status';

export interface Bid {
  id: string;
  requestId: string;
  providerId: string;
  price: number;
  currency: string;
  etaMinutes: number;
  message?: string;
  status: BidStatus;
  createdAt: Date;
}
