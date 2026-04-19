import type {
  ProviderBidHistoryItem,
  ProviderMonthlyStats,
} from '../../types/providerProfile';

/**
 * Compute current-month aggregates from a flat history list.
 * Pure function — no Firestore reads, no time mocking gotchas (caller
 * passes `now` explicitly so tests can pin the month).
 *
 * "Current month" means the calendar month of `now` in Israel local time.
 * The month flips at midnight Israel-local on the 1st.
 */
export function computeMonthlyStats(
  history: ProviderBidHistoryItem[],
  now: Date,
): ProviderMonthlyStats {
  const israel = toIsraelLocal(now);
  const monthIndex = israel.getUTCMonth();
  const year = israel.getUTCFullYear();

  // Filter to bids submitted in the current Israel-local month.
  const thisMonth = history.filter((item) => {
    const local = toIsraelLocal(item.createdAt);
    return (
      local.getUTCMonth() === monthIndex && local.getUTCFullYear() === year
    );
  });

  const bidsSent = thisMonth.length;
  const bidsSelected = thisMonth.filter(
    (i) => i.status === 'selected' || i.status === 'completed',
  ).length;
  const jobsCompleted = thisMonth.filter((i) => i.status === 'completed').length;

  const successRatePct =
    bidsSent === 0 ? 0 : Math.round((bidsSelected / bidsSent) * 100);

  return {
    monthIndex,
    year,
    bidsSent,
    bidsSelected,
    jobsCompleted,
    successRatePct,
  };
}

/**
 * Shift a UTC Date by Israel's offset so subsequent getUTC* calls return
 * Israel-local wall-clock components. Same approximation used elsewhere
 * in the codebase (formatAvailability, geminiParser).
 */
function toIsraelLocal(d: Date): Date {
  const offsetH = israelOffsetHours(d);
  return new Date(d.getTime() + offsetH * 60 * 60 * 1000);
}

function israelOffsetHours(d: Date): number {
  const month = d.getUTCMonth();
  if (month < 2 || month > 9) return 2;
  if (month > 2 && month < 9) return 3;
  const inSummer = month === 2 ? d.getUTCDate() >= 25 : d.getUTCDate() < 25;
  return inSummer ? 3 : 2;
}
