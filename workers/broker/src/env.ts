/**
 * Environment bindings for the ai-fixly broker worker.
 * These come from wrangler.toml [vars], [[kv_namespaces]], and `wrangler secret put`.
 */
export interface Env {
  // Secrets
  GOOGLE_PLACES_API_KEY: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_WHATSAPP_FROM: string;
  GEMINI_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_SERVICE_ACCOUNT_JSON: string;

  // KV binding for caching Google Places results
  PLACES_CACHE: KVNamespace;

  // Public vars
  MAX_PROVIDERS_PER_REQUEST: string;
  SEARCH_RADIUS_METERS: string;
  PLACES_CACHE_TTL_SECONDS: string;
  DRY_RUN: string; // "true" = don't actually send WhatsApp
  /**
   * Test mode: when set to an E.164 phone number (e.g. "+972501234567"),
   * the worker sends exactly ONE real WhatsApp to this number per broadcast
   * (impersonating the first provider found). Replies from this number are
   * routed as provider replies via the normal webhook flow.
   * Overrides DRY_RUN when set. Leave empty for normal behavior.
   */
  TEST_PHONE_OVERRIDE: string;
}
