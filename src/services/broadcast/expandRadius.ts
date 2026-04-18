import { logger } from '../logger';

const BROKER_URL = process.env.EXPO_PUBLIC_BROKER_URL || '';

/**
 * Ask the broker to re-broadcast a request with a larger search radius.
 * Called from the request-details screen when the user taps the "no
 * replies yet, expand search?" banner.
 *
 * The broker re-reads the request from Firestore — no need for the client
 * to re-package media / professions / location.
 */
export async function expandRequestRadius(requestId: string): Promise<boolean> {
  if (!BROKER_URL) {
    logger.warn('[broadcast] EXPO_PUBLIC_BROKER_URL not set; cannot expand');
    return false;
  }
  try {
    const res = await fetch(`${BROKER_URL}/request/expand-radius`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, multiplier: 2 }),
    });
    return res.ok;
  } catch (err) {
    logger.error('[broadcast] expand radius failed', err as Error);
    return false;
  }
}
