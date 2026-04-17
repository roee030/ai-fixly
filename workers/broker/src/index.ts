/**
 * ai-fixly broker worker — the middleman between the mobile app and external
 * services (Google Places, Twilio WhatsApp, Gemini, Firebase).
 *
 * Routes:
 *   GET  /health            - health check
 *
 *   POST /broadcast         - App calls this after a new request. Worker
 *                             queries Google Places, creates bids (demo in
 *                             dry-run, otherwise sends WhatsApp to providers).
 *
 *   POST /provider/selected - App calls this when customer picks a bid.
 *                             Worker notifies that provider via WhatsApp and
 *                             stores phone->requestId in KV so future replies
 *                             are routed to the chat instead of creating bids.
 *
 *   POST /chat/send         - App calls this when customer sends a chat
 *                             message. Worker forwards it to the provider's
 *                             WhatsApp.
 *
 *   POST /webhook/twilio    - Twilio hits this on every inbound message.
 *                             - If the provider isn't selected yet → parse
 *                               with Gemini and create a bid.
 *                             - If already selected → write as chat message
 *                               to Firestore and push to customer app.
 */

import { Env } from './env';
import { findNearbyProvidersCached } from './placesCache';
import type { PlacesProvider } from './googlePlaces';
import { sendWhatsAppMessage, sendWhatsAppTemplate } from './twilio';
import { normaliseCityName } from './cityNames';
import { parseProviderReply } from './geminiParser';
import { FirestoreClient } from './firestore';
import { sendPush } from './fcm';
import { recordProviderContact, lookupProviderContact } from './phoneMap';
import { getUrgencyConfig } from './professionConfig';
import { shortenProviderName } from './nameUtils';
import { getProvidersForWave, getNextWaveTime } from './tiering';

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('[cron] running scheduled tasks...');

    const firestore = new FirestoreClient(env.FIREBASE_PROJECT_ID, env.FIREBASE_SERVICE_ACCOUNT_JSON);

    // Task 1: Send review reminders for requests in_progress for 24h+
    await handleReviewReminders(firestore, env).catch(err =>
      console.error('[cron] review reminders failed:', err)
    );

    // Task 2: Send wave 2/3 broadcasts for requests waiting for next wave
    await handlePendingWaves(firestore, env).catch(err =>
      console.error('[cron] wave broadcasts failed:', err)
    );

    // Task 3: Check for manager alerts (stale requests, unresponsive providers)
    await handleAlertChecks(firestore, env).catch(err =>
      console.error('[cron] alert checks failed:', err)
    );

    console.log('[cron] scheduled tasks complete');
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    // Reject oversized requests (prevent DoS via large payloads)
    const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
    if (contentLength > 1_000_000) { // 1MB max
      return jsonResponse({ error: 'Request too large' }, 413, request);
    }

    try {
      if (url.pathname === '/health') {
        return jsonResponse({ status: 'ok', time: new Date().toISOString() }, 200, request);
      }
      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';

      if (url.pathname === '/broadcast' && request.method === 'POST') {
        const rlOk = await checkRateLimit(env.PLACES_CACHE, `broadcast:${clientIp}`, 10, 3600);
        if (!rlOk) return jsonResponse({ error: 'Rate limited' }, 429, request);
        return await handleBroadcast(request, env, ctx);
      }
      if (url.pathname === '/provider/selected' && request.method === 'POST') {
        const rlOk = await checkRateLimit(env.PLACES_CACHE, `selected:${clientIp}`, 20, 3600);
        if (!rlOk) return jsonResponse({ error: 'Rate limited' }, 429, request);
        return await handleProviderSelected(request, env, ctx);
      }
      if (url.pathname === '/chat/send' && request.method === 'POST') {
        const rlOk = await checkRateLimit(env.PLACES_CACHE, `chat:${clientIp}`, 120, 3600);
        if (!rlOk) return jsonResponse({ error: 'Rate limited' }, 429, request);
        return await handleChatSend(request, env, ctx);
      }
      if (url.pathname === '/feedback/critical' && request.method === 'POST') {
        const rlOk = await checkRateLimit(env.PLACES_CACHE, `feedback:${clientIp}`, 5, 3600);
        if (!rlOk) return jsonResponse({ error: 'Rate limited' }, 429, request);
        return await handleCriticalFeedback(request, env);
      }
      if (url.pathname === '/webhook/twilio' && request.method === 'POST') {
        return await handleTwilioWebhook(request, env);
      }
      // Public provider-facing endpoints (called from /provider/* web routes).
      // Rate-limited by IP because these are unauthenticated.
      if (url.pathname.startsWith('/provider/request/') && request.method === 'GET') {
        const rlOk = await checkRateLimit(env.PLACES_CACHE, `pubreq:${clientIp}`, 60, 3600);
        if (!rlOk) return jsonResponse({ error: 'Rate limited' }, 429, request);
        return await handlePublicRequestSummary(request, env, url);
      }
      if (url.pathname === '/provider/bid' && request.method === 'POST') {
        const rlOk = await checkRateLimit(env.PLACES_CACHE, `pubbid:${clientIp}`, 30, 3600);
        if (!rlOk) return jsonResponse({ error: 'Rate limited' }, 429, request);
        return await handleProviderQuoteSubmission(request, env);
      }
      if (url.pathname === '/provider/report' && request.method === 'POST') {
        const rlOk = await checkRateLimit(env.PLACES_CACHE, `pubrep:${clientIp}`, 30, 3600);
        if (!rlOk) return jsonResponse({ error: 'Rate limited' }, 429, request);
        return await handleProviderReportSubmission(request, env);
      }
      return jsonResponse({ error: 'Not found' }, 404, request);
    } catch (err) {
      console.error('Worker error:', err);
      return jsonResponse(
        { error: 'Internal error', message: err instanceof Error ? err.message : 'Unknown' },
        500,
        request
      );
    }
  },
};

// =========================================================================
// /broadcast
// =========================================================================

interface BroadcastBody {
  requestId: string;
  professions: string[];
  shortSummary: string;
  mediaUrls: string[];
  location: { lat: number; lng: number; address: string };
}

