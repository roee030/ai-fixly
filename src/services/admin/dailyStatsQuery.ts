import {
  getFirestore, collection, query, orderBy, limit, getDocs,
} from '../firestore/imports';
import type { AdminDailyStats } from '../../types';

/**
 * Fetch the N most recent daily-rollup docs. Used by every overview chart
 * so the admin screen reads at most 90 small docs per load even after
 * years of production data.
 */
export async function queryDailyStats(days: 30 | 90 = 30): Promise<AdminDailyStats[]> {
  const db = getFirestore();
  const snap = await getDocs(
    query(collection(db, 'adminStats'), orderBy('date', 'desc'), limit(days)),
  );
  const rows: AdminDailyStats[] = snap.docs.map((d: any) => {
    const data = d.data() || {};
    return {
      date: data.date || '',
      requestsCreated: data.requestsCreated ?? 0,
      reviewsSubmitted: data.reviewsSubmitted ?? 0,
      avgTimeToFirstResponseMin: data.avgTimeToFirstResponseMin ?? 0,
      avgRating: data.avgRating ?? 0,
      grossValue: data.grossValue ?? 0,
      byCity: data.byCity || {},
    };
  });

  // Firestore returned newest → oldest; reverse for left-to-right chart order.
  return rows.reverse();
}
