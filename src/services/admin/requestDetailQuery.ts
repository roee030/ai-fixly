import {
  getFirestore, collection, doc, getDoc, getDocs, query, orderBy, where,
} from '../firestore/imports';

export interface AdminRequestEvent {
  id: string;
  type: string;
  ok: boolean;
  startedAt: Date;
  durationMs: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface AdminRequestDetail {
  id: string;
  userId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  city: string;
  textDescription?: string;
  mediaUrls: string[];
  aiProfessions: string[];
  broadcastSummary?: {
    sentCount: number;
    failedCount: number;
    providersFound: number;
    startedAt?: Date;
    finishedAt?: Date;
  };
  serviceSummary?: {
    geminiMs: number;
    uploadMs: number;
    firestoreWriteMs: number;
    totalMs: number;
  };
  timeToFirstResponse?: number;
  selectedProviderName?: string;
  selectedProviderPhone?: string;
  selectedBidPrice?: number;
  review?: {
    rating: number;
    comment: string;
    pricePaid: number;
    submittedAt: Date;
  };
  events: AdminRequestEvent[];
  bids: Array<{
    id: string;
    providerName: string;
    providerPhone: string;
    price: number | null;
    availability: string | null;
    receivedAt: Date | null;
    isReal: boolean;
  }>;
}

export async function fetchRequestDetail(requestId: string): Promise<AdminRequestDetail | null> {
  const db = getFirestore();

  const snap = await getDoc(doc(db, 'serviceRequests', requestId));
  if (!(snap as any).exists?.()) return null;
  const data = (snap as any).data() || {};

  const locationSummary = data.locationSummary || {};
  const review = data.reviewSummary;
  const bs = data.broadcastSummary;
  const ss = data.serviceSummary;

  const mediaUrls: string[] = Array.isArray(data.media)
    ? (data.media as Array<{ downloadUrl?: string }>).map((m) => m.downloadUrl || '').filter(Boolean)
    : [];
  const aiProfs: string[] = Array.isArray(data.aiAnalysis?.professions)
    ? data.aiAnalysis.professions
    : [];

  // Events subcollection — ordered oldest → newest for the timeline.
  const eventsSnap = await getDocs(
    query(collection(db, 'serviceRequests', requestId, 'events'), orderBy('startedAt', 'asc')),
  );
  const events: AdminRequestEvent[] = eventsSnap.docs.map((d: any) => {
    const e = d.data() || {};
    return {
      id: d.id,
      type: e.type || 'unknown',
      ok: !!e.ok,
      startedAt: e.startedAt?.toDate?.() ?? new Date(0),
      durationMs: typeof e.durationMs === 'number' ? e.durationMs : 0,
      error: e.error || undefined,
      metadata: e.metadata || undefined,
    };
  });

  // Bids collection filter by requestId.
  const bidsSnap = await getDocs(
    query(collection(db, 'bids'), where('requestId', '==', requestId)),
  );
  const bids = bidsSnap.docs.map((d: any) => {
    const b = d.data() || {};
    return {
      id: d.id,
      providerName: b.providerName || b.displayName || 'בעל מקצוע',
      providerPhone: b.providerPhone || '',
      price: typeof b.price === 'number' ? b.price : null,
      availability: b.availability || null,
      receivedAt: b.receivedAt?.toDate?.() ?? null,
      isReal: !!b.isReal,
    };
  });

  return {
    id: requestId,
    userId: data.userId || '',
    status: data.status || 'unknown',
    createdAt: data.createdAt?.toDate?.() ?? new Date(0),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(0),
    city: locationSummary.city || 'unknown',
    textDescription: data.textDescription || '',
    mediaUrls,
    aiProfessions: aiProfs,
    broadcastSummary: bs ? {
      sentCount: bs.sentCount ?? 0,
      failedCount: bs.failedCount ?? 0,
      providersFound: bs.providersFound ?? 0,
      startedAt: bs.startedAt?.toDate?.(),
      finishedAt: bs.finishedAt?.toDate?.(),
    } : undefined,
    serviceSummary: ss ? {
      geminiMs: ss.geminiMs ?? 0,
      uploadMs: ss.uploadMs ?? 0,
      firestoreWriteMs: ss.firestoreWriteMs ?? 0,
      totalMs: ss.totalMs ?? 0,
    } : undefined,
    timeToFirstResponse: typeof data.timeToFirstResponse === 'number' ? data.timeToFirstResponse : undefined,
    selectedProviderName: data.selectedProviderName || undefined,
    selectedProviderPhone: data.selectedProviderPhone || undefined,
    selectedBidPrice: typeof data.selectedBidPrice === 'number' ? data.selectedBidPrice : undefined,
    review: review ? {
      rating: review.rating ?? 0,
      comment: review.comment ?? '',
      pricePaid: review.pricePaid ?? 0,
      submittedAt: review.submittedAt?.toDate?.() ?? new Date(0),
    } : undefined,
    events,
    bids,
  };
}
