import {
  getFirestore, collection, doc, getDoc, getDocs, query, orderBy,
} from '../firestore/imports';

export interface AdminProviderDetail {
  phone: string;
  displayName: string;
  profession: string;
  city: string;
  stats: {
    offersSent: number;
    accepted: number;
    completed: number;
    avgRating: number;
    avgPricePaid: number;
    totalGrossValue: number;
    replyRate: number;
    avgResponseMinutes: number;
    lastJobAt?: Date;
  };
  jobs: Array<{
    requestId: string;
    bidPrice: number;
    pricePaid?: number;
    rating?: number;
    comment?: string;
    customerReviewedAt?: Date;
    status: string;
    completedAt?: Date;
  }>;
}

/**
 * Reads `providers_agg/{phone}` + its `jobs/` subcollection. Returns
 * null when no aggregate exists yet — admin UI shows "no data yet"
 * rather than synthesizing zeros.
 */
export async function fetchProviderDetail(phone: string): Promise<AdminProviderDetail | null> {
  const db = getFirestore();

  const snap = await getDoc(doc(db, 'providers_agg', phone));
  if (!(snap as any).exists?.()) return null;
  const data = (snap as any).data() || {};
  const stats = data.stats || {};

  const jobsSnap = await getDocs(
    query(collection(db, 'providers_agg', phone, 'jobs'), orderBy('completedAt', 'desc')),
  );
  const jobs = jobsSnap.docs.map((d: any) => {
    const j = d.data() || {};
    return {
      requestId: j.requestId || d.id,
      bidPrice: j.bidPrice ?? 0,
      pricePaid: j.pricePaid ?? undefined,
      rating: j.rating ?? undefined,
      comment: j.comment ?? undefined,
      customerReviewedAt: j.customerReviewedAt?.toDate?.(),
      status: j.status || 'unknown',
      completedAt: j.completedAt?.toDate?.(),
    };
  });

  return {
    phone,
    displayName: data.displayName || phone,
    profession: data.profession || '',
    city: data.city || 'unknown',
    stats: {
      offersSent: stats.offersSent ?? 0,
      accepted: stats.accepted ?? 0,
      completed: stats.completed ?? 0,
      avgRating: stats.avgRating ?? 0,
      avgPricePaid: stats.avgPricePaid ?? 0,
      totalGrossValue: stats.totalGrossValue ?? 0,
      replyRate: stats.replyRate ?? 0,
      avgResponseMinutes: stats.avgResponseMinutes ?? 0,
      lastJobAt: stats.lastJobAt?.toDate?.(),
    },
    jobs,
  };
}
