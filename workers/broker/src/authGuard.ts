import { verifyFirebaseIdToken } from './firebaseAuthVerify';

interface AuthEnv {
  FIREBASE_PROJECT_ID: string;
  PLACES_CACHE: KVNamespace;
  /** 'strict' (default) | 'soft' (allow missing-token, reject only invalid). */
  BROKER_AUTH_MODE?: string;
}

/**
 * Auth guard for endpoints that act on a user's behalf and cost money
 * to call (broadcast → Twilio + Places, chat/send → Twilio, etc.).
 *
 * Without this, anyone who knows our broker URL can spam the endpoints
 * and burn through our Twilio credits in minutes.
 *
 * Returns the verified UID on success, or a Response (401) the caller
 * should return immediately.
 *
 * Usage:
 * ```
 * const auth = await requireAuth(request, env);
 * if (auth instanceof Response) return auth;
 * const uid = auth;
 * // ... uid is verified
 * ```
 */
export async function requireAuth(
  request: Request,
  env: AuthEnv,
): Promise<string | Response> {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'unauthorized', reason: 'missing_token' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    const decoded = await verifyFirebaseIdToken(
      token,
      env.FIREBASE_PROJECT_ID,
      env.PLACES_CACHE,
    );
    return decoded.sub;
  } catch (err: any) {
    console.warn('[auth] token verify failed:', err?.message || err);
    return new Response(
      JSON.stringify({ error: 'unauthorized', reason: 'invalid_token' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

/**
 * Soft-auth: same verification as requireAuth, but tolerates a missing
 * token while we roll out client changes. Used during the transition from
 * "anyone can call" to "everyone must auth".
 *
 * Behaviour:
 *   - No token + soft mode      → return null (allow, log warning)
 *   - No token + strict mode    → 401 Response (block)
 *   - Token present, valid      → return uid
 *   - Token present, invalid    → 401 Response (always block — someone is trying to spoof)
 *
 * Set env `BROKER_AUTH_MODE=strict` to flip to enforcement once the
 * client OTA has propagated.
 */
export async function softAuth(
  request: Request,
  env: AuthEnv,
  endpointName: string,
): Promise<string | null | Response> {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const mode = (env.BROKER_AUTH_MODE || 'soft').toLowerCase();

  if (!token) {
    if (mode === 'strict') {
      return new Response(
        JSON.stringify({ error: 'unauthorized', reason: 'missing_token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }
    console.warn(`[soft-auth] ${endpointName} called without token — allowing in soft mode`);
    return null;
  }

  // A token was supplied — always verify it. An invalid token in any mode is
  // suspicious and should be rejected.
  try {
    const decoded = await verifyFirebaseIdToken(
      token,
      env.FIREBASE_PROJECT_ID,
      env.PLACES_CACHE,
    );
    return decoded.sub;
  } catch (err: any) {
    console.warn(`[soft-auth] ${endpointName} bad token:`, err?.message || err);
    return new Response(
      JSON.stringify({ error: 'unauthorized', reason: 'invalid_token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
