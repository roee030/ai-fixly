/**
 * KV-backed map from provider phone number to the active request they were
 * contacted about. This solves the correlation problem for inbound webhooks:
 * when Twilio delivers a provider reply, we need to know which request it's
 * for.
 *
 * Key format: `phone:{normalized_phone}`
 * Value: JSON { requestId, providerName, providerPhone, createdAt }
 *
 * TTL: 7 days by default (covers most realistic job lifecycles)
 */

export interface PhoneMapEntry {
  requestId: string;
  providerName: string;
  providerPhone: string;
  /**
   * Optional Google Places rating at the moment the provider was contacted.
   * Stored here so the web-form bid handler can attach it to the bid doc
   * without doing a second Places lookup (→ no extra $).
   */
  rating?: number | null;
  /** Optional Places address string, same reasoning as `rating`. */
  address?: string;
  createdAt: number;
}

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function normalizePhone(phone: string): string {
  // Strip everything except + and digits so lookups are consistent
  return phone.replace(/[^\d+]/g, '').replace(/^whatsapp:/, '');
}

function keyFor(phone: string): string {
  return `phone:${normalizePhone(phone)}`;
}

export async function recordProviderContact(
  kv: KVNamespace,
  phone: string,
  entry: Omit<PhoneMapEntry, 'createdAt'>
): Promise<void> {
  const value: PhoneMapEntry = { ...entry, createdAt: Date.now() };
  try {
    await kv.put(keyFor(phone), JSON.stringify(value), {
      expirationTtl: DEFAULT_TTL_SECONDS,
    });
  } catch (err) {
    console.warn('[phoneMap] write failed:', err);
  }
}

export async function lookupProviderContact(
  kv: KVNamespace,
  phone: string
): Promise<PhoneMapEntry | null> {
  try {
    const value = await kv.get(keyFor(phone), 'json');
    return (value as PhoneMapEntry | null) || null;
  } catch (err) {
    console.warn('[phoneMap] read failed:', err);
    return null;
  }
}
