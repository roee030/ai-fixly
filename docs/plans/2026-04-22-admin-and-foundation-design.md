# Admin Dashboard + Foundation Fixes — Design

**Date:** 2026-04-22
**Status:** Approved, ready for implementation plan
**Supersedes (partially):** [2026-04-12-admin-dashboards-design.md](./2026-04-12-admin-dashboards-design.md)

## Goals

1. **Admin dashboard on real data.** Replace every reference to `src/services/admin/mockData.ts` with live Firestore reads, wired for speed via pre-computed daily rollups.
2. **Per-request observability.** A detail page that shows the full service timeline — every Gemini call, upload, Places search, Twilio send — with timings and pass/fail status.
3. **Per-provider visibility.** Each provider in the admin table is clickable, drilling into their full job history, earnings, and customer reviews.
4. **Customer follow-up loop closed.** Capture rating + actual cost paid + free-text review, flow it to both the request detail page and the provider's aggregate stats.
5. **Foundation fixes that block trust:** location must be real (no Tel Aviv fallback), form must be resumable on failure, broadcast failures must be silent for the user but visible to the admin.

## Non-goals

- Admin push notifications (parked).
- Multi-admin roles / audit log (parked — UID whitelist continues for v1).
- Real-time admin listeners (manual refresh is by design — cost control).
- Backfilling historical requests with new fields (90-day TTL eventually replaces them naturally).

---

## 1. Data model

### 1.1 Firestore collections

```
requests/{id}                                         existing — extended
  + locationSummary: { city, region }                 from bounding-box helper
  + broadcastSummary: {
      sentCount, failedCount, providersFound,
      startedAt, finishedAt
    }
  + serviceSummary: {
      geminiMs, uploadMs, firestoreWriteMs, totalMs,
      hadError: bool
    }
  + timeToFirstResponse: number                       set by worker webhook on first bid
  + selectedBidPrice: number | null                   denormalized on selection
  + reviewSummary: {
      rating, comment, pricePaid, submittedAt
    }

requests/{id}/events/{eventId}                        NEW subcollection, 90-day TTL
  {
    type: 'gemini' | 'upload_image' | 'upload_video'
        | 'firestore_write' | 'places_search'
        | 'twilio_send' | 'push_notify'
        | 'first_response' | 'review_submitted'
        | 'broadcast_failed',
    ok: boolean,
    startedAt: Timestamp,
    durationMs: number,
    error?: string,
    metadata: Record<string, any>
  }

providers/{phone}                                     NEW aggregate doc
  {
    displayName, profession, phone,
    city,                                             for location-filtered stats
    stats: {
      offersSent, accepted, completed,
      avgRating, avgPricePaid,
      totalGrossValue,
      replyRate, avgResponseMinutes,
      lastJobAt
    },
    updatedAt
  }

providers/{phone}/jobs/{requestId}                    NEW provider-job log
  {
    requestId, bidPrice,
    pricePaid?, rating?, comment?,
    customerReviewedAt?,
    status, completedAt
  }

adminStats/daily-{YYYYMMDD}                           NEW daily rollup doc
  {
    date: 'YYYY-MM-DD',
    requestsCreated: number,
    reviewsSubmitted: number,
    avgTimeToFirstResponseMin: number,
    avgRating: number,
    grossValue: number,
    byCity: { hadera: {...}, netanya: {...}, tlv: {...}, ... }
  }

reviews/{reviewId}                                    existing — source of truth for review data
```

### 1.2 Firestore indexes

- `requests` composite: `(status ASC, createdAt DESC)` — admin list.
- `requests` composite: `(locationSummary.city ASC, createdAt DESC)` — city-filtered admin list.
- `requests/{id}/events` single: `(startedAt DESC)` — timeline.
- `providers/{phone}/jobs` single: `(completedAt DESC)` — provider history.
- `adminStats` single: `(date DESC)` — overview graphs.

### 1.3 TTL / retention

