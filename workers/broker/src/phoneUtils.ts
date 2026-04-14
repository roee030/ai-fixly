/**
 * Phone number utilities for Israeli WhatsApp-capable number detection.
 *
 * Rationale: Google Places returns ANY phone number for a business — landlines,
 * service numbers, and mobiles all mixed in. Sending a WhatsApp to a landline
 * either fails silently (Twilio error 63016) or, worse, counts as a charged
 * attempt. We filter out numbers that are unlikely to be reachable via WhatsApp
 * BEFORE attempting to send.
 *
 * Heuristic for Israel: mobile numbers start with 05X (05 is the mobile range).
 * Everything else (01, 02, 03, 04, 08, 09, 1800, *xxxx) is either a landline,
 * service number, or special-rate line — none of which support WhatsApp.
 *
 * For non-Israeli numbers we default to "capable" — Twilio will surface the
 * real errors on send, and we don't want to incorrectly filter out legitimate
 * foreign providers if the area ever expands beyond Israel.
 */

/**
 * Normalize a phone number that's probably Israeli into E.164 format.
 * - Strips all whitespace, dashes, dots, parentheses
 * - Converts `0XX...` local form to `+972XX...`
 * - Already-E.164 numbers pass through unchanged
 */
export function normalizeIsraeliPhone(raw: string): string {
  if (!raw) return '';

  // Strip everything except digits and the leading +
  const hasPlus = raw.trim().startsWith('+');
  const digits = raw.replace(/[^\d]/g, '');

  if (hasPlus) {
    return `+${digits}`;
  }

  // Local Israeli form: leading 0 → +972
  if (digits.startsWith('0')) {
    return `+972${digits.slice(1)}`;
  }

  // Anything else — leave as-is (with + prepended to be safe)
  return digits.length > 0 ? `+${digits}` : '';
}

/**
 * Heuristic: does this phone number probably have WhatsApp?
 *
 * For Israeli numbers we check the mobile prefix. For everything else we
 * default to true (conservative — let Twilio decide at send time).
 */
export function isLikelyWhatsAppCapable(raw: string): boolean {
  if (!raw) return false;

  const normalized = normalizeIsraeliPhone(raw);

  // Israeli numbers start with +972
  if (normalized.startsWith('+972')) {
    // Strip country code, look at the first digit of the subscriber number
    const subscriber = normalized.slice(4); // skip "+972"

    // Valid subscriber numbers have at least 8 more digits
    if (subscriber.length < 8) return false;

    // Mobile range: subscriber starts with "5" (i.e. +9725X...)
    // This covers 050, 052, 053, 054, 055, 058 and any future 05X expansion.
    return subscriber.startsWith('5');
  }

  // Non-Israeli: no reliable heuristic. Assume capable and let Twilio
  // handle the actual delivery result.
  // Require at least 11 total digits — real international numbers in
  // E.164 are virtually always 11-15 digits (1-4 country + 7+ national).
  // This rejects shorter garbage like Israeli "1800" service numbers that
  // pass through normalization without a country code.
  if (!/^\+\d{11,}$/.test(normalized)) return false;

  return true;
}
