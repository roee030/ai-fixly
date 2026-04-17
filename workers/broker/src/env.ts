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

  /**
   * Twilio Content Template SID for the "new service request" provider intro
   * message (HXxxxxxxxxxxxxxxxxxx). When set, the broadcast uses this
   * interactive template — the provider sees "Send a quote" and "Report" as
   * real WhatsApp CTA buttons instead of inline URLs. When unset, we fall
   * back to the plain-text message with links.
   *
   * Template creation + approval is a one-time manual step in the Twilio
   * Console. See docs/plans/2026-04-17-whatsapp-interactive-buttons.md.
   */
  TWILIO_CONTENT_SID_PROVIDER_INTRO?: string;

  /**
   * Optional override for the web base URL of the provider forms. Falls
   * back to ai-fixly-web.pages.dev when unset.
   */
  PROVIDER_FORM_BASE_URL?: string;
}
