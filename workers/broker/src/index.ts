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
import { sendWhatsAppMessage } from './twilio';
import { parseProviderReply } from './geminiParser';
import { FirestoreClient } from './firestore';
import { sendPush } from './fcm';
import { recordProviderContact, lookupProviderContact } from './phoneMap';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      if (url.pathname === '/health') {
        return jsonResponse({ status: 'ok', time: new Date().toISOString() });
      }
      if (url.pathname === '/broadcast' && request.method === 'POST') {
        return await handleBroadcast(request, env);
      }
      if (url.pathname === '/provider/selected' && request.method === 'POST') {
        return await handleProviderSelected(request, env);
      }
      if (url.pathname === '/chat/send' && request.method === 'POST') {
        return await handleChatSend(request, env);
      }
      if (url.pathname === '/webhook/twilio' && request.method === 'POST') {
        return await handleTwilioWebhook(request, env);
      }
      return jsonResponse({ error: 'Not found' }, 404);
    } catch (err) {
      console.error('Worker error:', err);
      return jsonResponse(
        { error: 'Internal error', message: err instanceof Error ? err.message : 'Unknown' },
        500
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

async function handleBroadcast(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as BroadcastBody;
  if (!body.requestId || !body.professions || !body.location) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }

  const isDryRun = (env.DRY_RUN || 'false').toLowerCase() === 'true';
  const maxProviders = parseInt(env.MAX_PROVIDERS_PER_REQUEST || '5', 10);
  const radiusMeters = parseInt(env.SEARCH_RADIUS_METERS || '20000', 10);
  const cacheTtl = parseInt(env.PLACES_CACHE_TTL_SECONDS || '86400', 10);

  console.log(
    `[broadcast] requestId=${body.requestId} professions=${body.professions.join(',')} ` +
      `lat=${body.location.lat} lng=${body.location.lng} dryRun=${isDryRun}`
  );

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
        maxResults: maxProviders,
        ttlSeconds: cacheTtl,
      });

      console.log(`[places] ${profession}: found ${found.length} providers`);
      for (const p of found) {
        if (!seenPlaceIds.has(p.placeId)) {
          seenPlaceIds.add(p.placeId);
          allProviders.push(p);
        }
      }
    } catch (err) {
      console.error(`Places search failed for ${profession}:`, err);
    }
  }

  const providers = allProviders.slice(0, maxProviders);
  if (providers.length === 0) {
    return jsonResponse({ sentCount: 0, providersFound: 0, providers: [], dryRun: isDryRun });
  }

  const firestore = new FirestoreClient(env.FIREBASE_PROJECT_ID, env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const message = buildProviderMessage(body);
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

    if (isDryRun) {
      console.log(`[DRY RUN] demo bid for ${provider.name}`);
      try {
        await firestore.createBid({
          requestId: body.requestId,
          bidId: crypto.randomUUID(),
          data: {
            providerName: provider.name,
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

    // Real mode: send WhatsApp
    const result = await sendWhatsAppMessage({
      accountSid: env.TWILIO_ACCOUNT_SID,
      authToken: env.TWILIO_AUTH_TOKEN,
      from: env.TWILIO_WHATSAPP_FROM,
      to: provider.phone,
      body: message,
      mediaUrls: body.mediaUrls?.slice(0, 5),
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

  // Push notification to customer (if we sent demo bids, they'll see them now)
  if (isDryRun && results.some((r) => r.reason === 'demo bid')) {
    await pushToCustomer({
      env,
      requestId: body.requestId,
      title: 'יש הצעות חדשות!',
      body: `${providers.length} בעלי מקצוע באזור שלך שלחו הצעות`,
    });
  }

  return jsonResponse({
    sentCount,
    providersFound: providers.length,
    providers: results,
    dryRun: isDryRun,
  });
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

async function handleProviderSelected(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as ProviderSelectedBody;
  if (!body.requestId || !body.providerPhone) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }

  const isDryRun = (env.DRY_RUN || 'false').toLowerCase() === 'true';
  console.log(`[selected] ${body.providerName} for request ${body.requestId} (dryRun=${isDryRun})`);

  // Make sure the phone→requestId mapping is fresh (extends TTL)
  await recordProviderContact(env.PLACES_CACHE, body.providerPhone, {
    requestId: body.requestId,
    providerName: body.providerName,
    providerPhone: body.providerPhone,
  });

  const text = buildSelectionMessage(body);

  if (isDryRun) {
    console.log(`[DRY RUN] would WhatsApp ${body.providerName}:\n${text}`);

    // Simulation: pretend the provider approved and sent a chat message.
    // This lets the customer see the full middleman chat flow without
    // actually sending any WhatsApp messages.
    try {
      const firestore = new FirestoreClient(
        env.FIREBASE_PROJECT_ID,
        env.FIREBASE_SERVICE_ACCOUNT_JSON
      );

      // Wait 2s to simulate real-world delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // System message: "provider confirmed"
      await firestore.addChatMessage({
        requestId: body.requestId,
        senderId: 'system',
        senderType: 'system',
        text: `${body.providerName} אישר את העבודה ומוכן להתחיל`,
      });

      // Simulated provider greeting message
      await firestore.addChatMessage({
        requestId: body.requestId,
        senderId: body.providerPhone,
        senderType: 'provider',
        text: `שלום! אני ${body.providerName}. קיבלתי את הפרטים ואני מוכן להגיע בזמן שסיכמנו. אם יש שאלות - כתוב לי כאן.`,
      });

      // Push notification to customer
      await pushToCustomer({
        env,
        requestId: body.requestId,
        title: `${body.providerName} אישר את העבודה`,
        body: 'שלח הודעה דרך הצ\'אט או התקשר ישירות',
      });
    } catch (err) {
      console.error('Simulation failed:', err);
    }

    return jsonResponse({ ok: true, dryRun: true });
  }

  const result = await sendWhatsAppMessage({
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    from: env.TWILIO_WHATSAPP_FROM,
    to: body.providerPhone,
    body: text,
  });

  return jsonResponse({ ok: result.success, error: result.error });
}

// =========================================================================
// /chat/send
// =========================================================================

interface ChatSendBody {
  requestId: string;
  providerPhone: string;
  text: string;
}

async function handleChatSend(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as ChatSendBody;
  if (!body.requestId || !body.providerPhone || !body.text) {
    return jsonResponse({ error: 'Missing required fields' }, 400);
  }

  const isDryRun = (env.DRY_RUN || 'false').toLowerCase() === 'true';

  // Keep the mapping fresh
  await recordProviderContact(env.PLACES_CACHE, body.providerPhone, {
    requestId: body.requestId,
    providerName: 'Provider',
    providerPhone: body.providerPhone,
  });

  if (isDryRun) {
    console.log(`[DRY RUN] would forward chat to ${body.providerPhone}: ${body.text}`);

    // Simulation: pretend the provider replies after a short delay
    // so the customer sees both sides of the conversation working.
    try {
      const firestore = new FirestoreClient(
        env.FIREBASE_PROJECT_ID,
        env.FIREBASE_SERVICE_ACCOUNT_JSON
      );

      // Fetch request to get provider name
      const reqDoc = await firestore.getRequest(body.requestId);
      const providerName = reqDoc?.selectedProviderName || 'בעל מקצוע';

      // Wait 3s
      await new Promise((resolve) => setTimeout(resolve, 3000));

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
        title: `הודעה חדשה מ-${providerName}`,
        body: reply.slice(0, 80),
      });
    } catch (err) {
      console.error('Chat simulation failed:', err);
    }

    return jsonResponse({ ok: true, dryRun: true });
  }

  // Real mode: forward the message via WhatsApp
  const text = `💬 ${body.text}\n\n_- מהלקוח דרך ai-fixly_`;
  const result = await sendWhatsAppMessage({
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    from: env.TWILIO_WHATSAPP_FROM,
    to: body.providerPhone,
    body: text,
  });

  return jsonResponse({ ok: result.success, error: result.error });
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

  // Look up which request this provider is tied to
  const providerPhone = from.replace(/^whatsapp:/, '');
  const entry = await lookupProviderContact(env.PLACES_CACHE, providerPhone);

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

  const isThisProviderSelected =
    requestDoc.status === 'in_progress' &&
    requestDoc.selectedProviderPhone === providerPhone;

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
        providerPhone,
        price: parsed.price,
        availability: parsed.availability,
        rawReply: parsed.rawText,
        receivedAt: new Date().toISOString(),
        isReal: true,
        source: 'whatsapp',
      },
    });

    await pushToCustomer({
      env,
      requestId: entry.requestId,
      title: `הצעה חדשה מ-${entry.providerName}`,
      body: parsed.price ? `${parsed.price} ש"ח - ${parsed.availability || ''}` : body.slice(0, 100),
    });
  } catch (err) {
    console.error('Failed to save bid:', err);
  }

  return twimlResponse('תודה! התגובה שלך נרשמה והלקוח יקבל אותה מייד.');
}

// =========================================================================
// Helpers
// =========================================================================

async function pushToCustomer(params: {
  env: Env;
  requestId: string;
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

    await sendPush({
      serviceAccountJson: params.env.FIREBASE_SERVICE_ACCOUNT_JSON,
      token: fcmToken,
      title: params.title,
      body: params.body,
      data: { requestId: params.requestId },
    });
  } catch (err) {
    console.error('pushToCustomer failed:', err);
  }
}

function buildProviderMessage(body: BroadcastBody): string {
  const city = extractCity(body.location.address);
  const refCode = body.requestId.slice(0, 6).toUpperCase();

  return [
    `🔧 *ai-fixly* - בקשת שירות חדשה`,
    ``,
    `📍 אזור: ${city}`,
    ``,
    `📝 הבעיה:`,
    body.shortSummary || 'בקשת שירות',
    ``,
    body.mediaUrls && body.mediaUrls.length > 0
      ? `📷 צורף ${body.mediaUrls.length} תמונות (ראה למעלה)`
      : '',
    ``,
    `*מעוניין? אנא השב בהודעה הבאה עם:*`,
    `1️⃣ מחיר משוער`,
    `2️⃣ מתי תוכל להגיע (יום + שעה)`,
    ``,
    `📋 מספר בקשה: #${refCode}`,
    `_פרטי הלקוח יישלחו אליך לאחר שתיבחר_`,
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
  if (parts.length >= 2) {
    return parts[parts.length - 2] || parts[parts.length - 1] || address;
  }
  return address;
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

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
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

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
