import {
  getFirestore, collection, doc, setDoc, addDoc, serverTimestamp,
} from '../firestore/imports';

/**
 * Dev-mode seeder that pre-populates the admin dashboard with plausible
 * fake data. Purely additive — writes mock documents into the same
 * collections the real dashboard reads from, so the admin screens render
 * something useful before the first real request flows through.
 *
 * Trigger: dev-only button on the admin overview (see AdminSeedButton).
 * Safe to re-run; uses deterministic doc ids so repeated seeds overwrite
 * rather than duplicating.
 */

const CITIES = ['hadera', 'netanya', 'tlv', 'ramat_gan', 'haifa', 'kfar_saba'];
const PROFESSIONS = ['plumber', 'electrician', 'locksmith', 'painter', 'handyman'];

export async function seedAdminMocks(): Promise<{ requests: number; providers: number; days: number }> {
  const db = getFirestore();
  const counts = { requests: 0, providers: 0, days: 0 };

  // ── 14 days of adminStats/daily-* ─────────────────────────────────────
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ymd = d.toISOString().slice(0, 10);
    const docId = `daily-${ymd.replace(/-/g, '')}`;
    const requestsToday = 3 + Math.floor(Math.random() * 8);
    const reviews = Math.floor(requestsToday * (0.3 + Math.random() * 0.4));
    const ttfr = Math.round(8 + Math.random() * 30);
    const rating = Number((3.8 + Math.random() * 1.1).toFixed(1));
    const gross = reviews * (200 + Math.floor(Math.random() * 500));

    const byCity: Record<string, unknown> = {};
    for (const c of CITIES) {
      const share = Math.random();
      byCity[c] = {
        requestsCreated: Math.round(requestsToday * share),
        reviewsSubmitted: Math.round(reviews * share),
        avgTimeToFirstResponseMin: ttfr + Math.round((Math.random() - 0.5) * 8),
        avgRating: Number((rating + (Math.random() - 0.5) * 0.3).toFixed(1)),
        grossValue: Math.round(gross * share),
      };
    }

    await setDoc(doc(db, 'adminStats', docId), {
      date: ymd,
      requestsCreated: requestsToday,
      reviewsSubmitted: reviews,
      avgTimeToFirstResponseMin: ttfr,
      avgRating: rating,
      grossValue: gross,
      byCity,
    });
    counts.days++;
  }

  // ── 6 provider aggregates ─────────────────────────────────────────────
  const mockProviders = [
    { phone: '+972521000001', displayName: 'שלומי אינסטלטור', profession: 'plumber', city: 'hadera' },
    { phone: '+972521000002', displayName: 'יוסי חשמלאי', profession: 'electrician', city: 'netanya' },
    { phone: '+972521000003', displayName: 'מוחמד מזגנים', profession: 'handyman', city: 'haifa' },
    { phone: '+972521000004', displayName: 'אלכס הצבעי', profession: 'painter', city: 'ramat_gan' },
    { phone: '+972521000005', displayName: 'דוד מנעולן', profession: 'locksmith', city: 'tlv' },
    { phone: '+972521000006', displayName: 'ויקטור מסגר', profession: 'handyman', city: 'kfar_saba' },
  ];
  for (const p of mockProviders) {
    const offers = 8 + Math.floor(Math.random() * 20);
    const accepted = Math.floor(offers * (0.4 + Math.random() * 0.4));
    const completed = Math.floor(accepted * (0.6 + Math.random() * 0.35));
    const avgRating = Number((3.8 + Math.random() * 1.1).toFixed(2));
    const avgPrice = 250 + Math.floor(Math.random() * 400);
    const gross = completed * avgPrice;

    await setDoc(doc(db, 'providers_agg', p.phone), {
      phone: p.phone,
      displayName: p.displayName,
      profession: p.profession,
      city: p.city,
      stats: {
        offersSent: offers,
        accepted,
        completed,
        avgRating,
        avgPricePaid: avgPrice,
        totalGrossValue: gross,
        replyRate: Math.round((accepted / offers) * 100),
        avgResponseMinutes: 5 + Math.floor(Math.random() * 50),
        lastJobAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });
    counts.providers++;
  }

  // ── 8 mock serviceRequests (new in last 14 days) ──────────────────────
  const statuses = ['open', 'open', 'in_progress', 'closed', 'closed', 'closed', 'open', 'closed'];
  for (let i = 0; i < 8; i++) {
    const city = CITIES[i % CITIES.length];
    const prof = PROFESSIONS[i % PROFESSIONS.length];
    const status = statuses[i];
    const createdAt = new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000);
    const sentCount = 3 + Math.floor(Math.random() * 5);
    const failedCount = Math.random() < 0.3 ? 1 : 0;

    const req: Record<string, unknown> = {
      userId: 'mock-user',
      status,
      createdAt,
      updatedAt: createdAt,
      textDescription: `[MOCK] בקשה ${i + 1} — ${prof}`,
      media: [],
      aiAnalysis: { professions: [prof], professionLabelsHe: [prof], shortSummary: '' },
      location: { lat: 32.4 + Math.random() * 0.4, lng: 34.9 + Math.random() * 0.3, address: '[mock]' },
      locationSummary: { city, region: city === 'haifa' ? 'north' : 'sharon' },
      broadcastSummary: {
        sentCount,
        failedCount,
        providersFound: sentCount + failedCount + 1,
        startedAt: createdAt,
        finishedAt: new Date(createdAt.getTime() + 60_000),
      },
      serviceSummary: { geminiMs: 3200, uploadMs: 1200, firestoreWriteMs: 400, totalMs: 4800, hadError: false },
      timeToFirstResponse: 5 + Math.floor(Math.random() * 40),
    };
    if (status === 'closed') {
      const rating = 3 + Math.floor(Math.random() * 3);
      const pricePaid = 200 + Math.floor(Math.random() * 600);
      req.selectedProviderName = mockProviders[i % mockProviders.length].displayName;
      req.selectedProviderPhone = mockProviders[i % mockProviders.length].phone;
      req.selectedBidPrice = pricePaid - Math.floor(Math.random() * 50);
      req.reviewSummary = {
        rating,
        comment: rating >= 4 ? 'עבודה מצוינת, מקצועי ויעיל' : 'בסדר, איחר קצת',
        pricePaid,
        submittedAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
      };
    }

    await addDoc(collection(db, 'serviceRequests'), req);
    counts.requests++;
  }

  return counts;
}
