/**
 * Verify a Firebase ID token in the Worker (no Firebase Admin SDK — too
 * heavy for the edge runtime). The token is a JWT signed by Google's
 * `securetoken` service account; we fetch the matching public x509 cert
 * by its `kid`, verify the RSA-256 signature, and check the standard
 * claims (iss, aud, exp).
 *
 * Public keys are cached in KV for ~1 hour (Google rotates them roughly
 * daily, so this is generous but safe). On a cache miss we hit the well-
 * known endpoint.
 *
 * Returns the decoded payload (uid in `sub`, phone in `phone_number`)
 * when valid, throws an Error otherwise. NEVER log the token itself.
 */

interface DecodedToken {
  sub: string;          // uid
  phone_number?: string;
  email?: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  auth_time?: number;
}

const PUBLIC_KEYS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const PUBLIC_KEYS_KV_KEY = 'firebase:publicKeys:v1';
const PUBLIC_KEYS_TTL_SEC = 3600; // 1 hour

export async function verifyFirebaseIdToken(
  token: string,
  projectId: string,
  kv: KVNamespace,
): Promise<DecodedToken> {
  if (!token || token.split('.').length !== 3) {
    throw new Error('invalid_token_format');
  }
  const [headerB64, payloadB64, signatureB64] = token.split('.');

  const header = JSON.parse(b64UrlDecodeString(headerB64));
  if (header.alg !== 'RS256') throw new Error('bad_alg');
  if (!header.kid) throw new Error('no_kid');

  const payload = JSON.parse(b64UrlDecodeString(payloadB64)) as DecodedToken;

  // ── Standard claim checks ────────────────────────────────────────────
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) throw new Error('token_expired');
  if (payload.iat > now + 60) throw new Error('iat_in_future');
  if (payload.aud !== projectId) throw new Error('bad_aud');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('bad_iss');
  }
  if (!payload.sub) throw new Error('no_sub');

  // ── Signature check ─────────────────────────────────────────────────
  const certs = await fetchPublicKeys(kv);
  const cert = certs[header.kid];
  if (!cert) throw new Error('unknown_kid');

  const cryptoKey = await importX509Cert(cert);
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = b64UrlDecodeBytes(signatureB64);
  const valid = await crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    cryptoKey,
    signature,
    data,
  );
  if (!valid) throw new Error('bad_signature');

  return payload;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

async function fetchPublicKeys(kv: KVNamespace): Promise<Record<string, string>> {
  const cached = await kv.get(PUBLIC_KEYS_KV_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // fall through to refetch
    }
  }
  const res = await fetch(PUBLIC_KEYS_URL);
  if (!res.ok) throw new Error(`public_keys_fetch_failed_${res.status}`);
  const json = (await res.json()) as Record<string, string>;
  await kv.put(PUBLIC_KEYS_KV_KEY, JSON.stringify(json), {
    expirationTtl: PUBLIC_KEYS_TTL_SEC,
  });
  return json;
}

async function importX509Cert(pem: string): Promise<CryptoKey> {
  // The x509 cert PEM contains the public key — we strip the headers and
  // base64-decode the body, then import via SubtleCrypto. To get the SPKI
  // we'd normally need an ASN.1 parser; instead we extract the RSA modulus
  // and exponent from the cert's tbsCertificate. SubtleCrypto on Workers
  // accepts 'spki' format, so we parse out the SPKI from the cert.
  //
  // Cleaner shortcut: the public key inside a Firebase x509 cert can be
  // imported directly with `importKey('spki', ...)` AFTER we extract the
  // SubjectPublicKeyInfo. We do that with a tiny ASN.1 walker below.
  const der = pemToDer(pem);
  const spki = extractSpkiFromX509(der);
  return await crypto.subtle.importKey(
    'spki',
    spki,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

function pemToDer(pem: string): Uint8Array {
  const stripped = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(stripped);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Walk an X.509 DER cert and return the SubjectPublicKeyInfo octets.
 * Cert layout (simplified):
 *   SEQUENCE {
 *     SEQUENCE { tbsCertificate ... SubjectPublicKeyInfo ... }
 *     SEQUENCE { signatureAlgorithm }
 *     BIT STRING { signature }
 *   }
 * The SPKI is the 7th element of tbsCertificate (after version, serial,
 * sigAlg, issuer, validity, subject). We use a minimal ASN.1 parser
 * sufficient for this fixed layout.
 */
function extractSpkiFromX509(der: Uint8Array): Uint8Array {
  let p = 0;
  // Outer cert SEQUENCE
  if (der[p++] !== 0x30) throw new Error('asn1_bad_cert');
  p += skipLen(der, p)[1];
  // tbsCertificate SEQUENCE
  if (der[p++] !== 0x30) throw new Error('asn1_bad_tbs');
  const [, lenBytes] = skipLen(der, p);
  p += lenBytes;
  // Skip [0] EXPLICIT version (optional)
  if (der[p] === 0xa0) p += skipTLV(der, p);
  // serialNumber INTEGER
  p += skipTLV(der, p);
  // signatureAlgorithm SEQUENCE
  p += skipTLV(der, p);
  // issuer SEQUENCE
  p += skipTLV(der, p);
  // validity SEQUENCE
  p += skipTLV(der, p);
  // subject SEQUENCE
  p += skipTLV(der, p);
  // SubjectPublicKeyInfo SEQUENCE — this is what we want
  const spkiStart = p;
  const spkiLen = skipTLV(der, p);
  return der.subarray(spkiStart, spkiStart + spkiLen);
}

function skipLen(buf: Uint8Array, offset: number): [number, number] {
  const b = buf[offset];
  if (b < 0x80) return [b, 1];
  const n = b & 0x7f;
  let len = 0;
  for (let i = 1; i <= n; i++) len = (len << 8) | buf[offset + i];
  return [len, 1 + n];
}

function skipTLV(buf: Uint8Array, offset: number): number {
  const [len, lenBytes] = skipLen(buf, offset + 1);
  return 1 + lenBytes + len;
}

function b64UrlDecodeString(s: string): string {
  return atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(s.length + ((4 - (s.length % 4)) % 4), '='));
}

function b64UrlDecodeBytes(s: string): Uint8Array {
  const str = b64UrlDecodeString(s);
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i);
  return out;
}