async function handleBroadcast(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const body = (await request.json()) as BroadcastBody;
  if (!body.requestId || typeof body.requestId !== 'string' || body.requestId.length > 100) {
    return jsonResponse({ error: 'Invalid requestId' }, 400, request);
  }
  if (!body.professions || !Array.isArray(body.professions) || body.professions.length === 0) {
    return jsonResponse({ error: 'Invalid professions' }, 400, request);
  }
  if (!body.location) {
    return jsonResponse({ error: 'Missing location' }, 400, request);
  }

  // Test mode takes priority over dry-run. When TEST_PHONE_OVERRIDE is set,
  // we send exactly one real WhatsApp to that number (impersonating the first
  // provider) so the user can test the full round-trip from their own phone.
  const testPhone = (env.TEST_PHONE_OVERRIDE || '').trim();
  const isTestMode = testPhone.length > 0;
  const isDryRun = !isTestMode && (env.DRY_RUN || 'false').toLowerCase() === 'true';
  const urgency = (body as any).urgency || 'normal';
  const urgencyConfig = getUrgencyConfig(urgency);
  const maxProviders = isTestMode ? 1 : urgencyConfig.maxProviders;
  const radiusMeters = urgencyConfig.radiusMeters;
  const cacheTtl = parseInt(env.PLACES_CACHE_TTL_SECONDS || '86400', 10);

  console.log(
    `[broadcast] requestId=${body.requestId} professions=${body.professions.join(',')} ` +
      `lat=${body.location.lat} lng=${body.location.lng} dryRun=${isDryRun} testMode=${isTestMode}`
  );

  const firestore = new FirestoreClient(env.FIREBASE_PROJECT_ID, env.FIREBASE_SERVICE_ACCOUNT_JSON);

  // Fetch the set of provider phones that are already busy with another
  // in-progress job so we can exclude them from this broadcast.
  const busyPhones = await firestore.getBusyProviderPhones();
  console.log(`[broadcast] ${busyPhones.size} providers are currently busy`);

  // Find providers via Google Places (cached via KV)
  const allProviders: PlacesProvider[] = [];
  const seenPlaceIds = new Set<string>();

  for (const profession of body.professions) {
    try {
      const found = await findNearbyProvidersCached({
        kv: env.PLACES_CACHE,
        apiKey: env.GOOGLE_PLACES_API_KEY,
        profession,
        lat: body.location.lat,
        lng: body.location.lng,
        radiusMeters,
        maxResults: maxProviders * 2, // fetch extra so we can filter out busy ones
        ttlSeconds: cacheTtl,
      });

      console.log(`[places] ${profession}: found ${found.length} providers`);
      for (const p of found) {
        if (seenPlaceIds.has(p.placeId)) continue;
        if (p.phone && busyPhones.has(p.phone)) {
          console.log(`[skip] ${p.name} is busy with another job`);
          continue;
        }
        seenPlaceIds.add(p.placeId);
        allProviders.push(p);
      }
    } catch (err) {
      console.error(`Places search failed for ${profession}:`, err);
    }
  }

  // Sort by rating descending (best first) for wave tiering
  allProviders.sort((a, b) => (b.rating ?? 3.0) - (a.rating ?? 3.0));

  // Wave 1: only send to top providers initially (full list in test mode: just 1)
  const waveProviders = isTestMode
    ? allProviders.slice(0, 1)
    : getProvidersForWave(allProviders, 1);

  if (waveProviders.length === 0) {
    return jsonResponse({ sentCount: 0, providersFound: 0, providers: [], dryRun: isDryRun }, 200, request);
  }

  const providers = waveProviders;

  // Built per-provider below so we can personalize the form URL with their phone.
  const messagePrefix = urgencyConfig.tonePrefix;

  // =================================================================
  // TEST MODE: send one WhatsApp to TEST_PHONE_OVERRIDE impersonating
  // the first provider. Record the KV mapping under the test phone so
  // replies are routed back to this provider/request. Skip the normal
  // loop entirely — this is a solo testing shortcut, not a real broadcast.
  // =================================================================
  if (isTestMode) {
    const first = providers[0];
    console.log(`[test-mode] impersonating ${first.name} → sending to ${testPhone}`);

    // Mark the mapping under the test phone so inbound webhook routes
    // the reply back to this request + this provider.
    await recordProviderContact(env.PLACES_CACHE, testPhone, {
      requestId: body.requestId,
      providerName: first.name,
      providerPhone: first.phone || testPhone,
    });

    // Store refCode mapping for precise reply routing
    const testRefCode = body.requestId.slice(0, 6).toUpperCase();
    await recordProviderContact(env.PLACES_CACHE, `ref:${testRefCode}`, {
      requestId: body.requestId,
      providerName: 'refCode-lookup',
      providerPhone: 'refCode-lookup',
    });

    const testMessage = messagePrefix + buildProviderMessage(body, env, testPhone);
    const testBody =
      `🧪 *מצב בדיקה*\n` +
      `אתה מדמה את: *${first.name}*\n` +
      `━━━━━━━━━━━━━━\n\n` +
      testMessage;

    const result = await sendProviderIntro({
      env,
      to: testPhone,
      plainTextBody: testBody,
      mediaUrls: body.mediaUrls?.slice(0, 10),
      city: extractCity(body.location.address),
      requestId: body.requestId,
      providerPhone: testPhone,
      shortSummary: body.shortSummary || 'בקשת שירות',
    });

    // Denormalize broadcast result so the app shows "1 provider contacted"
    try {
      await firestore.updateRequestBroadcast({
        requestId: body.requestId,
        providers: [{ name: first.name, phone: testPhone, sent: result.success }],
      });
    } catch (err) {
      console.error('Save broadcast result failed:', err);
    }

    return jsonResponse({
      sentCount: result.success ? 1 : 0,
      providersFound: providers.length,
      providers: [
        {
          name: first.name,
          phone: testPhone,
          sent: result.success,
          reason: result.success ? 'test-mode' : result.error,
        },
      ],
      dryRun: false,
      testMode: true,
    }, 200, request);
  }

  let sentCount = 0;
  const results: Array<{ name: string; phone: string; sent: boolean; reason?: string }> = [];

  for (const provider of providers) {
    if (!provider.phone) {
      results.push({ name: provider.name, phone: '', sent: false, reason: 'no phone' });
      continue;
    }

    // Record phone → requestId so future webhooks can route
    await recordProviderContact(env.PLACES_CACHE, provider.phone, {
      requestId: body.requestId,
      providerName: provider.name,
      providerPhone: provider.phone,
    });

    // Store refCode mapping for precise reply routing
    const providerRefCode = body.requestId.slice(0, 6).toUpperCase();
    await recordProviderContact(env.PLACES_CACHE, `ref:${providerRefCode}`, {
      requestId: body.requestId,
      providerName: 'refCode-lookup',
      providerPhone: 'refCode-lookup',
    });

    if (isDryRun) {
      console.log(`[DRY RUN] demo bid for ${provider.name}`);
      try {
        await firestore.createBid({
          requestId: body.requestId,
          bidId: crypto.randomUUID(),
          data: {
            providerName: provider.name,
            displayName: shortenProviderName(provider.name),
            providerPhone: provider.phone,
            price: simulatePrice(),
            availability: simulateAvailability(),
            rating: provider.rating,
            address: provider.address,
            rawReply: '[DEMO - simulated, not from real WhatsApp reply]',
            receivedAt: new Date().toISOString(),
            isReal: false,
            source: 'google_places_demo',
          },
        });
        results.push({ name: provider.name, phone: provider.phone, sent: false, reason: 'demo bid' });
      } catch (err) {
        console.error(`Demo bid failed for ${provider.name}:`, err);
        results.push({
          name: provider.name,
          phone: provider.phone,
          sent: false,
          reason: 'demo bid failed',
        });
      }
      continue;
    }

    // Real mode: send WhatsApp with personalized form URLs for THIS provider.
    const message = messagePrefix + buildProviderMessage(body, env, provider.phone);
    const result = await sendProviderIntro({
      env,
      to: provider.phone,
      plainTextBody: message,
      mediaUrls: body.mediaUrls?.slice(0, 10),
      city: extractCity(body.location.address),
      requestId: body.requestId,
      providerPhone: provider.phone,
      shortSummary: body.shortSummary || 'בקשת שירות',
    });

    if (result.success) {
      sentCount++;
      results.push({ name: provider.name, phone: provider.phone, sent: true });
    } else {
      console.warn(`Failed to WhatsApp ${provider.name}:`, result.error);
      results.push({ name: provider.name, phone: provider.phone, sent: false, reason: result.error });
    }
  }

  // Save broadcast result to the request doc
  try {
    await firestore.updateRequestBroadcast({
      requestId: body.requestId,
      providers: results.map((r) => ({ name: r.name, phone: r.phone, sent: r.sent })),
    });
  } catch (err) {
    console.error('Save broadcast result failed:', err);
  }

  // Schedule next wave if there are more providers to contact
  if (!isTestMode && allProviders.length > waveProviders.length) {
    try {
      await firestore.updateRequestWave({
        requestId: body.requestId,
        wave: 1,
        nextWaveAt: getNextWaveTime(1),
      });
    } catch (err) {
      console.error('Failed to schedule next wave:', err);
    }
  }

  // Push notification to customer (if we sent demo bids, they'll see them now)
  if (isDryRun && results.some((r) => r.reason === 'demo bid')) {
    await pushToCustomer({
      env,
      requestId: body.requestId,
      type: 'new_bid',
      title: 'יש הצעות חדשות!',
      body: `${providers.length} בעלי מקצוע באזור שלך שלחו הצעות`,
    });
  }

  return jsonResponse({
    sentCount,
    providersFound: providers.length,
    providers: results,
    dryRun: isDryRun,
  }, 200, request);
}

