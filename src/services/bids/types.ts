export type BidSource = 'whatsapp' | 'google_places_demo' | 'mock';

export interface Bid {
  id: string;
  requestId: string;
  providerName: string;
  /** Shortened name for display before provider is selected */
  displayName?: string;
  providerPhone: string;
  price: number;
  availability: string;
  /**
   * Canonical UTC ISO timestamp for when the provider said they could
   * start. Set by the worker via Gemini when parsing the reply. May be
   * undefined for legacy bids created before this field existed.
   * Use `formatAvailability(bid, now)` to render it.
   */
  availabilityStartAt?: string | null;
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
  selectBid(requestId: string, bid: Bid): Promise<void>;
  /** Subscribe to bid changes for a request in real time */
  onBidsChanged(requestId: string, callback: (bids: Bid[]) => void): () => void;
}
