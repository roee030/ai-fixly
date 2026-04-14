import {
  collection, getDocs, query, orderBy, updateDoc, doc,
} from '../firestore/imports';
import { db } from '../../config/firebase';
import type {
  FunnelData, ProviderStat, EngagementData, AdminAlert, DateRange,
} from './types';
import {
  MOCK_FUNNEL, MOCK_PROVIDERS, MOCK_ENGAGEMENT, MOCK_ALERTS,
  MOCK_DEMAND,
} from './mockData';
import type { DemandEntry } from './types';

function getCutoffDate(range: DateRange): Date {
  const days = range === '7d' ? 7 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (typeof (val as { toDate?: unknown }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  if (val instanceof Date) return val;
  if (typeof val === 'string' || typeof val === 'number') return new Date(val);
  return new Date();
}

function snapToDocs(snap: { docs?: { id: string; data: () => Record<string, unknown> }[] } | null) {
  return (snap?.docs ?? []).map((d) => ({ id: d.id, ...d.data() }));
}

async function safeDocs(ref: ReturnType<typeof collection>) {
  try { return await getDocs(ref); } catch { return null; }
}

async function safeQuery(...args: Parameters<typeof getDocs>) {
  try { return await getDocs(...args); } catch { return null; }
}

// ---------------------------------------------------------------------------
// Funnel
// ---------------------------------------------------------------------------

function countUniqueAction(
  logs: Record<string, unknown>[],
  action: string,
): number {
  return new Set(
    logs
      .filter((l) => l.action === action)
      .map((l) => (l.sessionId || l.userId) as string),
  ).size;
}

export async function getFunnelData(range: DateRange): Promise<FunnelData> {
  const cutoff = getCutoffDate(range);

  const [logsSnap, requestsSnap, bidsSnap, reviewsSnap] = await Promise.all([
    safeDocs(collection(db, 'session_logs')),
    safeDocs(collection(db, 'serviceRequests')),
    safeDocs(collection(db, 'bids')),
    safeDocs(collection(db, 'reviews')),
  ]);

  const logs = snapToDocs(logsSnap)
    .map((l) => ({ ...l, createdAt: toDate(l.createdAt) }))
    .filter((l) => l.createdAt >= cutoff);

  const requests = snapToDocs(requestsSnap)
    .map((r) => ({ ...r, createdAt: toDate(r.createdAt) }))
    .filter((r) => r.createdAt >= cutoff);

  const bids = snapToDocs(bidsSnap)
    .map((b) => ({ ...b, createdAt: toDate(b.createdAt ?? b.receivedAt) }))
    .filter((b) => b.createdAt >= cutoff);

  const reviews = snapToDocs(reviewsSnap)
    .map((r) => ({ ...r, createdAt: toDate(r.createdAt) }))
    .filter((r) => r.createdAt >= cutoff);

  const captureStarted = countUniqueAction(logs, 'capture_started');
  const photoAdded =
    countUniqueAction(logs, 'photo_added') +
    countUniqueAction(logs, 'video_recorded');
  const submitted = countUniqueAction(logs, 'capture_submitted');
  const confirmed = countUniqueAction(logs, 'request_confirmed');

  const requestIdsWithBids = new Set(bids.map((b) => b.requestId as string));
  const receivedBid = requestIdsWithBids.size;
  const selected = requests.filter(
    (r) => r.status === 'in_progress' || r.status === 'closed',
  ).length;
  const chatOpened = countUniqueAction(logs, 'chat_opened');
  const closed = requests.filter((r) => r.status === 'closed').length;
  const reviewed = reviews.length;

  const rawSteps = [
    { name: 'capture_started', nameHe: 'התחילו צילום', count: captureStarted },
    { name: 'photo_added', nameHe: 'הוסיפו תמונה/סרטון', count: photoAdded },
    { name: 'submitted', nameHe: 'שלחו לניתוח', count: submitted },
    { name: 'confirmed', nameHe: 'אישרו ושלחו', count: confirmed },
    { name: 'received_bid', nameHe: 'קיבלו הצעה', count: receivedBid },
    { name: 'selected', nameHe: 'בחרו בעל מקצוע', count: selected },
    { name: 'chat_opened', nameHe: "פתחו צ'אט", count: chatOpened },
    { name: 'closed', nameHe: 'סגרו בקשה', count: closed },
    { name: 'reviewed', nameHe: 'השאירו ביקורת', count: reviewed },
  ];

  const total = rawSteps[0]?.count || 1;
  const steps = rawSteps.map((step, i) => ({
    ...step,
    dropOff: i === 0 ? 0 : rawSteps[i - 1].count - step.count,
    conversionPercent: Math.round((step.count / total) * 100),
  }));

  // Avg time to first bid (minutes)
  const bidTimes: number[] = [];
  for (const req of requests) {
    const reqBids = bids
      .filter((b) => b.requestId === req.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    if (reqBids.length > 0) {
      const diff = (reqBids[0].createdAt.getTime() - req.createdAt.getTime()) / 60_000;
      if (diff > 0 && diff < 24 * 60) bidTimes.push(diff);
    }
  }
  const avgTimeToFirstBid =
    bidTimes.length > 0
      ? Math.round(bidTimes.reduce((a, b) => a + b, 0) / bidTimes.length)
      : null;

  const avgBidsPerRequest =
    requests.length > 0
      ? Math.round((bids.length / requests.length) * 10) / 10
      : null;

  const requestsWithZeroBids = requests.filter(
    (r) => !requestIdsWithBids.has(r.id) && r.status === 'open',
  ).length;

  const totalRequests = confirmed;
  const conversionRate = totalRequests > 0
    ? Math.round((selected / totalRequests) * 100)
    : 0;

  if (steps.every((s) => s.count === 0)) {
    return MOCK_FUNNEL;
  }

  return { steps, avgTimeToFirstBid, avgBidsPerRequest, requestsWithZeroBids, totalRequests, conversionRate };
}

// ---------------------------------------------------------------------------
// Provider stats
// ---------------------------------------------------------------------------

export async function getProviderStats(range: DateRange): Promise<ProviderStat[]> {
  const cutoff = getCutoffDate(range);

  const [bidsSnap, requestsSnap, reviewsSnap] = await Promise.all([
    safeDocs(collection(db, 'bids')),
    safeDocs(collection(db, 'serviceRequests')),
    safeDocs(collection(db, 'reviews')),
  ]);

  const bids = snapToDocs(bidsSnap)
    .map((b) => ({ ...b, createdAt: toDate(b.createdAt) }))
    .filter((b) => b.createdAt >= cutoff);

  const requests = snapToDocs(requestsSnap);

  const reviews = snapToDocs(reviewsSnap)
    .filter((r) => toDate(r.createdAt) >= cutoff);

  const map: Record<string, ProviderStat> = {};

  for (const bid of bids) {
    const phone = (bid.providerPhone || 'unknown') as string;
    if (!map[phone]) {
      map[phone] = {
        displayName: (bid.displayName || bid.providerName || phone) as string,
        phone,
        offersSent: 0,
        accepted: 0,
        completed: 0,
        customerConfirmed: 0,
        avgRating: null,
        avgPrice: null,
        replyRate: 0,
      };
    }
    map[phone].offersSent++;

    const req = requests.find((r) => r.id === bid.requestId);
    if (req && (req.selectedProviderPhone === phone || req.selectedBidId === bid.id)) {
      map[phone].accepted++;
      if (req.status === 'closed') map[phone].completed++;
    }
  }

  for (const review of reviews) {
    const phone = review.providerPhone as string;
    if (map[phone]) map[phone].customerConfirmed++;
  }

  for (const phone of Object.keys(map)) {
    const provRevs = reviews.filter((r) => r.providerPhone === phone);
    if (provRevs.length > 0) {
      map[phone].avgRating =
        Math.round(
          (provRevs.reduce((s, r) => s + ((r.rating as number) || 0), 0) /
            provRevs.length) *
            10,
        ) / 10;
      const prices = provRevs
        .filter((r) => r.pricePaid)
        .map((r) => r.pricePaid as number);
      if (prices.length > 0) {
        map[phone].avgPrice = Math.round(
          prices.reduce((a, b) => a + b, 0) / prices.length,
        );
      }
    }
  }

  for (const phone of Object.keys(map)) {
    const p = map[phone];
    p.replyRate = p.offersSent > 0 ? Math.round((p.accepted / p.offersSent) * 100) : 0;
  }

  const result = Object.values(map).sort((a, b) => b.replyRate - a.replyRate);
  if (result.length === 0) return MOCK_PROVIDERS;
  return result;
}

// ---------------------------------------------------------------------------
// Engagement
// ---------------------------------------------------------------------------

export async function getEngagementData(range: DateRange): Promise<EngagementData> {
  const cutoff = getCutoffDate(range);

  const [requestsSnap, bidsSnap] = await Promise.all([
    safeDocs(collection(db, 'serviceRequests')),
    safeDocs(collection(db, 'bids')),
  ]);

  const requests = snapToDocs(requestsSnap)
    .map((r) => ({ ...r, createdAt: toDate(r.createdAt) }))
    .filter((r) => r.createdAt >= cutoff);

  const bids = snapToDocs(bidsSnap)
    .map((b) => ({ ...b, createdAt: toDate(b.createdAt) }))
    .filter((b) => b.createdAt >= cutoff);

  let messagesSent = 0;
  for (const req of requests) {
    const providers = (req.broadcastedProviders || []) as unknown[];
    messagesSent += providers.length;
  }

  const realBids = bids.filter((b) => b.source === 'whatsapp');
  const providerReplied = realBids.length;

  let within1h = 0;
  let within4h = 0;
  const responseTimes: number[] = [];

  for (const bid of realBids) {
    const req = requests.find((r) => r.id === bid.requestId);
    if (req) {
      const diffMin =
        (bid.createdAt.getTime() - req.createdAt.getTime()) / 60_000;
      if (diffMin > 0 && diffMin < 24 * 60) {
        responseTimes.push(diffMin);
        if (diffMin <= 60) within1h++;
        if (diffMin <= 240) within4h++;
      }
    }
  }

  if (messagesSent === 0) return MOCK_ENGAGEMENT;

  return {
    messagesSent,
    providerReplied,
    replyWithin1h: within1h,
    replyWithin4h: within4h,
    positiveReplyRate:
      messagesSent > 0
        ? Math.round((providerReplied / messagesSent) * 100)
        : 0,
    avgResponseTimeMinutes:
      responseTimes.length > 0
        ? Math.round(
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
          )
        : null,
  };
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export async function getAlerts(): Promise<AdminAlert[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'admin_alerts'), orderBy('createdAt', 'desc')),
    );
    const alerts = (snap?.docs ?? []).slice(0, 50).map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AdminAlert, 'id' | 'createdAt'>),
      createdAt: toDate(d.data().createdAt),
    }));
    if (alerts.length === 0) return MOCK_ALERTS;
    return alerts;
  } catch {
    return MOCK_ALERTS;
  }
}

export async function markAlertRead(alertId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'admin_alerts', alertId), { read: true });
  } catch {
    // ignore
  }
}

export async function markAlertHandled(alertId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'admin_alerts', alertId), { handled: true, read: true });
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Demand Heatmap
// ---------------------------------------------------------------------------

export async function getDemandData(): Promise<DemandEntry[]> {
  return MOCK_DEMAND;
}
