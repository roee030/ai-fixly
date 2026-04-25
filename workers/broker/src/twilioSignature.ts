/**
 * Twilio webhook signature verification.
 *
 * Twilio HMACs the canonical string `URL + sorted(key+value)` (every form
 * param in the body, joined as `key+value` with no separator) using the
 * account auth token, base64-encodes it, and sends it as the
 * `X-Twilio-Signature` header.
 *
 * If we don't verify, anyone who knows our webhook URL can POST fake
 * "provider replied" events and inject fake bids. This is the only check
 * standing between us and forgery — the rest of the pipeline trusts the
 * webhook payload.
 *
 * Reference: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */

/**
 * Compute the canonical string Twilio signs: URL followed by every form
 * parameter sorted alphabetically and joined as `key + value` with no
 * separator. Exposed for testing — production code should call
 * verifyTwilioSignature directly.
 */
export function buildCanonicalString(url: string, formData: FormData): string {
  const params: string[] = [];
  formData.forEach((value, key) => {
    params.push(`${key}${value}`);
  });
  params.sort();
  return url + params.join('');
}

/**
 * Compute the expected base64 HMAC-SHA1 signature for a webhook call.
 * Used both by the verifier and by tests that need to round-trip a
 * known-good signature.
 */
export async function computeTwilioSignature(
  url: string,
  formData: FormData,
  authToken: string,
): Promise<string> {
  const data = buildCanonicalString(url, formData);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
}

/**
 * Verify a Twilio webhook signature.
 *
 * Returns true on a valid signature, false otherwise. Uses a constant-time
 * compare so a malicious caller can't time-guess byte-by-byte.
 */
export async function verifyTwilioSignature(
  url: string,
  formData: FormData,
  authToken: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const expected = await computeTwilioSignature(url, formData, authToken);
  if (signatureHeader.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signatureHeader.length; i++) {
    mismatch |= signatureHeader.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
