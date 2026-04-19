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
   * Canonical UTC ISO timestamp for the start of the provider's offered
   * 2-hour arrival window. Set either by the web form (provider picked
   * a chip) or by Gemini (provider replied with free-form WhatsApp text).
   * May be undefined for legacy bids created before this field existed.
   * Use `formatAvailability(bid, now)` to render it.
   */
  availabilityStartAt?: string | null;
  /**
   * Canonical UTC ISO timestamp for the end of the provider's offered
   * window. Always 2 hours after `availabilityStartAt` for new bids.
   * Older bids may only have the start — formatter falls back to
   * single-time rendering in that case.
   */
  availabilityEndAt?: string | null;
  rating: number | null;
  address?: string;
  /**
   * Free-text message the provider attached to the quote (e.g. from the
   * "notes" field on the web form, or the prose body of a WhatsApp reply).
   * Shown to the customer below the price/availability chips when present.
   */
  notes?: string;
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
