# WhatsApp interactive buttons (CTA + quick reply)

Status: **code path wired, waiting on template approval**. The worker already
falls back to the free-form text message when no `TWILIO_CONTENT_SID_PROVIDER_INTRO`
secret is set, so nothing is blocked.

## What the user asked for

Today the broker sends a plain-text WhatsApp message with two URLs:

```
🟢 Send a quote: https://ai-fixly-web.pages.dev/provider/quote/abc123
🔴 Report the request: https://ai-fixly-web.pages.dev/provider/report/abc123
```

The asks: render those as **buttons** inside the WhatsApp UI instead of
inline links, the way Twilio examples and big brands do it.

## Why this isn't a one-line change

Twilio WhatsApp does support interactive messages — both **CTA URL buttons**
and **quick-reply buttons** — but they require a pre-approved
[**Content Template**](https://www.twilio.com/docs/content-api). Templates
have to be:

1. Designed in the [Twilio Content Builder](https://console.twilio.com/us1/develop/content/templates).
2. Submitted for **WhatsApp approval** (Meta reviews each template — 24–72h
   typically). Approval is required even on the Twilio sandbox for templates
   that contain buttons.
3. Referenced by their `ContentSid` (e.g. `HXxxxxxx`) when sending. You
   pass `ContentSid` and `ContentVariables` instead of `Body`/`MediaUrl`.

The current `sendWhatsAppMessage` builds a free-form message; switching to
a content template is a separate code path.

## What's already in the code (as of 2026-04-17)

- `workers/broker/src/twilio.ts` — new `sendWhatsAppTemplate()` helper that
  POSTs to the same Messages endpoint using `ContentSid` + `ContentVariables`
  (JSON) instead of `Body`.
- `workers/broker/src/index.ts` — `sendProviderIntro()` picks between the
  template and the plain-text path based on whether
  `TWILIO_CONTENT_SID_PROVIDER_INTRO` is set. Both broadcast paths (test-mode
  and real) go through it.
- `workers/broker/src/env.ts` — the env var is typed and documented.

So **nothing code-side is blocked**. You can deploy the worker today and
it'll keep using the text-link message. The moment you set the secret it
flips to the interactive template.

## To finish the feature (your one-time manual task)

1. Go to the Twilio Content Builder:
   https://console.twilio.com/us1/develop/content/templates
2. Create a new template — **Type: Call-to-Action**.
3. **Body:** `🔧 ai-fixly — בקשת שירות חדשה\n\n{{1}}` (the worker will fill
   `{{1}}` with `<city> • <shortSummary>`).
4. **Buttons:**
   - `שלח הצעת מחיר` → URL: `https://ai-fixly-web.pages.dev/provider/quote/{{2}}?phone={{3}}`
   - `דווח על הבקשה` → URL: `https://ai-fixly-web.pages.dev/provider/report/{{2}}?phone={{3}}`
5. Submit for WhatsApp approval. Wait for the green checkmark (~24–72 h).
6. Copy the **ContentSid** (looks like `HXxxxxxxxxxxxxxxxxxx`).
7. Register it as a worker secret:
   ```bash
   cd workers/broker
   npx wrangler secret put TWILIO_CONTENT_SID_PROVIDER_INTRO
   # paste HXxxxxxxxxxxxxxxxxxx when prompted
   npx wrangler deploy
   ```

The next broadcast will go out as an interactive template.

## Variable mapping (keep this in sync with the template)

| Template var | Filled with | Why |
|--------------|-------------|-----|
| `{{1}}` | `<city> • <shortSummary>` | Body text the provider reads. |
| `{{2}}` | `requestId` | Stitched into both button URLs. |
| `{{3}}` | `providerPhone` | Query param so the form can pre-fill. |

If you change the order in the template, change it in
`sendProviderIntro()` too.
