import { computeMonthlyStats } from './providerStats';
import type { ProviderBidHistoryItem } from '../../types/providerProfile';

function bid(
  partial: Partial<ProviderBidHistoryItem> & { createdAt: Date; status: ProviderBidHistoryItem['status'] },
): ProviderBidHistoryItem {
  return {
    bidId: 'b' + Math.random(),
    requestId: 'r' + Math.random(),
    problemSummary: '',
    city: '',
    price: 100,
    availabilityStartAt: null,
    availabilityEndAt: null,
    ...partial,
  };
}

describe('computeMonthlyStats', () => {
  // Pin July 2026 — middle of summer, no DST edge to worry about.
  const now = new Date('2026-07-15T10:00:00Z');

  it('returns zeroes for an empty history', () => {
    const s = computeMonthlyStats([], now);
    expect(s.bidsSent).toBe(0);
    expect(s.bidsSelected).toBe(0);
    expect(s.jobsCompleted).toBe(0);
    expect(s.successRatePct).toBe(0);
    expect(s.monthIndex).toBe(6); // July
    expect(s.year).toBe(2026);
  });

  it('counts only bids in the current month', () => {
    const items = [
      bid({ createdAt: new Date('2026-07-01T08:00:00Z'), status: 'sent' }),
      bid({ createdAt: new Date('2026-07-15T09:30:00Z'), status: 'selected' }),
      bid({ createdAt: new Date('2026-06-30T20:00:00Z'), status: 'sent' }), // last month
      bid({ createdAt: new Date('2026-08-01T05:00:00Z'), status: 'sent' }), // next month
    ];
    const s = computeMonthlyStats(items, now);
    expect(s.bidsSent).toBe(2);
  });

  it('counts selected + completed as "selected"', () => {
    const items = [
      bid({ createdAt: new Date('2026-07-02T10:00:00Z'), status: 'selected' }),
      bid({ createdAt: new Date('2026-07-03T10:00:00Z'), status: 'completed' }),
      bid({ createdAt: new Date('2026-07-04T10:00:00Z'), status: 'sent' }),
      bid({ createdAt: new Date('2026-07-05T10:00:00Z'), status: 'lost' }),
    ];
    const s = computeMonthlyStats(items, now);
    expect(s.bidsSent).toBe(4);
    expect(s.bidsSelected).toBe(2);
    expect(s.jobsCompleted).toBe(1);
    expect(s.successRatePct).toBe(50); // 2/4
  });

  it('rounds success rate to nearest integer', () => {
    const items = [
      bid({ createdAt: new Date('2026-07-02T10:00:00Z'), status: 'selected' }),
      bid({ createdAt: new Date('2026-07-03T10:00:00Z'), status: 'sent' }),
      bid({ createdAt: new Date('2026-07-04T10:00:00Z'), status: 'sent' }),
    ];
    const s = computeMonthlyStats(items, now);
    expect(s.successRatePct).toBe(33); // 1/3 = 33.33%
  });

  it('handles Israel month-boundary at midnight (summer DST = +3)', () => {
    // 2026-08-01 02:00 UTC == 2026-08-01 05:00 Israel (DST). Should be in August.
    const items = [
      bid({ createdAt: new Date('2026-08-01T02:00:00Z'), status: 'sent' }),
    ];
    const julyStats = computeMonthlyStats(items, now);
    expect(julyStats.bidsSent).toBe(0);

    const augNow = new Date('2026-08-15T10:00:00Z');
    const augStats = computeMonthlyStats(items, augNow);
    expect(augStats.bidsSent).toBe(1);
  });
});
