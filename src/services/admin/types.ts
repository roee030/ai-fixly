export type DateRange = '7d' | '30d';

export interface FunnelStep {
  name: string;
  nameHe: string;
  count: number;
  dropOff: number;
  conversionPercent: number;
  issue?: string;
}

export interface FunnelData {
  steps: FunnelStep[];
  avgTimeToFirstBid: number | null;
  avgBidsPerRequest: number | null;
  requestsWithZeroBids: number;
  totalRequests: number;
  conversionRate: number;
  abandonedAfterBids?: number;
  returningCustomers?: number;
  totalCustomers?: number;
}

export interface ProviderStat {
  displayName: string;
  phone: string;
  profession?: string;
  area?: string;
  offersSent: number;
  accepted: number;
  completed: number;
  customerConfirmed: number;
  avgRating: number | null;
  avgPrice: number | null;
  avgResponseMinutes?: number | null;
  replyRate: number;
  verified?: boolean;
  grossValue?: number;
}

export interface ProviderDetail {
  recentJobs: Array<{
    date: Date;
    profession: string;
    price: number;
    rating: number;
    status: string;
  }>;
  reviews: Array<{
    rating: number;
    comment: string;
    date: Date;
  }>;
}

export type RequestStatus = 'open' | 'in_progress' | 'closed';

export interface RecentRequest {
  id: string;
  customerPhone: string;
  profession: string;
  professionKey: string;
  area: string;
  status: RequestStatus;
  bidCount: number;
  createdAt: Date;
  description: string;
  selectedProvider?: string;
  rating?: number;
  pricePaid?: number;
}

export interface AlertDetails {
  customerPhone?: string;
  profession?: string;
  area?: string;
  hoursWaiting?: number;
  providersContacted?: number;
  description?: string;
  providerName?: string;
  totalOffers?: number;
  replyRate?: number;
  lastResponseDate?: Date;
  reviewText?: string;
  reviewRating?: number;
  reviewCategories?: string[];
  customerComment?: string;
  providerPhone?: string;
  providerProfession?: string;
  providerExperience?: string;
}

export interface AdminAlert {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  details?: AlertDetails;
  metadata: Record<string, unknown>;
  read: boolean;
  handled?: boolean;
  createdAt: Date;
}

export interface DemandEntry {
  profession: string;
  professionKey: string;
  city: string;
  requests: number;
  avgBids: number;
}

export interface EngagementData {
  messagesSent: number;
  providerReplied: number;
  replyWithin1h: number;
  replyWithin4h: number;
  positiveReplyRate: number;
  avgResponseTimeMinutes: number | null;
}
