/**
 * Google OAuth2 access token using a service account JWT.
 *
 * Extracted from firestore.ts so it can be shared between Firestore and FCM
 * (both use Google service accounts but require different scopes).
 *
 * Uses Web Crypto API (available in Cloudflare Workers) to sign the JWT.
 */

interface ServiceAccount {
  project_id: string;
  private_key: string;
  client_email: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

// Cache tokens per scope to avoid re-signing on every request
const tokenCache = new Map<string, CachedToken>();

export async function getAccessToken(params: {
  serviceAccountJson: string;
  scope: string;
}): Promise<string> {
  const { serviceAccountJson, scope } = params;

  const now = Math.floor(Date.now() / 1000);
  const cached = tokenCache.get(scope);
  if (cached && cached.expiresAt > now + 300) {
    return cached.token;
  }

  const sa = JSON.parse(serviceAccountJson) as ServiceAccount;
  const jwt = await createJWT(sa, scope);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OAuth token error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };

  tokenCache.set(scope, {
    token: data.access_token,
    expiresAt: now + data.expires_in,
  });

  return data.access_token;
}

async function createJWT(sa: ServiceAccount, scope: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: sa.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const claimsB64 = base64UrlEncode(JSON.stringify(claims));
  const unsigned = `${headerB64}.${claimsB64}`;

  const pem = sa.private_key.replace(/\\n/g, '\n');
  const keyData = pemToArrayBuffer(pem);

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );

  const signatureB64 = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  return `${unsigned}.${signatureB64}`;
}

function base64UrlEncode(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

export function getProjectId(serviceAccountJson: string): string {
  return (JSON.parse(serviceAccountJson) as ServiceAccount).project_id;
}

export const SCOPES = {
  FIRESTORE: 'https://www.googleapis.com/auth/datastore',
  FCM: 'https://www.googleapis.com/auth/firebase.messaging',
};
