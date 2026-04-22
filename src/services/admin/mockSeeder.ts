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

export async function seedAdminMocks(): Promise<{
  requests: number; providers: number; days: number; events: number; jobs: number; alerts: number;
}> {
  const db = getFirestore();
  const counts = { requests: 0, providers: 0, days: 0, events: 0, jobs: 0, alerts: 0 };

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

    const requestRef = await addDoc(collection(db, 'serviceRequests'), req);
    counts.requests++;

    // Events subcollection — powers the service timeline on
    // /admin/requests/[id]. 6 events per request gives a realistic mix.
    const eventTypes: Array<{ type: string; ok: boolean; duration: number; meta?: Record<string, unknown> }> = [
      { type: 'gemini', ok: true, duration: 3200, meta: { model: 'gemini-2.5-flash', imageCount: 2 } },
      { type: 'upload_image', ok: true, duration: 850, meta: { sizeMB: 2.1 } },
      { type: 'places_search', ok: true, duration: 420, meta: { profession: prof, foundCount: 12 } },
      { type: 'twilio_send', ok: true, duration: 1100, meta: { providerPhone: mockProviders[i % mockProviders.length].phone } },
      { type: 'twilio_send', ok: failedCount > 0 ? false : true, duration: 980, meta: { providerPhone: '+972541111111' } },
    ];
    if (status !== 'open' || sentCount > 0) {
      eventTypes.push({
        type: 'first_response', ok: true, duration: 0,
        meta: { providerPhone: mockProviders[i % mockProviders.length].phone, minutesAfterBroadcast: req.timeToFirstResponse },
      });
    }
    for (let ei = 0; ei < eventTypes.length; ei++) {
      const ev = eventTypes[ei];
      const when = new Date(createdAt.getTime() + ei * 500);
      await addDoc(collection(db, 'serviceRequests', requestRef.id, 'events'), {
        type: ev.type,
        ok: ev.ok,
        durationMs: ev.duration,
        error: ev.ok ? undefined : 'mock-error',
        metadata: ev.meta || {},
        startedAt: when,
      });
      counts.events++;
    }

    // Provider jobs subcollection — powers /admin/providers/[phone] history.
    if (status === 'closed') {
      const provider = mockProviders[i % mockProviders.length];
      await setDoc(
        doc(db, 'providers_agg', provider.phone, 'jobs', requestRef.id),
        {
          requestId: requestRef.id,
          bidPrice: (req as any).selectedBidPrice ?? 300,
          pricePaid: (req.reviewSummary as any)?.pricePaid ?? 320,
          rating: (req.reviewSummary as any)?.rating ?? 5,
          comment: (req.reviewSummary as any)?.comment ?? '',
          customerReviewedAt: (req.reviewSummary as any)?.submittedAt ?? new Date(),
          status: 'completed',
          completedAt: (req.reviewSummary as any)?.submittedAt ?? new Date(),
        },
      );
      counts.jobs++;
    }
  }

  // ── Admin alerts ─────────────────────────────────────────────────────
  // Powers the alerts feed on overview (Phase 5). 3 alerts of varying
  // severity so the UI has something to render.
  const alerts = [
    { type: 'stale_request', severity: 'critical' as const, message: 'בקשה פתוחה 5 שעות בלי הצעות — חדרה, אינסטלטור' },
    { type: 'low_rating', severity: 'warning' as const, message: 'דוד מ. (אינסטלטור נתניה) ירד מתחת ל-3 כוכבים החודש' },
    { type: 'twilio_failure', severity: 'info' as const, message: 'Twilio דחה 2 מספרים בשידור האחרון' },
  ];
  for (const a of alerts) {
    await addDoc(collection(db, 'admin_alerts'), {
      ...a,
      createdAt: new Date(Date.now() - Math.random() * 12 * 3600_000),
      metadata: {},
      read: false,
    });
    counts.alerts++;
  }

  return counts;
}
