export type BidSource = 'whatsapp' | 'google_places_demo' | 'mock';

export interface Bid {
  id: string;
  requestId: string;
  providerName: string;
  providerPhone: string;
  price: number;
  availability: string;
  rating: number | null;
  address?: string;
  /** true = real reply from a provider via WhatsApp; false = simulated demo bid */
  isReal: boolean;
  source: BidSource;
  createdAt: Date;
}

export interface BidService {
  getBidsForRequest(requestId: string): Promise<Bid[]>;
  /** @deprecated Use real bids from worker */
  createMockBids(requestId: string): Promise<void>;
  selectBid(requestId: string, bidId: string): Promise<void>;
  /** Subscribe to bid changes for a request in real time */
  onBidsChanged(requestId: string, callback: (bids: Bid[]) => void): () => void;
}
