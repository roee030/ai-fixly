export interface Bid {
  id: string;
  requestId: string;
  providerName: string;
  providerPhone: string;
  price: number;
  availability: string;
  rating: number;
  createdAt: Date;
}

export interface BidService {
  getBidsForRequest(requestId: string): Promise<Bid[]>;
  createMockBids(requestId: string): Promise<void>;
  selectBid(requestId: string, bidId: string): Promise<void>;
}
