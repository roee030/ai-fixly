/**
 * Aggregate metrics for the admin Provider detail page. Kept as a separate
 * collection (`providers_agg/{phone}`) from the existing `providers/*` cache
 * of Google Places lookups so the two concerns don't mix.
 */

export interface ProviderAggregateStats {
  offersSent: number;
  accepted: number;
  completed: number;
  avgRating: number;        // 0..5
  avgPricePaid: number;     // ILS
  totalGrossValue: number;  // ILS, cumulative
  replyRate: number;        // 0..100 percent
  avgResponseMinutes: number;
  lastJobAt?: Date;
}

export interface ProviderAggregate {
  phone: string;
  displayName: string;
  profession: string;
  city: string;
  stats: ProviderAggregateStats;
  updatedAt: Date;
}

/**
 * One job per bid the provider submitted, stored under
 * providers_agg/{phone}/jobs/{requestId}. Enriched with customer review
 * data the moment the review lands.
 */
export interface ProviderJobRecord {
  requestId: string;
  bidPrice: number;
  pricePaid?: number;
  rating?: number;
  comment?: string;
  customerReviewedAt?: Date;
  status: 'selected' | 'completed' | 'lost';
  completedAt?: Date;
}
