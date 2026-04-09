/**
 * ai-fixly broker worker — Cloudflare Worker acting as the hub between the
 * mobile app and external services.
 *
 * Routes:
 *   POST /broadcast       — Called by the app when a new request is created.
 *                           Queries Google Places for providers matching the
 *                           professions, then sends each provider a WhatsApp
 *                           message via Twilio.
 *
 *   POST /webhook/twilio  — Called by Twilio when a provider replies. Parses
 *                           the reply with Gemini, extracts price/availability,
 *                           and writes a bid document to Firestore.
 *
 *   GET  /health          — Health check.
 */

import { Env } from './env';
import { findNearbyProvidersCached } from './placesCache';
import type { PlacesProvider } from './googlePlaces';
import { sendWhatsAppMessage } from './twilio';
import { parseProviderReply } from './geminiParser';
import { FirestoreClient } from './firestore';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    try {
      if (url.pathname === '/health') {
        return jsonResponse({ status: 'ok', time: new Date().toISOString() });
      }

      if (url.pathname === '/broadcast' && request.method === 'POST') {
        return await handleBroadcast(request, env);
      }

      if (url.pathname === '/webhook/twilio' && request.method === 'POST') {
        return await handleTwilioWebhook(request, env);
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (err) {
      console.error('Worker error:', err);
      return jsonResponse(
        {
          error: 'Internal error',
          message: err instanceof Error ? err.message : 'Unknown',
        },
        500
      );
    }
  },
};

// ===== Route handlers =====

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

  const maxProviders = parseInt(env.MAX_PROVIDERS_PER_REQUEST || '5', 10);
  const radiusMeters = parseInt(env.SEARCH_RADIUS_METERS || '20000', 10);
  const cacheTtl = parseInt(env.PLACES_CACHE_TTL_SECONDS || '86400', 10);

  const isDryRun = (env.DRY_RUN || 'false').toLowerCase() === 'true';
  console.log(
    `[broadcast] requestId=${body.requestId} professions=${body.professions.join(',')} ` +
      `lat=${body.location.lat} lng=${body.location.lng} dryRun=${isDryRun}`
  );

  // Find providers for each profession via Google Places (cached via KV)
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
        console.log(`  - ${p.name} | ${p.phone} | rating=${p.rating ?? 'n/a'}`);
      }

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

  // Limit to top N providers
  const providers = allProviders.slice(0, maxProviders);

  console.log(`[broadcast] total unique providers: ${providers.length}`);

  if (providers.length === 0) {
    return jsonResponse({ sentCount: 0, providersFound: 0, providers: [], dryRun: isDryRun });
  }

  // Send (or simulate sending) WhatsApp to each provider
  const message = buildProviderMessage(body);
  let sentCount = 0;
  const results: Array<{ name: string; phone: string; sent: boolean; reason?: string }> = [];

  for (const provider of providers) {
    if (!provider.phone) {
      results.push({ name: provider.name, phone: '', sent: false, reason: 'no phone' });
      continue;
    }

    if (isDryRun) {
      console.log(`[DRY RUN] would send WhatsApp to ${provider.name} (${provider.phone})`);
      results.push({ name: provider.name, phone: provider.phone, sent: false, reason: 'dry run' });
      continue;
    }

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

  return jsonResponse({
    sentCount,
    providersFound: providers.length,
    providers: results,
    dryRun: isDryRun,
  });
}

async function handleTwilioWebhook(request: Request, env: Env): Promise<Response> {
  // Twilio sends application/x-www-form-urlencoded webhooks
  const formData = await request.formData();
  const from = formData.get('From')?.toString() || '';
  const body = formData.get('Body')?.toString() || '';
  const profileName = formData.get('ProfileName')?.toString() || 'בעל מקצוע';

  console.log('Twilio webhook:', { from, body, profileName });

  if (!body) {
    return twimlResponse('');
  }

  // Parse the reply with Gemini
  const parsed = await parseProviderReply({
    apiKey: env.GEMINI_API_KEY,
    replyText: body,
  });

  // Not interested - don't create a bid
  if (!parsed.interested) {
    return twimlResponse('תודה על המענה. נשמור את התגובה שלך.');
  }

  // Write a bid to Firestore
  // NOTE: We need to know which requestId this is for. In the sandbox we don't
  // have a clean way to do that. A common pattern is to include a short code
  // in the outbound message and have the provider include it. For now, we
  // write to a "pendingBids" collection that the client can reconcile.
  const firestore = new FirestoreClient(env.FIREBASE_PROJECT_ID, env.FIREBASE_SERVICE_ACCOUNT_JSON);

  const bidId = crypto.randomUUID();
  await firestore.createBid({
    requestId: 'unknown', // TODO: extract from conversation context
    bidId,
    data: {
      providerName: profileName,
      providerPhone: from.replace(/^whatsapp:/, ''),
      price: parsed.price,
      availability: parsed.availability,
      rawReply: parsed.rawText,
      receivedAt: new Date().toISOString(),
    },
  });

  return twimlResponse('תודה! התגובה שלך נרשמה והלקוח יקבל אותה.');
}

// ===== Helpers =====

function buildProviderMessage(body: BroadcastBody): string {
  return [
    `שלום, קיבלת הצעת עבודה חדשה דרך ai-fixly:`,
    ``,
    body.shortSummary || 'בקשת שירות חדשה',
    ``,
    `המיקום: ${body.location.address || 'לא צוין'}`,
    ``,
    `מעוניין?`,
    `אנא השב עם:`,
    `1. מחיר משוער`,
    `2. מתי תוכל להגיע`,
    ``,
    `תודה!`,
  ].join('\n');
}

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

function twimlResponse(message: string): Response {
  const xml = message
    ? `<Response><Message>${escapeXml(message)}</Message></Response>`
    : '<Response></Response>';
  return new Response(xml, {
    headers: { 'Content-Type': 'text/xml' },
  });
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
