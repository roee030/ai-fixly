/**
 * Tiny client used by the public /provider/* forms to talk to our broker.
 * No Firebase imports here on purpose — we keep the bundle small and the
 * forms work even if the customer-side stack fails to init.
 */

const BROKER_URL = process.env.EXPO_PUBLIC_BROKER_URL || '';

export interface PublicMediaItem {
  url: string;
  type: 'image' | 'video';
  /** JPG poster frame URL, videos only. */
  thumbnailUrl?: string;
}

export interface PublicRequestSummary {
  requestId: string;
  city: string;
  textDescription: string;
  /** Legacy flat URL list — still populated for old clients. */
  mediaUrls: string[];
  /** Type-aware media list. Prefer this when available. */
  mediaItems?: PublicMediaItem[];
  status: string;
  createdAt: string | null;
}

export interface QuoteSubmission {
  requestId: string;
  providerPhone: string;
  providerName?: string;
  price: string;
  isVisitFee: boolean;
  availabilityStartAt: string;  // ISO timestamp
  availabilityText: string;     // human-readable, e.g. "מחר אחר הצהריים"
  notes?: string;
}

export interface ReportSubmission {
  requestId: string;
  providerPhone: string;
  reason: string;
}

/** Fetch a stripped-down view of a request for the provider form. */
export async function fetchPublicRequestSummary(requestId: string): Promise<PublicRequestSummary> {
  const res = await fetch(`${BROKER_URL}/provider/request/${encodeURIComponent(requestId)}`, {
    method: 'GET',
  });
  if (!res.ok) {
    throw new Error(`Request not found (HTTP ${res.status})`);
  }
  return res.json();
}

/** Submit a quote for a request. */
export async function submitProviderQuote(payload: QuoteSubmission): Promise<void> {
  const res = await fetch(`${BROKER_URL}/provider/bid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Submit failed (HTTP ${res.status}) ${text}`);
  }
}

/** Submit a "this request has a problem" report (e.g. wrong profession, spam). */
export async function submitProviderReport(payload: ReportSubmission): Promise<void> {
  const res = await fetch(`${BROKER_URL}/provider/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Report failed (HTTP ${res.status}) ${text}`);
  }
}