// =========================================================================
// /provider/selected
// =========================================================================

interface ProviderSelectedBody {
  requestId: string;
  providerPhone: string;
  providerName: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
}

async function handleProviderSelected(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const body = (await request.json()) as ProviderSelectedBody;
  if (!body.requestId || !body.providerPhone) {
    return jsonResponse({ error: 'Missing required fields' }, 400, request);
  }
  // Truncate to prevent abuse
  body.providerName = (body.providerName || '').slice(0, 200);
  body.customerName = body.customerName?.slice(0, 200);
  body.customerAddress = body.customerAddress?.slice(0, 500);

  // Test mode overrides DRY_RUN. In test mode we send a real WhatsApp to
  // the tester's own phone and treat it as if it were the provider.
  const testPhone = (env.TEST_PHONE_OVERRIDE || '').trim();
  const isTestMode = testPhone.length > 0;
  const isDryRun = !isTestMode && (env.DRY_RUN || 'false').toLowerCase() === 'true';

  console.log(
    `[selected] ${body.providerName} for request ${body.requestId} ` +
      `(dryRun=${isDryRun}, testMode=${isTestMode})`
  );

  // The phone we actually talk to. In test mode, always the tester's phone
  // so inbound webhook routing matches (KV entry keyed by TEST_PHONE too).
  const destinationPhone = isTestMode ? testPhone : body.providerPhone;

  await recordProviderContact(env.PLACES_CACHE, destinationPhone, {
    requestId: body.requestId,
    providerName: body.providerName,
    providerPhone: destinationPhone,
  });

  const text = buildSelectionMessage(body);

  if (isDryRun) {
    console.log(`[DRY RUN] would WhatsApp ${body.providerName}:\n${text}`);

    // Schedule the simulation in the background so we can return immediately.
    // ctx.waitUntil keeps the worker alive until the promise resolves.
    ctx.waitUntil(simulateProviderApproval(env, body));

    return jsonResponse({ ok: true, dryRun: true, simulating: true }, 200, request);
  }

  // Real mode or test mode: send via Twilio. In test mode, wrap the body
  // with a clear "test mode" header so the tester knows who they're
  // impersonating and that this is a test flow.
  const outboundBody = isTestMode
    ? `🧪 *מצב בדיקה — אתה מדמה את ${body.providerName}*\n` +
      `ענה כאילו אתה בעל המקצוע (מחיר / זמינות / הודעות צ'אט).\n` +
      `━━━━━━━━━━━━━━\n\n` +
      text
    : text;

  const result = await sendWhatsAppMessage({
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    from: env.TWILIO_WHATSAPP_FROM,
    to: destinationPhone,
    body: outboundBody,
  });

  return jsonResponse({ ok: result.success, error: result.error, testMode: isTestMode }, 200, request);
}

