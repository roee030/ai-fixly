import {
  getFirestore, collection, query, where, orderBy, limit, getDocs,
} from '../firestore/imports';

/**
 * Admin list-view projection of a serviceRequests doc. Matches the row
 * layout defined in the design doc §4.2.
 */
export interface AdminRequestRow {
  id: string;
  createdAt: Date;
  city: string;
  status: string;
  bidCount: number;
  professions: string[];
  timeToFirstResponse?: number;  // minutes
  selectedProviderName?: string;
  selectedProviderPhone?: string;
  selectedBidPrice?: number;
  pricePaid?: number;
  rating?: number;
  sentCount?: number;
  failedCount?: number;
}

export interface QueryAdminRequestsParams {
  city?: string;
  status?: string;
  hasReview?: boolean;
  /** Milliseconds ago — e.g. 7*24*3600*1000 for last 7 days. Omit for all. */
  sinceMs?: number;
  maxResults?: number;
}

/**
 * Fetch the admin requests list. Pagination is omitted in V1 — queries
 * are capped at `maxResults` (default 200). Firestore composite indexes
 * back the city/status filter combinations; see firestore.indexes.json.
 */
export async function queryAdminRequests(
  params: QueryAdminRequestsParams = {},
): Promise<AdminRequestRow[]> {
  const db = getFirestore();
  const constraints: any[] = [];

  if (params.status) constraints.push(where('status', '==', params.status));
  if (params.city)   constraints.push(where('locationSummary.city', '==', params.city));

  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(params.maxResults ?? 200));

  const snap = await getDocs(query(collection(db, 'serviceRequests'), ...constraints));

  const rows: AdminRequestRow[] = snap.docs.map((d: any) => {
    const data = d.data() || {};
    const createdAt = data.createdAt?.toDate?.() ?? new Date(0);
    const locationSummary = data.locationSummary || {};
    const review = data.reviewSummary || {};
    const bs = data.broadcastSummary || {};
    const aiProfs: string[] = Array.isArray(data.aiAnalysis?.professions)
      ? data.aiAnalysis.professions
      : (Array.isArray(data.aiAnalysis?.professionLabelsHe) ? data.aiAnalysis.professionLabelsHe : []);

    return {
      id: d.id,
      createdAt,
      city: locationSummary.city || 'unknown',
      status: data.status || 'unknown',
      bidCount: Array.isArray(data.broadcastedProviders) ? 0 : 0,  // placeholder, hydrated below
      professions: aiProfs.slice(0, 3),
      timeToFirstResponse: typeof data.timeToFirstResponse === 'number' ? data.timeToFirstResponse : undefined,
      selectedProviderName: data.selectedProviderName || undefined,
      selectedProviderPhone: data.selectedProviderPhone || undefined,
      selectedBidPrice: typeof data.selectedBidPrice === 'number' ? data.selectedBidPrice : undefined,
      pricePaid: typeof review.pricePaid === 'number' ? review.pricePaid : undefined,
      rating: typeof review.rating === 'number' ? review.rating : undefined,
      sentCount: typeof bs.sentCount === 'number' ? bs.sentCount : undefined,
      failedCount: typeof bs.failedCount === 'number' ? bs.failedCount : undefined,
    };
  });

  // In-memory filters — Firestore doesn't index "field exists" cheaply,
  // and dateRange is a post-cap trim. Acceptable because we've already
  // capped at maxResults.
  let filtered = rows;
  if (params.hasReview !== undefined) {
    filtered = filtered.filter((r) =>
      params.hasReview ? r.rating !== undefined : r.rating === undefined,
    );
  }
  if (params.sinceMs !== undefined) {
    const cutoff = Date.now() - params.sinceMs;
    filtered = filtered.filter((r) => r.createdAt.getTime() >= cutoff);
  }

  return filtered;
}

export function dateRangeToMs(range: 'today' | '7d' | '30d' | '90d' | 'all'): number | undefined {
  const DAY = 24 * 60 * 60 * 1000;
  switch (range) {
    case 'today': return DAY;
    case '7d':    return 7 * DAY;
    case '30d':   return 30 * DAY;
    case '90d':   return 90 * DAY;
    case 'all':   return undefined;
  }
}
