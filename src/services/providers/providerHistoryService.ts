import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from '../firestore/imports';
import type {
  ProviderBidHistoryItem,
  ProviderBidStatus,
} from '../../types/providerProfile';

/**
 * Subscribe to the bid history of a single provider, keyed by phone.
 *
 * Phone is used as the join key (not uid) because a bid was created from
 * the WhatsApp / web-form flow long before the provider had an app
 * account — it has only the phone, not the auth uid.
 *
 * For each bid we fetch the parent serviceRequest once to derive the
 * status (sent/selected/completed/lost/expired). We cache requests in
 * memory to avoid N+1 round-trips for providers with lots of history.
 *
 * Returns an unsubscribe function. Errors are surfaced via the callback's
 * `error` parameter so the UI can render an empty state instead of crashing.
 */
export function subscribeToProviderBidHistory(
  providerPhone: string,
  onChange: (
    items: ProviderBidHistoryItem[],
    error: Error | null,
  ) => void,
): () => void {
  if (!providerPhone) {
    onChange([], null);
    return () => {};
  }

  const db = getFirestore();
  const bidsRef = collection(db, 'bids');
  const q = query(bidsRef, where('providerPhone', '==', providerPhone));

  // Lightweight in-flight cache so the same request isn't fetched twice
  // when multiple bids on the same request arrive in the same snapshot.
  const requestCache = new Map<string, any>();

  const unsubscribe = onSnapshot(
    q,
    async (snap) => {
      try {
        const bids = snap.docs.map((d) => ({ id: d.id, data: d.data() as any }));

        // Pre-fetch the unique parent requests in parallel.
        const uniqueRequestIds = Array.from(
          new Set(bids.map((b) => String(b.data.requestId || ''))),
        ).filter(Boolean);
        await Promise.all(
          uniqueRequestIds.map(async (rid) => {
            if (requestCache.has(rid)) return;
            try {
              const reqSnap = await getDoc(doc(db, 'serviceRequests', rid));
              if (reqSnap.exists()) {
                requestCache.set(rid, reqSnap.data());
              } else {
                requestCache.set(rid, null);
              }
            } catch {
              requestCache.set(rid, null);
            }
          }),
        );

        const items: ProviderBidHistoryItem[] = bids.map(({ id, data }) => {
          const req = requestCache.get(String(data.requestId || '')) || null;
          const status = deriveStatus(id, data, req);
          return {
            bidId: id,
            requestId: String(data.requestId || ''),
            problemSummary: extractProblemSummary(req),
            city: extractCity(req),
            price: typeof data.price === 'number' ? data.price : null,
            availabilityStartAt: tsToIso(data.availabilityStartAt),
            availabilityEndAt: tsToIso(data.availabilityEndAt),
            status,
            createdAt: tsToDate(data.createdAt) || tsToDate(data.receivedAt) || new Date(),
          };
        });

        // Newest first — providers care about what's just landed.
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        onChange(items, null);
      } catch (err: any) {
        onChange([], err instanceof Error ? err : new Error(String(err)));
      }
    },
    (err) => {
      onChange([], err instanceof Error ? err : new Error(String(err)));
    },
  );

  return unsubscribe;
}

// ────────────────────────────────────────────────────────────────────────────
// Pure helpers — also exported for unit tests.
// ────────────────────────────────────────────────────────────────────────────

export function deriveStatus(
  bidId: string,
  bid: { availabilityStartAt?: any },
  request: any,
): ProviderBidStatus {
  const reqStatus = String(request?.status || '').toLowerCase();
  const selectedBidId = String(request?.selectedBidId || '');

  if (selectedBidId && selectedBidId === bidId) {
    if (reqStatus === 'closed') return 'completed';
    return 'selected';
  }

  // Customer picked someone else
  if (reqStatus === 'closed' && selectedBidId && selectedBidId !== bidId) {
    return 'lost';
  }

  // Still open but the offered window has already passed
  const startIso = tsToIso(bid.availabilityStartAt);
  if (startIso && new Date(startIso).getTime() < Date.now() && reqStatus !== 'closed') {
    return 'expired';
  }

  return 'sent';
}

function extractProblemSummary(req: any): string {
  if (!req) return '';
  const ai = req.aiAnalysis?.shortSummary;
  if (typeof ai === 'string' && ai.trim()) return ai.trim();
  const text = req.textDescription;
  if (typeof text === 'string' && text.trim()) {
    return text.trim().slice(0, 80);
  }
  return '';
}

function extractCity(req: any): string {
  const c = req?.location?.city || req?.city;
  return typeof c === 'string' ? c : '';
}

function tsToDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function tsToIso(value: any): string | null {
  const d = tsToDate(value);
  return d ? d.toISOString() : null;
}
