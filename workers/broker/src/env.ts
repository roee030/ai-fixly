/**
 * Environment bindings for the ai-fixly broker worker.
 * These come from wrangler.toml [vars] and `wrangler secret put`.
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

  // Public vars
  MAX_PROVIDERS_PER_REQUEST: string;
  SEARCH_RADIUS_METERS: string;
}
