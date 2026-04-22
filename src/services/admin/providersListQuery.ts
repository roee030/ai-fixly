import {
  getFirestore, collection, getDocs, query, orderBy, limit,
} from '../firestore/imports';

export interface AdminProviderRow {
  phone: string;
  displayName: string;
  profession: string;
  city: string;
  offersSent: number;
  accepted: number;
  completed: number;
  avgRating: number | null;
  avgPricePaid: number | null;
  totalGrossValue: number;
  avgResponseMinutes: number | null;
}

/**
 * List up to 200 providers for the admin `/admin/providers` page, sorted
 * by total gross value descending so the top earners surface first.
 * Returns [] when no aggregates exist yet (fresh install).
 */
export async function queryProvidersList(maxRows = 200): Promise<AdminProviderRow[]> {
  const db = getFirestore();
  const snap = await getDocs(
    query(
      collection(db, 'providers_agg'),
      orderBy('stats.totalGrossValue', 'desc'),
      limit(maxRows),
    ),
  ).catch(() => null);

  if (!snap) return [];

  return snap.docs.map((d: any) => {
    const data = d.data() || {};
    const stats = data.stats || {};
    return {
      phone: d.id,
      displayName: data.displayName || d.id,
      profession: data.profession || '',
      city: data.city || 'unknown',
      offersSent: stats.offersSent ?? 0,
      accepted: stats.accepted ?? 0,
      completed: stats.completed ?? 0,
      avgRating: typeof stats.avgRating === 'number' && stats.avgRating > 0 ? stats.avgRating : null,
      avgPricePaid: typeof stats.avgPricePaid === 'number' && stats.avgPricePaid > 0 ? stats.avgPricePaid : null,
      totalGrossValue: stats.totalGrossValue ?? 0,
      avgResponseMinutes: typeof stats.avgResponseMinutes === 'number' && stats.avgResponseMinutes > 0 ? stats.avgResponseMinutes : null,
    };
  });
}