// =========================================================================
// /chat/send
// =========================================================================

interface ChatSendBody {
  requestId: string;
  providerPhone: string;
  text: string;
}

async function handleChatSend(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const body = (await request.json()) as ChatSendBody;
  if (!body.requestId || !body.providerPhone || !body.text) {
    return jsonResponse({ error: 'Missing required fields' }, 400, request);
  }
  // Truncate to prevent abuse
  body.text = body.text.slice(0, 2000);

  // Guard: refuse to forward any message if the request is closed.
  // A closed request is immutable — the customer or a stale client must
  // not be able to keep reaching the provider after the customer closed.
  const firestore = new FirestoreClient(
    env.FIREBASE_PROJECT_ID,
    env.FIREBASE_SERVICE_ACCOUNT_JSON
  );
  const requestDoc = await firestore.getRequest(body.requestId).catch(() => null);
  if (requestDoc && requestDoc.status === 'closed') {
    return jsonResponse(
      { ok: false, error: 'request_closed', message: 'Request is closed; chat forwarding blocked.' },
      409,
      request
    );
  }

  const testPhone = (env.TEST_PHONE_OVERRIDE || '').trim();
  const isTestMode = testPhone.length > 0;
  const isDryRun = !isTestMode && (env.DRY_RUN || 'false').toLowerCase() === 'true';

  // In test mode we always forward to the tester's phone — ignores the
  // (possibly stale) providerPhone from the bid. This lets the stuck-state
  // recover without the user having to cancel and re-pick.
  const destinationPhone = isTestMode ? testPhone : body.providerPhone;

  // Refresh the KV mapping. Preserve the existing providerName rather than
  // overwriting with a hardcoded 'Provider' string (which the old code did).
  const existing = await lookupProviderContact(env.PLACES_CACHE, destinationPhone);
  await recordProviderContact(env.PLACES_CACHE, destinationPhone, {
    requestId: body.requestId,
    providerName: existing?.providerName || 'בעל מקצוע',
    providerPhone: destinationPhone,
  });

  if (isDryRun) {
    console.log(`[DRY RUN] would forward chat to ${body.providerPhone}: ${body.text}`);

    // Background simulation via waitUntil
    ctx.waitUntil(simulateChatReply(env, body));

    return jsonResponse({ ok: true, dryRun: true, simulating: true }, 200, request);
  }

  // Real mode or test mode: forward the message via WhatsApp
  const outboundBody = isTestMode
    ? `🧪 *[בדיקה] הלקוח כותב:*\n${body.text}\n\n_ענה כאילו אתה בעל המקצוע_`
    : `💬 ${body.text}\n\n_- מהלקוח דרך ai-fixly_`;

  const result = await sendWhatsAppMessage({
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    from: env.TWILIO_WHATSAPP_FROM,
    to: destinationPhone,
    body: outboundBody,
  });

  return jsonResponse({ ok: result.success, error: result.error, testMode: isTestMode }, 200, request);
}

// =========================================================================
// Dry-run simulations
// =========================================================================

async function simulateProviderApproval(
  env: Env,
  body: ProviderSelectedBody
): Promise<void> {
  try {
    const firestore = new FirestoreClient(
      env.FIREBASE_PROJECT_ID,
      env.FIREBASE_SERVICE_ACCOUNT_JSON
    );

    // Wait ~20s to simulate a realistic provider response time.
    // This lets the user test backgrounding the app and receiving a real
    // push notification (not just a foreground toast).
    await new Promise((resolve) => setTimeout(resolve, 20000));

    await firestore.addChatMessage({
      requestId: body.requestId,
      senderId: 'system',
      senderType: 'system',
      text: `${body.providerName} אישר את העבודה ומוכן להתחיל`,
    });

    await firestore.addChatMessage({
      requestId: body.requestId,
      senderId: body.providerPhone,
      senderType: 'provider',
      text: `שלום! אני ${body.providerName}. קיבלתי את הפרטים. אם יש שאלות - כתוב לי כאן.`,
    });

    await pushToCustomer({
      env,
      requestId: body.requestId,
      type: 'selection',
      title: `${body.providerName} אישר את העבודה`,
      body: 'שלח הודעה דרך הצ\'אט או התקשר ישירות',
    });
  } catch (err) {
    console.error('[simulateProviderApproval] failed', err);
  }
}

async function simulateChatReply(env: Env, body: ChatSendBody): Promise<void> {
  try {
    const firestore = new FirestoreClient(
      env.FIREBASE_PROJECT_ID,
      env.FIREBASE_SERVICE_ACCOUNT_JSON
    );

    const reqDoc = await firestore.getRequest(body.requestId);
    const providerName = reqDoc?.selectedProviderName || 'בעל מקצוע';

    // Wait ~15s so the user has time to background the app before the
    // simulated reply arrives, giving them a chance to see a system notification.
    await new Promise((resolve) => setTimeout(resolve, 15000));

    const reply = simulateProviderReply(body.text);
    await firestore.addChatMessage({
      requestId: body.requestId,
      senderId: body.providerPhone,
      senderType: 'provider',
      text: reply,
    });

    await pushToCustomer({
      env,
      requestId: body.requestId,
      type: 'chat',
      title: `הודעה חדשה מ-${providerName}`,
      body: reply.slice(0, 80),
    });
  } catch (err) {
    console.error('[simulateChatReply] failed', err);
  }
}