- `requests/{id}/events/*` — soft TTL 90 days. Weekly worker cron deletes events where `startedAt < now - 90d`.
- Summary fields on `requests` stay forever. No data loss for admin reporting.
- `adminStats/daily-*` stays forever (small, cheap).

### 1.4 Denormalization

Review data is intentionally duplicated:

- `reviews/{reviewId}` — source of truth, write-once.
- `requests/{id}.reviewSummary` — for admin request detail page.
- `providers/{phone}/jobs/{requestId}` — for provider job history.
- `providers/{phone}.stats` — rolled up via O(1) running averages.

Reviews are write-once, so denormalization has no sync cost after submission.

---

## 2. Service instrumentation

### 2.1 Event logger

A single `eventLogger` service on both client and worker:

```ts
logEvent(requestId, {
  type, ok, durationMs, error?, metadata?
}): void     // returns immediately, writes in background, never throws
```

Worker batches events per request into one `WriteBatch`. Client writes are per-call, non-blocking.

### 2.2 Instrumentation points

| Layer | Where | Event type | Key metadata |
|---|---|---|---|
| Client | `geminiAnalysis.ts` | `gemini` | `model`, `totalMs`, `payloadKB`, `imageCount` |
| Client | `mediaService.uploadImage` | `upload_image` | `sizeMB` |
| Client | `mediaService.uploadVideo` | `upload_video` | `sizeMB` |
| Client | `requestService.createRequest` | `firestore_write` | — |
| Worker | Places search (per profession) | `places_search` | `profession`, `foundCount`, `cached: bool` |
| Worker | Twilio send (per provider) | `twilio_send` | `providerPhone`, `twilioSid?`, `error?` |
| Worker | Review reminder push | `push_notify` | `kind: 'review_reminder'` |
| Worker | First bid for a request | `first_response` + updates `requests.timeToFirstResponse` | one-time, idempotent |
| Worker | Review submission via `/review` | `review_submitted` | `rating`, `pricePaid` |
| Worker | Broker call failed entirely | `broadcast_failed` | `status`, `errorText` |

### 2.3 City derivation (bounding boxes)

A `resolveCity(lat, lng)` helper maps coordinates to one of ~15 Israeli metros via hardcoded bounding boxes. Called once on request creation, writes `requests.locationSummary = { city, region }`. Also cached on the user doc as `users/{uid}.locationSummary` for reuse.

**Trade-off accepted:** accuracy is "good enough" for admin filtering. Migrate to reverse-geocoding later if metros list grows.

### 2.4 Fire-and-forget guarantee

```ts
logEvent(requestId, { type, ok, durationMs }).catch(() => {
  // never fails the user's flow
});
```

Worker uses `ctx.waitUntil(batch.commit().catch(() => {}))` so responses return even on transient Firestore errors.

---

## 3. Follow-up flow

### 3.1 Trigger (existing, small addition)

