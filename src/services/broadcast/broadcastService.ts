import { logger } from '../logger';
import { analyticsService } from '../analytics';

function brokerUrl(): string | null {
  return process.env.EXPO_PUBLIC_BROKER_URL || null;
}

async function brokerFetch(path: string, body: unknown): Promise<Response | null> {
  const url = brokerUrl();
  if (!url) {
    logger.warn(`[broker] EXPO_PUBLIC_BROKER_URL not set, skipping ${path}`);
    return null;
  }

  try {
    return await fetch(`${url}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    logger.error(`[broker] ${path} request failed`, err as Error);
    return null;
  }
}

export interface BroadcastInput {
  requestId: string;
  professions: string[];
  shortSummary: string;
  mediaUrls: string[];
  location: { lat: number; lng: number; address: string };
  urgency?: string;  // from AI analysis, drives search aggressiveness
}

export interface BroadcastProviderResult {
  name: string;
  phone: string;
  sent: boolean;
  reason?: string;
}

export interface BroadcastResult {
  sentCount: number;
  providersFound: number;
  providers: BroadcastProviderResult[];
  dryRun: boolean;
}

/**
 * Broadcast a service request to providers via the Cloudflare Worker broker.
 *
 * Flow:
 *   1. Client calls this function after a request is created.
 *   2. This function calls the Cloudflare Worker POST /broadcast endpoint.
 *   3. The Worker queries Google Places API for providers of each profession
 *      in the user's area.
 *   4. The Worker sends a WhatsApp message to each provider via Twilio.
 *   5. Provider replies arrive at the Worker webhook, get parsed by Gemini,
 *      and written as bids to Firestore.
 *
 * If the Worker URL is not configured (dev mode), returns a mock success so
 * the UX still works for testing.
 */
export async function broadcastToProviders(input: BroadcastInput): Promise<BroadcastResult> {
  const workerUrl = process.env.EXPO_PUBLIC_BROKER_URL;

  if (!workerUrl) {
    logger.warn('[broadcast] No EXPO_PUBLIC_BROKER_URL set - using mock mode');
    analyticsService.trackEvent('request_sent', {
      requestId: input.requestId,
      providerCount: 0,
      mock: 'true',
    });
    return { sentCount: 0, providersFound: 0, providers: [], dryRun: true };
  }

  try {
    logger.info('[broadcast] Calling broker', {
      requestId: input.requestId,
      professions: input.professions.join(','),
    });

    const response = await fetch(`${workerUrl}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Broker returned ${response.status}: ${text}`);
    }

    const result = (await response.json()) as BroadcastResult;

    analyticsService.trackEvent('request_sent', {
      requestId: input.requestId,
      providerCount: result.sentCount,
    });

    logger.info('[broadcast] Success', {
      requestId: input.requestId,
      sent: result.sentCount.toString(),
      found: result.providersFound.toString(),
    });

    return result;
  } catch (err) {
    logger.error('[broadcast] Failed', err as Error, { requestId: input.requestId });
    throw err;
  }
}

/**
 * Notify the worker that the customer selected a provider.
 * The worker will:
 * 1. Send a WhatsApp to the provider saying "you were selected"
 * 2. Refresh the phone->requestId mapping in KV so future replies are
 *    routed to the chat instead of creating new bids
 */
export async function notifyProviderSelected(params: {
  requestId: string;
  providerPhone: string;
  providerName: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
}): Promise<void> {
  const response = await brokerFetch('/provider/selected', params);
  if (!response || !response.ok) {
    logger.warn('[notifyProviderSelected] failed', {
      requestId: params.requestId,
      status: response?.status?.toString() || 'no response',
    });
  }
}

/**
 * Forward a customer chat message to the provider via WhatsApp.
 */
export async function forwardChatMessage(params: {
  requestId: string;
  providerPhone: string;
  text: string;
}): Promise<void> {
  const response = await brokerFetch('/chat/send', params);
  if (!response || !response.ok) {
    logger.warn('[forwardChatMessage] failed', {
      requestId: params.requestId,
      status: response?.status?.toString() || 'no response',
    });
  }
}