// Simple heuristic replies for the chat simulation in dry-run mode
function simulateProviderReply(customerText: string): string {
  const lower = customerText.toLowerCase();
  if (lower.includes('מתי') || lower.includes('שעה') || lower.includes('זמן')) {
    return 'אגיע בין 10:00-12:00 כפי שסיכמנו. אם יש שינוי אעדכן.';
  }
  if (lower.includes('כמה') || lower.includes('מחיר') || lower.includes('עלות')) {
    return 'המחיר שנקבתי כולל הכל. אם יצוץ משהו נוסף נסכם.';
  }
  if (lower.includes('איפה') || lower.includes('כתובת') || lower.includes('חנ')) {
    return 'אשלח הודעה כשאני בדרך. אין צורך בחניה מיוחדת.';
  }
  if (lower.includes('תודה') || lower.includes('מעולה')) {
    return 'בכיף! מחכה לעבודה.';
  }
  return 'קיבלתי, אני על זה. אעדכן בקרוב.';
}

// =========================================================================
// /webhook/twilio
// =========================================================================

async function handleTwilioWebhook(request: Request, env: Env): Promise<Response> {
  const formData = await request.formData();
  const from = formData.get('From')?.toString() || '';
  const body = formData.get('Body')?.toString() || '';
  const profileName = formData.get('ProfileName')?.toString() || 'בעל מקצוע';

  console.log('[webhook]', { from, body: body.slice(0, 80), profileName });

  if (!body) {
    return twimlResponse('');
  }

  // Try to extract a reference code from the reply.
  // The outbound message includes "📋 מספר בקשה: #A1B2C3" — if the provider
  // includes #XXXXXX in their reply, we can use it to route precisely even
  // if the KV mapping was overwritten by a newer request.
  const refCodeMatch = body.match(/#([A-Za-z0-9]{4,8})/);
  const refCode = refCodeMatch ? refCodeMatch[1].toUpperCase() : null;

  if (refCode) {
    console.log(`[webhook] extracted refCode: #${refCode}`);
  }

  // Look up which request this provider is tied to
  const providerPhone = from.replace(/^whatsapp:/, '');
  let entry = await lookupProviderContact(env.PLACES_CACHE, providerPhone);

  // If we have a refCode, verify it matches the KV entry.
  // If not, the KV was overwritten by a newer request — use the refCode to find the right one.
  if (entry && refCode && !entry.requestId.toUpperCase().startsWith(refCode)) {
    console.log(`[webhook] refCode #${refCode} doesn't match KV entry ${entry.requestId.slice(0, 6)} — trying refCode lookup`);

    const refEntry = await lookupProviderContact(env.PLACES_CACHE, `ref:${refCode}`);
    if (refEntry) {
      console.log(`[webhook] found request via refCode: ${refEntry.requestId}`);
      entry = refEntry;
    }
  }

  if (!entry) {
    console.warn(`[webhook] no active request for ${providerPhone}`);
    return twimlResponse(
      'לא מצאנו בקשה פעילה שמשויכת למספר שלך. תודה שחזרת אלינו!'
    );
  }

  const firestore = new FirestoreClient(env.FIREBASE_PROJECT_ID, env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const requestDoc = await firestore.getRequest(entry.requestId);

  if (!requestDoc) {
    console.warn(`[webhook] request ${entry.requestId} not found`);
    return twimlResponse('הבקשה שקיבלת אינה זמינה יותר. תודה!');
  }

  // Chat mode detection. Normal rule: request is in_progress AND the stored
  // selectedProviderPhone matches the incoming From. In test mode we relax
  // the phone-match requirement — any reply from the test phone for an
  // in-progress request is treated as chat. This recovers correctly even
  // if the selected bid had stale provider phone data from earlier tests.
  const testPhone = (env.TEST_PHONE_OVERRIDE || '').trim();
  const isTestMode = testPhone.length > 0;

  const isThisProviderSelected =
    requestDoc.status === 'in_progress' &&
    (
      requestDoc.selectedProviderPhone === providerPhone ||
      (isTestMode && providerPhone === testPhone)
    );

  if (isThisProviderSelected) {
    // CHAT MODE: write the reply as a chat message, not a bid
    console.log(`[webhook] chat message for ${entry.requestId}`);
    try {
      await firestore.addChatMessage({
        requestId: entry.requestId,
        senderId: providerPhone,
        senderType: 'provider',
        text: body,
      });
      await pushToCustomer({
        env,
        requestId: entry.requestId,
        type: 'chat',
        title: `הודעה חדשה מ-${entry.providerName}`,
        body: body.slice(0, 100),
      });
    } catch (err) {
      console.error('Failed to save chat message:', err);
    }
    return twimlResponse('');
  }

  if (requestDoc.status !== 'open' && requestDoc.status !== 'paused') {
    // Request is closed or cancelled
    return twimlResponse('הבקשה סגורה. תודה שחזרת אלינו!');
  }

  // BID MODE: parse the reply with Gemini
  const parsed = await parseProviderReply({
    apiKey: env.GEMINI_API_KEY,
    replyText: body,
  });

  if (!parsed.interested) {
    return twimlResponse('תודה שעדכנת אותנו. בהצלחה!');
  }

  try {
    await firestore.createBid({
      requestId: entry.requestId,
      bidId: crypto.randomUUID(),
      data: {
        providerName: entry.providerName,
        displayName: shortenProviderName(entry.providerName),
        providerPhone,
        price: parsed.price,
        availability: parsed.availability,
        availabilityStartAt: parsed.availabilityStartAt,
        rawReply: parsed.rawText,
        receivedAt: new Date().toISOString(),
        isReal: true,
        source: 'whatsapp',
      },
    });

    await pushToCustomer({
      env,
      requestId: entry.requestId,
      type: 'new_bid',
      title: `הצעה חדשה מ-${entry.providerName}`,
      body: parsed.price ? `${parsed.price} ש"ח - ${parsed.availability || ''}` : body.slice(0, 100),
    });
  } catch (err) {
    console.error('Failed to save bid:', err);
  }

  return twimlResponse('תודה! התגובה שלך נרשמה והלקוח יקבל אותה מייד.');
}

// =========================================================================
// /feedback/critical
// =========================================================================

async function handleCriticalFeedback(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as { text: string; screen: string; error: string };
  if (!body.text || typeof body.text !== 'string') {
    return jsonResponse({ error: 'Missing text' }, 400, request);
  }
  // Truncate to prevent abuse
  const text = body.text.slice(0, 500);
  const screen = (body.screen || 'unknown').slice(0, 100);
  const error = (body.error || '').slice(0, 500);

  const ownerPhone = '+972546651088';
  const message = [
    '\uD83D\uDEA8 *\u05D3\u05D9\u05D5\u05D5\u05D7 \u05E7\u05E8\u05D9\u05D8\u05D9 \u05DE\u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4*',
    '',
    `\uD83D\uDCF1 \u05DE\u05E1\u05DA: ${screen}`,
    error ? `\u274C \u05E9\u05D2\u05D9\u05D0\u05D4: ${error}` : '',
    `\uD83D\uDCAC ${text}`,
  ].filter(Boolean).join('\n');

  const isDryRun = (env.DRY_RUN || 'false').toLowerCase() === 'true';
  const testPhone = (env.TEST_PHONE_OVERRIDE || '').trim();

  if (!isDryRun || testPhone) {
    await sendWhatsAppMessage({
      accountSid: env.TWILIO_ACCOUNT_SID,
      authToken: env.TWILIO_AUTH_TOKEN,
      from: env.TWILIO_WHATSAPP_FROM,
      to: testPhone || ownerPhone,
      body: message,
    });
  } else {
    console.log('[feedback] critical alert (dry run):', message);
  }

  return jsonResponse({ ok: true }, 200, request);
}

// =========================================================================
// Cron handlers
// =========================================================================

async function handleReviewReminders(firestore: FirestoreClient, env: Env): Promise<void> {
  const requests = await firestore.getRequestsForReviewReminder();
  console.log(`[cron] ${requests.length} requests need review reminders`);

  for (const req of requests) {
    try {
      await pushToCustomer({
        env,
        requestId: req.id,
        type: 'selection',
        title: 'איך היה השירות?',
        body: `דרג את ${req.selectedProviderName || 'בעל המקצוע'} — עוזר ללקוחות הבאים`,
      });

      await firestore.markReviewReminderSent(req.id);
      console.log(`[cron] review reminder sent for ${req.id}`);
    } catch (err) {
      console.error(`[cron] review reminder failed for ${req.id}:`, err);
    }
  }
}

async function handlePendingWaves(firestore: FirestoreClient, env: Env): Promise<void> {
  // For now, log that this would run. The full implementation requires:
  // 1. Querying requests with nextWaveAt < now
  // 2. For each: count bids, decide if wave 2 or 3 is needed
  // 3. Re-run the Google Places search for the same professions
  // 4. Send to the next batch of providers
  //
  // This is complex because we need to store the full sorted provider list
  // from wave 1 to know who to send to in waves 2/3. For MVP, we'll skip
  // the cron-based approach and instead check on each new bid whether
  // enough bids have been received (reactive, not proactive).
  //
  // TODO: Implement full wave cron when provider volume justifies it.
  console.log('[cron] wave check: skipping (MVP — reactive approach)');
}

async function handleAlertChecks(firestore: FirestoreClient, env: Env): Promise<void> {
  const alerts: Array<{
    type: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
    metadata: Record<string, any>;
  }> = [];

  // Check 1: Requests open >4 hours with 0 bids
  try {
    const staleRequests = await firestore.getStaleRequestsWithNoBids(4);
    for (const req of staleRequests) {
      alerts.push({
        type: 'no_bids',
        severity: 'critical',
        message: `בקשה ללא הצעות כבר ${req.hoursOpen} שעות (${req.profession || 'לא ידוע'})`,
        metadata: { requestId: req.id, userId: req.userId },
      });
    }
  } catch (err) {
    console.error('[alerts] stale requests check failed:', err);
  }

  // Save alerts to Firestore and mark requests to prevent duplicate alerts
  for (const alert of alerts) {
    try {
      await firestore.createAdminAlert(alert);
      if (alert.type === 'no_bids' && alert.metadata.requestId) {
        await firestore.markAlertSentNoBids(alert.metadata.requestId);
      }
    } catch (err) {
      console.error('[alerts] failed to create alert:', err);
    }
  }

  // Send WhatsApp for critical/warning alerts
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning');
  if (criticalAlerts.length > 0) {
    const ownerPhone = '+972546651088';
    const testPhone = (env.TEST_PHONE_OVERRIDE || '').trim();
    const isTestMode = testPhone.length > 0;

    const message = [
      `🚨 *${criticalAlerts.length} התראות חדשות*`,
      '',
      ...criticalAlerts.map(a => {
        const icon = a.severity === 'critical' ? '🔴' : '🟡';
        return `${icon} ${a.message}`;
      }),
    ].join('\n');

    if (!isTestMode) {
      await sendWhatsAppMessage({
        accountSid: env.TWILIO_ACCOUNT_SID,
        authToken: env.TWILIO_AUTH_TOKEN,
        from: env.TWILIO_WHATSAPP_FROM,
        to: ownerPhone,
        body: message,
      }).catch(err => console.error('[alerts] WhatsApp failed:', err));
    } else {
      console.log(`[alerts] would WhatsApp owner: ${message}`);
    }
  }

  console.log(`[cron] ${alerts.length} alerts created`);
}

// =========================================================================
// Helpers
// =========================================================================

/**
 * Push notification type. The app uses this to decide where to navigate
 * when the user taps the notification.
 *   - 'new_bid'    → open the request details screen (see offers)
 *   - 'chat'       → open the chat screen for that request
 *   - 'selection'  → open the request details screen (provider confirmed)
 */
type PushType = 'new_bid' | 'chat' | 'selection';

async function pushToCustomer(params: {
  env: Env;
  requestId: string;
  type: PushType;
  title: string;
  body: string;
}): Promise<void> {
  try {
    const firestore = new FirestoreClient(
      params.env.FIREBASE_PROJECT_ID,
      params.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );
    const requestDoc = await firestore.getRequest(params.requestId);
    if (!requestDoc?.userId) return;

    const fcmToken = await firestore.getUserFcmToken(requestDoc.userId);
    if (!fcmToken) return;

    // For bid pushes, collapse every arriving-offer notification into ONE
    // tray entry that updates its title/body as more bids arrive. Without
    // this the user sees a stack of "new offer from X" pushes that scroll
    // off the top of the tray.
    let title = params.title;
    let body = params.body;
    let badge: number | undefined;
    // Stable per-request tag. Android replaces same-tag entries; iOS groups
    // them under a single thread.
    const tag = `req:${params.requestId}:${params.type}`;

    if (params.type === 'new_bid') {
      const bidCount = await firestore.countBidsForRequest(params.requestId);
      if (bidCount >= 2) {
        title = `יש לך ${bidCount} הצעות חדשות`;
        body = `פתח את הבקשה כדי לבחור`;
      }
      // else: first bid → keep the original "New offer from X" title.
      badge = bidCount;
    }

    await sendPush({
      serviceAccountJson: params.env.FIREBASE_SERVICE_ACCOUNT_JSON,
      token: fcmToken,
      title,
      body,
      tag,
      badge,
      data: {
        requestId: params.requestId,
        type: params.type,
      },
      // Use the request's first photo as the notification hero image so
      // the user sees a visual reminder of what the push is about.
      imageUrl: requestDoc.heroImageUrl,
    });
  } catch (err) {
    console.error('pushToCustomer failed:', err);
  }
}

// =========================================================================
// Public provider-form endpoints
// =========================================================================

/**
 * GET /provider/request/:requestId
 * Returns the privacy-stripped public view a service provider needs to
 * decide whether to quote (city + description + media). Never exposes
 * the customer identity or precise address.
 */
async function handlePublicRequestSummary(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const requestId = url.pathname.split('/').pop() || '';
  if (!requestId) {
    return jsonResponse({ error: 'Missing requestId' }, 400, request);
  }
  const firestore = new FirestoreClient(env.FIREBASE_PROJECT_ID, env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const view = await firestore.getPublicRequestView(requestId);
  if (!view) {
    return jsonResponse({ error: 'Not found or closed' }, 404, request);
  }
  return jsonResponse(view, 200, request);
}

interface ProviderQuoteBody {
  requestId: string;
  providerPhone: string;
  providerName?: string;
  price: string;            // arrives as numeric string from the form
  isVisitFee: boolean;
  availabilityStartAt: string;
  availabilityText: string;
  notes?: string;
}

/**
 * POST /provider/bid
 * Accepts a quote submission from the public web form and writes a bid
 * to Firestore (same schema as bids parsed from WhatsApp replies).
 */
async function handleProviderQuoteSubmission(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as ProviderQuoteBody;
  if (!body.requestId || !body.providerPhone || !body.price || !body.availabilityStartAt) {
    return jsonResponse({ error: 'Missing required fields' }, 400, request);
  }

  const firestore = new FirestoreClient(env.FIREBASE_PROJECT_ID, env.FIREBASE_SERVICE_ACCOUNT_JSON);
  // Reject quotes for closed requests so providers can't keep bidding
  // after the customer abandoned the request.
  const view = await firestore.getPublicRequestView(body.requestId);
  if (!view) {
    return jsonResponse({ error: 'Request not available' }, 410, request);
  }

  const priceInt = parseInt(body.price.replace(/[^0-9]/g, ''), 10);
  const price = isNaN(priceInt) ? null : priceInt;

  const availabilityText = body.isVisitFee
    ? `${body.availabilityText} • מחיר ביקור (יתכנו עלויות נוספות)`
    : body.availabilityText;

  // Never use the phone number as a display/provider name — the customer
  // browses bids anonymously until they pick one, and leaking the phone in
  // the card would reveal the provider's identity ahead of selection.
  const providerNameClean = body.providerName?.trim() || '';
  const anonymousName = 'בעל מקצוע';

  // Reject a second quote from the same provider on the same request.
  // Providers sometimes tap the WhatsApp link twice or refresh the form —
  // each submission would previously create a duplicate bid in the customer
  // view.
  if (await firestore.providerAlreadyBidOnRequest(body.requestId, body.providerPhone)) {
    return jsonResponse({ error: 'already_submitted', code: 'ALREADY_SUBMITTED' }, 409, request);
  }

  await firestore.createBid({
    requestId: body.requestId,
    bidId: crypto.randomUUID(),
    data: {
      providerName: providerNameClean || anonymousName,
      displayName: providerNameClean || anonymousName,
      providerPhone: body.providerPhone,
      price,
      availability: availabilityText,
      availabilityStartAt: body.availabilityStartAt,
      rating: null,
      rawReply: `[web-form] ${body.notes || ''}`.slice(0, 500),
      receivedAt: new Date().toISOString(),
      isReal: true,
      source: 'whatsapp',
    },
  });

  return jsonResponse({ ok: true }, 200, request);
}

interface ProviderReportBody {
  requestId: string;
  providerPhone: string;
  reason: string;
}

/**
 * POST /provider/report
 * Records a "wrong fit" complaint from a provider. We log it for now
 * (no UI in v1 — admin reviews the Firestore collection manually).
 */
async function handleProviderReportSubmission(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as ProviderReportBody;
  if (!body.requestId || !body.providerPhone || !body.reason) {
    return jsonResponse({ error: 'Missing required fields' }, 400, request);
  }

  const firestore = new FirestoreClient(env.FIREBASE_PROJECT_ID, env.FIREBASE_SERVICE_ACCOUNT_JSON);
  await firestore.writeProviderReport({
    requestId: body.requestId,
    providerPhone: body.providerPhone,
    reason: body.reason.slice(0, 1000),
    receivedAt: new Date().toISOString(),
  });
  return jsonResponse({ ok: true }, 200, request);
}

/**
 * Base URL for the public provider forms (web). Defined as an env var so
 * preview/staging deployments can override it without changing code.
 */
function getProviderBaseUrl(env: any): string {
  return (env.PROVIDER_FORM_BASE_URL || 'https://ai-fixly-web.pages.dev').replace(/\/+$/, '');
}

/**
 * Send the "new service request" message to a provider.
 *
 * When TWILIO_CONTENT_SID_PROVIDER_INTRO is configured the message goes out
 * as a Twilio Content Template — the provider sees real WhatsApp CTA
 * buttons ("Send a quote" / "Report") instead of inline links. Without the
 * template configured we fall back to the plain-text message with the two
 * URLs, which keeps everything working while the template is still awaiting
 * Meta approval.
 */
async function sendProviderIntro(args: {
  env: Env;
  to: string;
  plainTextBody: string;
  mediaUrls?: string[];
  city: string;
  requestId: string;
  providerPhone: string;
  shortSummary: string;
}) {
  const { env, to, plainTextBody, mediaUrls, city, requestId, providerPhone, shortSummary } = args;
  const contentSid = (env.TWILIO_CONTENT_SID_PROVIDER_INTRO || '').trim();

  if (contentSid) {
    // WhatsApp CTA templates only accept ONE variable per button URL, and
    // it must be at the end. We work around that by packing the requestId
    // and the provider phone into a single token separated by a dot:
    //   "<requestId>.<phoneWithoutPlusSign>"
    // The quote/report web pages parse this token back into its two parts.
    const phoneToken = providerPhone.replace(/^\+/, '');
    const requestToken = `${requestId}.${phoneToken}`;
    return sendWhatsAppTemplate({
      accountSid: env.TWILIO_ACCOUNT_SID,
      authToken: env.TWILIO_AUTH_TOKEN,
      from: env.TWILIO_WHATSAPP_FROM,
      to,
      contentSid,
      contentVariables: {
        '1': `${city} • ${shortSummary}`,
        '2': requestToken,
      },
      mediaUrls,
    });
  }

  // Fallback: free-form text + inline links.
  return sendWhatsAppMessage({
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    from: env.TWILIO_WHATSAPP_FROM,
    to,
    body: plainTextBody,
    mediaUrls,
  });
}

function buildProviderMessage(body: BroadcastBody, env?: any, providerPhone?: string): string {
  const city = extractCity(body.location.address);
  const refCode = body.requestId.slice(0, 6).toUpperCase();

  // Personalize the URLs so the form can pre-fill the provider's phone.
  // Without it, the form would force the provider to type their own number.
  const baseUrl = env ? getProviderBaseUrl(env) : 'https://ai-fixly-web.pages.dev';
  const phoneParam = providerPhone ? `?phone=${encodeURIComponent(providerPhone)}` : '';
  const quoteUrl = `${baseUrl}/provider/quote/${body.requestId}${phoneParam}`;
  const reportUrl = `${baseUrl}/provider/report/${body.requestId}${phoneParam}`;

  return [
    `🔧 *ai-fixly* - בקשת שירות חדשה`,
    ``,
    `📍 אזור: ${city}`,
    ``,
    `📝 תיאור הלקוח:`,
    body.shortSummary || 'בקשת שירות',
    ``,
    body.mediaUrls && body.mediaUrls.length > 0
      ? `📷 צורפו ${body.mediaUrls.length} תמונות / סרטונים`
      : '',
    ``,
    `🟢 הצעת מחיר:`,
    quoteUrl,
    ``,
    `🔴 דווח על בעיה בקריאה:`,
    reportUrl,
    ``,
    `📋 מספר קריאה: #${refCode}`,
    `_פרטי הלקוח (שם, טלפון, כתובת מדויקת) יישלחו אליך רק אם תיבחר._`,
  ]
    .filter((line) => line !== '')
    .join('\n');
}

function buildSelectionMessage(body: ProviderSelectedBody): string {
  const lines = [
    `🎉 *מזל טוב!*`,
    ``,
    `הלקוח בחר בך לעבודה הבאה.`,
    ``,
    `מעכשיו, כל הודעה שתשלח לכאן תועבר ללקוח דרך האפליקציה.`,
    `כל הודעה שהלקוח ישלח לך תגיע לכאן.`,
    ``,
  ];

  if (body.customerName) {
    lines.push(`👤 שם: ${body.customerName}`);
  }
  if (body.customerPhone) {
    lines.push(`📞 טלפון: ${body.customerPhone}`);
  }
  if (body.customerAddress) {
    lines.push(`📍 כתובת: ${body.customerAddress}`);
  }
  lines.push(``, `בהצלחה!`);

  return lines.join('\n');
}

function extractCity(address: string | undefined): string {
  if (!address) return 'לא צוין';
  const parts = address.split(',').map((p) => p.trim());
  const candidate = parts.length >= 2
    ? parts[parts.length - 2] || parts[parts.length - 1] || address
    : address;
  return normaliseCityName(candidate);
}

const SIM_AVAILABILITY = [
  'היום אחה"צ',
  'מחר בבוקר',
  'מחר בין 10:00-14:00',
  'יום ראשון בבוקר',
  'תוך 2 שעות',
  'מחר בערב',
];

function simulatePrice(): number {
  const raw = 150 + Math.floor(Math.random() * 550);
  return Math.round(raw / 50) * 50;
}

function simulateAvailability(): string {
  return SIM_AVAILABILITY[Math.floor(Math.random() * SIM_AVAILABILITY.length)];
}

function jsonResponse(data: unknown, status: number = 200, request?: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
  });
}

function twimlResponse(message: string): Response {
  const xml = message
    ? `<Response><Message>${escapeXml(message)}</Message></Response>`
    : '<Response></Response>';
  return new Response(xml, { headers: { 'Content-Type': 'text/xml' } });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function corsHeaders(request?: Request): Record<string, string> {
  const allowedOrigins = [
    'https://master.ai-fixly-web.pages.dev',
    'https://ai-fixly-web.pages.dev',
    'http://localhost:8081',  // dev
    'http://localhost:19006', // Expo web dev
  ];

  const origin = request?.headers?.get('Origin') || '';
  const allowed = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<boolean> {
  const rlKey = `rl:${key}`;
  const current = parseInt(await kv.get(rlKey) || '0', 10);
  if (current >= maxRequests) return false;
  await kv.put(rlKey, String(current + 1), { expirationTtl: windowSeconds });
  return true;
}
