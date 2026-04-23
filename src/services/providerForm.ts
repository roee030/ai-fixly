/**
 * Tiny client used by the public /provider/* forms to talk to our broker.
 * No Firebase imports here on purpose — we keep the bundle small and the
 * forms work even if the customer-side stack fails to init.
 */

const BROKER_URL = process.env.EXPO_PUBLIC_BROKER_URL || '';

/**
 * Decompose the compound path token produced by the Twilio CTA template.
 *
 * WhatsApp interactive templates only allow ONE variable per button URL,
 * placed at the end. We therefore send the broker a single token of the
 * form "<requestId>.<phoneWithoutPlus>" and split it back here.
 *
 * Falls back gracefully to the legacy form where the path is just the
 * request ID and the phone is passed as a `?phone=` query param.
 */
export function parseRequestToken(
  rawRequestId: string,
  queryPhone: string,
): { requestId: string; providerPhone: string } {
  const raw = (rawRequestId || '').trim();
  if (raw.includes('.')) {
    const [id, ...phoneParts] = raw.split('.');
    const phoneDigits = phoneParts.join('.'); // defensive — should only be one dot
    const withPlus = phoneDigits && !phoneDigits.startsWith('+') ? `+${phoneDigits}` : phoneDigits;
    return { requestId: id, providerPhone: withPlus || queryPhone };
  }
  return { requestId: raw, providerPhone: queryPhone };
}

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
  availabilityStartAt: string;  // ISO timestamp — start of the 2-hour window
  availabilityEndAt: string;    // ISO timestamp — end of the 2-hour window
  availabilityText: string;     // human-readable, e.g. "מחר 09:00–11:00"
  notes?: string;
}

export interface ReportSubmission {
  requestId: string;
  providerPhone: string;
  reason: string;
}

export class RequestNotFoundError extends Error {
  constructor() {
    super('not_found');
    this.name = 'RequestNotFoundError';
  }
}

export class RequestClosedError extends Error {
  constructor() {
    super('closed');
    this.name = 'RequestClosedError';
  }
}

/** Fetch a stripped-down view of a request for the provider form. */
export async function fetchPublicRequestSummary(requestId: string): Promise<PublicRequestSummary> {
  const res = await fetch(`${BROKER_URL}/provider/request/${encodeURIComponent(requestId)}`, {
    method: 'GET',
  });
  // Broker distinguishes 404 (unknown id) from 410 (known but closed). The
  // form needs to render different UI for each, so surface structured errors.
  if (res.status === 404) {
    throw new RequestNotFoundError();
  }
  if (res.status === 410) {
    throw new RequestClosedError();
  }
  if (!res.ok) {
    throw new Error(`Request not found (HTTP ${res.status})`);
  }
  return res.json();
}

export class QuoteAlreadySubmittedError extends Error {
  constructor() {
    super('already_submitted');
    this.name = 'QuoteAlreadySubmittedError';
  }
}

/** Submit a quote for a request. */
export async function submitProviderQuote(payload: QuoteSubmission): Promise<void> {
  const res = await fetch(`${BROKER_URL}/provider/bid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  // 409 = we already have a bid from this phone for this request. Surface a
  // distinct error so the form can show a friendly "you already submitted"
  // state instead of "submit failed".
  if (res.status === 409) {
    throw new QuoteAlreadySubmittedError();
  }
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