[`handleReviewReminders`](../../workers/broker/src/index.ts#L1170) already:
- Finds CLOSED requests without a review + reminder-not-sent.
- Pushes `"דרג את [provider]"` via `pushToCustomer`.
- Marks `reviewReminderSentAt`.

**Change:** emit `push_notify` event so the attempt appears in the admin timeline.

### 3.2 Deeplink audit

Verify the push's `type` and `data.requestId` route the customer straight to `/review/{requestId}`. Fix if routing to the wrong screen.

### 3.3 Review capture (no new fields)

[app/review/[requestId].tsx](../../app/review/[requestId].tsx) already captures `rating`, `comment`, `pricePaid`, `selectedCategories`, `classificationCorrect`. Fields are sufficient.

**UX tweak:** deeplink carries `?src=reminder`. If present, show a small banner: *"נשאר שלב אחד — איך היה?"*.

### 3.4 Submission moves to the worker

**New:** `POST {BROKER_URL}/review` endpoint.

```
body: { requestId, rating, comment, pricePaid,
        selectedCategories, classificationCorrect }
headers: Authorization: Bearer <firebase-id-token>

Worker:
  1. Verify ID token, extract uid.
  2. Validate:
     - request exists, request.userId === uid
     - request.status === 'CLOSED'
     - no existing review
     - rating 1-5, pricePaid >= 0, comment <= 1000 chars
  3. Firestore transaction:
     a. Create reviews/{reviewId}
     b. Update requests/{id}.reviewSummary
     c. Update providers/{phone}/jobs/{requestId}
     d. Recompute providers/{phone}.stats (O(1) running averages)
  4. Emit review_submitted event.
  5. Return { ok: true }.
```

### 3.5 Provider aggregate — O(1) running average

```
newAvgRating = (oldAvg * oldCount + newRating) / (oldCount + 1)
newAvgPricePaid = similar
completed += 1
lastJobAt = now
totalGrossValue += pricePaid
```

Small numeric drift over 10,000+ reviews is acceptable; speed beats perfection.

### 3.6 Client failure behavior

`POST /review` non-2xx or timeout → show "נסה שוב" with retry button. Form state preserved. No silent loss.

---

## 4. Admin UI

### 4.1 Routes

```
/admin                      overview (upgraded with graphs)
/admin/funnel               funnel (existing, wired to real data in Phase 5)
/admin/requests             NEW — full requests table + filters
/admin/requests/[id]        NEW — per-request detail
/admin/providers            existing — rows become clickable
/admin/providers/[phone]    NEW — per-provider detail + job history
/admin/geo                  existing
/admin/revenue              existing — city filter added in Phase 5
```

### 4.2 `/admin/requests` table

**Columns:** `#`, `createdAt`, `city`, `profession(s)`, `status` badge, `#bids`, `timeToFirstResponse`, `selectedProvider`, `selectedBidPrice`, `pricePaid`, `rating`.

**Urgency coloring:**
- Red tint: OPEN > 4h, 0 bids
- Yellow tint: OPEN > 1h, 0 bids
- Green tint: CLOSED, rating >= 4
- No tint: otherwise

**Filters:**
- Date range: Last 30 days / Last 90 days / custom
- City: multi-select from ~15 known metros
- Status: All / Open / In progress / Closed
- Has review: Yes / No / —

**Sorting:** default `createdAt DESC`, clickable column headers.
**Pagination:** cursor-based via Firestore `startAfter`, 50 per page.
**CSV export:** button in top toolbar, exports current filtered view (all pages). Columns match the table. Runs client-side from the same data.
**Row click:** → `/admin/requests/[id]`.

### 4.3 `/admin/requests/[id]` detail

Vertical stack:

1. **Header** — id, city, created time, status badge, "שדר מחדש" button (for retrying failed broadcasts), "סגור בכוח" for stuck requests.
2. **Customer summary** — masked phone, description, media thumbnails.
3. **AI analysis** — professions chosen, Gemini model, timing.
4. **Broadcast summary** — `sentCount / failedCount / providersFound`, total duration.
5. **Service timeline** (reads `requests/{id}/events/*`) — vertical list, colored dots:
   - 🟢 `14:02:01 · gemini · 3.4s · 2 images`
   - 🟢 `14:02:04 · upload_image · 0.8s · 2.1MB`
   - 🟢 `14:02:06 · places_search · plumber · 12 found (cached)`
   - 🔴 `14:02:07 · twilio_send · +972-52-... · FAILED: invalid number`
   - 🟢 `14:18:22 · first_response · from +972-50-... · 16m 21s after broadcast`
6. **Bids received** — table: provider phone, price, availability, status, replied-at.
7. **Review** — rating stars, `pricePaid`, comment text; if missing: "ממתין לתגובת לקוח · last reminder sent Xh ago".

### 4.4 `/admin/providers/[phone]` detail

1. **Header** — name, phone, profession, city, verified badge, vacation status.
2. **Lifetime stats** — offersSent, accepted, completed, avgRating, avgPricePaid, totalGrossValue, replyRate, avgResponseMinutes.
3. **Jobs table** — each row: request id (linked), date, bidPrice, pricePaid, rating, review comment (truncated). CSV export for this table too.
4. **Activity graph** — bids per week over 90 days.

### 4.5 Overview graphs (`/admin`)

5 charts in a responsive grid. Global time toggle `[30d] [90d]` and city filter `City: [All ▼]` re-compute all charts together.

| Chart | Type | Source |
|---|---|---|
| Requests per day | Line | `adminStats.requestsCreated` |
| Conversion funnel | Horizontal bar | computed from daily rollups |
| Avg time to first bid | Line | `adminStats.avgTimeToFirstResponseMin` |
| Revenue / gross value | Bar | `adminStats.grossValue` |
| Avg review rating | Line | `adminStats.avgRating` |

City filter uses the pre-rolled `byCity.*` fields — no extra Firestore query per filter change.

### 4.6 Chart library

**`victory-native`** — works on web and mobile, renders Hebrew, ~120KB gzipped. Must be tested in an EAS dev build before committing (SDK 54 compatibility).

### 4.7 Data fetching

- **Not real-time.** Manual "Refresh" button + pull-to-refresh on mobile.
- `useAdminQuery` hook wraps `getDocs` with 60s in-memory cache.
- Overview reads 30 or 90 `adminStats/daily-*` docs only — pre-computed by `handleDailyRollup` cron every 6h.

---

## 5. Foundation fixes

### 5.1 Location — hard-stop onboarding

**Delete:** the Tel Aviv fallback at [confirm.tsx:119](../../app/capture/confirm.tsx#L119) and its swallowing `try/catch`.

**Onboarding flow changes:**
1. Location permission is a hard stop in [app/(auth)/permissions.tsx](../../app/(auth)/permissions.tsx). Deny → show screen with message:

   > *"אנחנו חייבים מיקום כדי למצוא לך את בעל המקצוע הכי קרוב ומהיר"*

   Buttons: "פתח הגדרות" / "נסה שוב". No "Skip".

2. On granting, call `getCurrentPositionAsync()` and save `users/{uid}.location = { lat, lng, address }` + `locationSummary = { city, region }` (from bounding boxes).

3. **On every app resume,** re-check permission. Revoked → show the same hard-stop screen before the Hub renders. Reuses existing re-check behavior from commit `da43c57`.

4. **On capture confirm:** read `users/{uid}.location`. Missing (edge case) → show modal: "לא הצלחנו למצוא את המיקום שלך — רענן הרשאות בהגדרות". Never fabricate coordinates.

### 5.2 Form save — AsyncStorage draft

**Key:** `draft:request:{userId}`

**Value:**
```ts
{
  createdAt: ISO,
  imageUris: string[],
  videoAssets: { uri, thumbnailUri }[],
  description: string,
  analysis: AIAnalysisResult | null,
  chosenProfessions: string[],
  analysisKey?: string,
  analysisVersion: string    // lets us invalidate if prompt format changes
}
```

**Lifecycle:**
- Write before first `uploadImage`.
- Update with analysis result when it arrives.
- Delete on `createRequest` success.
- Restore on app open:
  - `age < 24h` → Hub banner "יש לך בקשה שהתחלת — המשך או התחל חדש?". Continue → `/capture/confirm` with hydrated state.
  - `age >= 24h` → silently delete.
  - On resume, verify image URIs still exist on device. Missing ones are dropped; all missing → drop draft with toast.
  - Stale `analysisVersion` → re-run analysis silently before showing confirm.

### 5.3 Broadcast — silent UX, loud admin

The user never sees a broadcast failure. The admin always does.

| Scenario | User | Admin |
|---|---|---|
| Broker 2xx, some Twilio sends fail | Normal "sent" screen | Red dots in service timeline per failed send |
| Broker 4xx/5xx or network down | Normal "sent" screen | `broadcast_failed` event + alert in `/admin` alerts feed |
| Zero providers found across all professions | Normal "sent" screen | `zero_providers_found` alert |

The `/admin/requests/[id]` page has a **"שדר מחדש"** button that calls `POST /broadcast/retry`.

---

## 6. Phase plan

| # | Phase | Scope | Depends on | Effort |
|---|---|---|---|---|
| 1 | **Foundation** | Location hard-stop · AsyncStorage draft · city bounding-box helper · Firestore migration (new fields, subcollections, rules, indexes) | — | ~1 day |
| 2 | **Instrumentation** | Client + worker `eventLogger` · broadcast summary + per-send events · `timeToFirstResponse` · move review submission to worker `/review` with transaction · provider aggregate (O(1) running averages) | 1 | ~2 days |
| 3 | **Daily rollup** | Worker cron `handleDailyRollup` every 6h · writes `adminStats/daily-*` · backfills last 30 days on first run | 2 | ~0.5 day |
| 4 | **Admin UI** | `/admin/requests` + detail · `/admin/providers/[phone]` · overview graphs (`victory-native`) · urgency coloring · city filter · CSV export (requests + provider jobs) | 2, 3 | ~3 days |
| 5 | **Polish** | Real-data wiring on `/admin/funnel` · real-data on `/admin/revenue` · city-filter polish on `/admin/geo` · alerts feed reading from `adminAlerts/*` | 2, 3 | ~1 day |

**Total: ~7 working days.** Phases 1-3 sequential; Phases 4 + 5 parallel after 3.

## 7. Acceptance criteria

### Phase 1
- Fresh-install user cannot reach the Hub without granting location.
- Killing the app mid-capture + reopening within 24h surfaces the "המשך או התחל חדש?" banner.
- Zero references to `32.0853` / `34.7818` in codebase.
- Firestore rules deploy; admin reads succeed on new collections; non-admin writes to `providers/*` rejected.

### Phase 2
- One request writes exactly N events, where N = Gemini calls + uploads + 1 Firestore write + places searches + twilio sends + 1 first-response event.
- Error thrown inside `eventLogger.logEvent` does NOT propagate to user flow.
- Review submission updates 4 docs atomically; simulated mid-txn crash leaves 0 docs updated.
- `providers/{phone}.stats.avgRating` matches the running-average formula to 2 decimals.

### Phase 3
- `adminStats/daily-{today}` exists and refreshes every 6h.
- Cold `/admin` overview load fetches 30 or 90 docs only (verified via Firestore reads metric).

### Phase 4
- Admin requests table renders 10K mock rows < 2s with pagination.
- Per-request detail timeline shows all event types with correct colors.
- Provider detail: clicking a job row navigates to that request's detail.
- All 5 overview charts render on web AND mobile.
- City filter re-computes all 5 charts without extra Firestore query.
- CSV export produces a file with all filtered rows.

### Phase 5
- Funnel/Revenue/Geo pull from Firestore — no imports from `mockData.ts`.
- `mockData.ts` is deletable at end of Phase 5 (verified by grep).

## 8. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `victory-native` incompatible with Expo SDK 54 | Medium | Test in EAS dev build before commit. Fallback: `react-native-svg-charts`. |
| Firestore cost spikes from event writes | Low | 25 events × 100 requests/day × 30 days ≈ 75K writes/month ≈ $0.04. Monitor billing after launch. |
| Txn contention on `providers/{phone}` under load | Low | Firestore txns retry 5×. < 100 concurrent reviews/provider is a non-issue. |
| Stale AI analysis after 23h on resume | Low | Draft includes `analysisVersion`; mismatch triggers silent re-run. |
| Worker txn failures lose review data | Low | Client retains form state + Retry button until 2xx. |
| Existing requests lacking new fields | Certain | Admin treats new fields as nullable, shows "—". No backfill. |

## 9. Parked (post-v1)

- Admin push notifications (Slack/email/PWA push when a broadcast fully fails).
- Multi-admin with roles.
- Reverse-geocoded city derivation (replacing bounding boxes).

## 10. Out of scope

- Changes to the provider-facing dashboard.
- Changes to the WhatsApp provider flow (it stays exactly as-is).
- Changes to the web marketing site.
