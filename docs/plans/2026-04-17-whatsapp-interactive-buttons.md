# WhatsApp interactive buttons (CTA + quick reply)

Status: **planned, not implemented**.

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

## Implementation sketch (when we're ready)

1. Create a template in Twilio Console:
   - **Type:** Call-to-Action.
   - **Body:** `{{1}}` (so we can inject the per-request preamble — area,
     description, photo count).
   - **Buttons:**
     - `Send a quote` → URL: `https://ai-fixly-web.pages.dev/provider/quote/{{2}}?phone={{3}}`
     - `Report the request` → URL: `https://ai-fixly-web.pages.dev/provider/report/{{2}}?phone={{3}}`
2. Submit for WhatsApp approval. Wait for the green checkmark.
3. Copy the `ContentSid` (looks like `HXxxxxxxxxxxxxxxxxxx`).
4. Add `TWILIO_CONTENT_SID_PROVIDER_INTRO` to the worker secrets.
5. Add a `sendWhatsAppTemplate({ contentSid, variables, mediaUrls })`
   helper next to `sendWhatsAppMessage`. It POSTs to the same Messages
   endpoint but with `ContentSid` + `ContentVariables` (JSON) instead of
   `Body`.
6. In `buildProviderMessage` callers, branch on whether
   `env.TWILIO_CONTENT_SID_PROVIDER_INTRO` is set:
   - Set → use the template.
   - Unset → fall back to the current free-form text (keeps dev unblocked).

## Why we're punting today

- The end-to-end demo flow already works with text links — the provider can
  tap them and reach the quote form just fine.
- The approval round-trip is asynchronous and out-of-band (Twilio + Meta).
- Adding a template path before approval is finished would be dead code we'd
  forget about.

When the user wants to push the polish further, this plan is enough to pick
up cold.
