# Monitoring — what exists today + what's still needed

## What's already running

1. **Sentry (app side)** — `@sentry/react-native` is wired in `app/_layout.tsx`
   and reports unhandled JS exceptions + native crashes. DSN in
   `EXPO_PUBLIC_SENTRY_DSN`. Free tier: 5 K errors/mo.

2. **Firebase Crashlytics (app side)** — `@react-native-firebase/crashlytics`
   captures native Android / iOS crashes. Free, unlimited.

3. **Worker self-monitoring cron** — `handleAlertChecks()` in
   `workers/broker/src/index.ts`. Runs every 5 minutes. Today it:
   - Flags requests open ≥4 hours with 0 bids → writes a doc into
     `adminAlerts` in Firestore.
   - Sends a WhatsApp summary of critical/warning alerts to the owner
     (`+972546651088` in code) — works immediately, no email hop needed.

4. **`wrangler tail` — on-demand** — run from `workers/broker` to stream
   live logs.

## Gaps to fill

| Gap | Effort | Rec |
|---|---|---|
| No alert when the Worker itself is **down** (cron stops running) | ~10 min (external) | Add [UptimeRobot](https://uptimerobot.com) free monitor pointed at `/health`. Alerts via email when the endpoint returns non-200 or doesn't respond for 5 min. |
| No alert when **error rate spikes** | 1 hour | Increment a KV counter `errors:<YYYY-MM-DD-HH>` on every catch block in the Worker; `handleAlertChecks` checks the current hour's counter and alerts via WhatsApp if it crosses (say) 20. |
| No alert on **Twilio cost spike** | 30 min | Track `sends:<YYYY-MM-DD>` in KV per successful `sendWhatsAppMessage`. Daily cron task compares vs the previous day's value and alerts if ratio > 3×. |
| Sentry DSN is a **string**, not per-env | 5 min | Split `EXPO_PUBLIC_SENTRY_DSN_DEV` vs `EXPO_PUBLIC_SENTRY_DSN_PROD` so dev noise doesn't eat the production quota. |

## The cheapest setup you can deploy today

1. Create UptimeRobot account → add HTTP(s) monitor for
   `https://ai-fixly-broker.mr-roee-angel.workers.dev/health`. Alert channel:
   your email. Free tier does 5-minute intervals, 50 monitors.
2. That's it. The existing `handleAlertChecks` + WhatsApp already cover the
   "stuck request" and "no bids for 4h" cases.

When demand grows, adopt the error-rate-counter + cost-spike checks above
(both are small additions to `handleAlertChecks`).
