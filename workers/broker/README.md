# ai-fixly broker worker

Cloudflare Worker that sits between the ai-fixly mobile app and external services.

## What it does

1. **Outbound (POST /broadcast)** — Receives a request from the app. Queries
   Google Places API for providers matching the AI-identified professions near
   the user's location. Sends each provider a WhatsApp message via Twilio.

2. **Inbound (POST /webhook/twilio)** — Receives Twilio webhooks when a
   provider replies to a WhatsApp message. Parses the reply with Gemini to
   extract structured data (price, availability, interested y/n), then writes
   a bid document to Firestore.

3. **Health (GET /health)** — Basic health check.

## Setup

### 1. Install wrangler

```bash
cd workers/broker
npm install
```

### 2. Login to Cloudflare

```bash
npx wrangler login
```

This opens a browser to authorize wrangler with your Cloudflare account. You
need a free Cloudflare account — no credit card required for Workers.

### 3. Create KV namespace for Places caching

Google Places costs money ($32 per 1000 calls after free tier). We cache
results in Cloudflare KV to dramatically reduce cost.

```bash
npx wrangler kv:namespace create "PLACES_CACHE"
```

This will print something like:
```
id = "abcd1234567890efgh"
```

Copy the id and paste it in `wrangler.toml`, replacing `REPLACE_WITH_YOUR_KV_ID`.

### 4. Set secrets

```bash
# Google Places API Key (get from Google Cloud Console)
npx wrangler secret put GOOGLE_PLACES_API_KEY

# Twilio (from Twilio Console)
npx wrangler secret put TWILIO_ACCOUNT_SID
npx wrangler secret put TWILIO_AUTH_TOKEN
npx wrangler secret put TWILIO_WHATSAPP_FROM  # e.g. whatsapp:+14155238886

# Gemini (from Google AI Studio)
npx wrangler secret put GEMINI_API_KEY

# Firebase (for writing bids)
npx wrangler secret put FIREBASE_PROJECT_ID
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON
```

**Getting the Firebase service account JSON:**

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Minify it to a single line: `cat serviceAccount.json | jq -c`
5. Paste the entire minified JSON when wrangler prompts for the secret

### 5. Deploy

```bash
npm run deploy
```

You'll get a URL like `https://ai-fixly-broker.<your-subdomain>.workers.dev`.

### 6. Configure the app

Add the worker URL to your app's `.env`:

```
EXPO_PUBLIC_BROKER_URL=https://ai-fixly-broker.<your-subdomain>.workers.dev
```

Restart Metro so Expo picks up the new env var.

### 7. Configure Twilio webhook

In Twilio Console → Messaging → Try it out → Send a WhatsApp message → Sandbox
settings:

- **"When a message comes in"**: `https://ai-fixly-broker.<your-subdomain>.workers.dev/webhook/twilio`
- Method: `POST`

Save. Now when providers reply in WhatsApp, Twilio will POST to the worker.

## Local development

```bash
npm run dev
```

Starts a local dev server at `http://localhost:8787`. You can test the
broadcast endpoint with curl:

```bash
curl -X POST http://localhost:8787/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "test123",
    "professions": ["plumber"],
    "shortSummary": "נזילה במטבח",
    "mediaUrls": [],
    "location": { "lat": 32.0853, "lng": 34.7818, "address": "Tel Aviv" }
  }'
```

## Logs

```bash
npm run tail
```

Streams live logs from the deployed worker.

## Cost protection

### Google Places API

The "Nearby Search (New)" endpoint costs ~$32 per 1000 requests after the
free tier (first 10,000 per month are free). We protect against runaway costs
with three layers:

**1. KV caching (this worker)**
- Results are cached in Cloudflare KV by `profession + lat_rounded + lng_rounded`
- Default TTL: 24 hours
- Users within the same ~1km² cell share results for the same profession
- Configurable via `PLACES_CACHE_TTL_SECONDS` in wrangler.toml

**2. Field masks (this worker)**
- We only request the fields we actually need via `X-Goog-FieldMask`
- Reduces cost per request (Google charges per field SKU tier)

**3. API key restrictions (Google Cloud Console)**
After creating the API key:
- **Application restriction**: Choose "None" (worker is a server, not a client)
- **API restriction**: Restrict key to ONLY "Places API (New)"
  (so a leaked key can't be used for other Google services)
- **Quota limits**: Go to Google Cloud Console → APIs & Services → Quotas
  and cap "Requests per day" to a low number (e.g. 100) during development

### Twilio

- Sandbox mode is free
- Production WhatsApp costs ~$0.05 per conversation
- Set Twilio spending limit in Console → Billing → Usage triggers

### Gemini

- Free tier: generous for our use case (parsing short WhatsApp replies)
- Uses `gemini-2.5-flash` which has the best free-tier quota

## Architecture notes

### Why Cloudflare Workers?

- Free tier: 100k requests/day, no credit card needed
- Runs at the edge (fast from anywhere)
- Works well with Twilio webhooks (simple HTTP handlers)
- Firestore REST API integration is straightforward with Web Crypto

### Why not Firebase Cloud Functions?

They require the Blaze (pay-as-you-go) plan which needs a credit card.

### Why REST API for Firestore instead of Admin SDK?

The Firebase Admin SDK depends on Node.js APIs that don't exist in Cloudflare
Workers. The REST API works natively with Web Crypto for JWT signing.

### Provider matching tradeoff

Currently, when Twilio webhooks come in, we don't have a clean way to
correlate the provider reply to the original request. Options:

1. **Short codes in outbound messages** — Include a 4-char code in the
   outbound message like "Ref: #A1B2". Ask the provider to include it in
   their reply. Parse it out in the webhook.
2. **Phone number lookup** — Maintain a map of phone → last requestId for
   recent broadcasts (in Workers KV or Firestore).
3. **Thread IDs** — Use WhatsApp Business API conversation IDs if we upgrade
   from the sandbox.

The current implementation writes to a bid with `requestId: "unknown"` — the
client will need to reconcile these manually. TODO: implement option 1 or 2
before going live.
