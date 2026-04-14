# Pre-Launch Beta System — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform ai-fixly from a development prototype into a controlled beta product, geo-fenced to the Hadera/Caesarea/Netanya region, with provider identity protection, smart tiering, user monitoring, bug reporting, security hardening, and analytics funnel tracking.

**Architecture:** All changes are config-driven (geo-fence, tiering) or additive (new screens, new Firestore collections, new worker endpoints). No existing functionality is removed. The admin page is a hidden screen accessible only to the app owner.

**Tech Stack:** Existing stack (Expo, Firebase, Cloudflare Workers, Twilio). New: analytics funnel events, Firestore `waitlist` + `feedback` + `analytics_events` collections.

---

## 1. Provider Name Masking

### Rule
Take the first **2 meaningful words** of the business name. Strip suffixes (`בע"מ`, `LTD`, `בע״מ`, `|`, phone numbers, punctuation chains). If result ≤ 20 chars, use as-is. If longer, truncate at 20 + `…`.

### Examples
| Google Places name | Display name (before selection) |
|---|---|
| `יוסי אברהמי` | `יוסי אברהמי` |
| `קוסמי מחשבים \| תיקון מחשבים \| שירותי מחשוב` | `קוסמי מחשבים` |
| `א.ב שרברבות ואינסטלציה בע"מ` | `א.ב שרברבות` |
| `שרברב מקצועי` | `שרברב מקצועי` |
| `ELITE PLUMBING SOLUTIONS LTD` | `Elite Plumbing` |

### Implementation
- **Pure function:** `shortenProviderName(fullName: string): string`
- **Location:** `workers/broker/src/nameUtils.ts` (new file, TDD)
- **Called by:** `handleBroadcast` when creating bids — stores `displayName` alongside `providerName`
- **App change:** bid cards show `displayName`. After selection, show full `providerName` + phone.

### Data flow
```
Google Places → providerName (full) → shortenProviderName() → displayName (masked)
                                                              ↓
Bid card shows displayName                    Selected card shows providerName + phone
```

---

## 2. Smart Provider Tiering (3 Waves)

### Broadcast waves
| Wave | Trigger | Who gets it | Max providers |
|---|---|---|---|
| 1 | Immediate (t=0) | Top 3 by averageRating | 3 |
| 2 | t+15min if <2 bids | Next 3 by rating | 3 |
| 3 | t+30min if <2 bids | All remaining in radius | All |

### Sort order
Providers sorted by `averageRating` descending. New providers (no reviews) get default 3.0.

### Worker implementation
Wave 1 runs in `handleBroadcast` (synchronous). Waves 2-3 use **Cloudflare Worker cron** (runs every 5 minutes):

```
Cron: */5 * * * *

1. Query Firestore: requests WHERE status='open' AND nextWaveAt < now
2. For each: check bid count
3. If <2 bids: send next wave, update nextWaveAt
4. If >=2 bids OR wave 3 already sent: clear nextWaveAt (done)
```

### Request doc fields (new)
```typescript
{
  broadcastWave: 1 | 2 | 3,
  nextWaveAt: string | null,     // ISO timestamp for next wave
  totalProvidersSent: number,
}
```

### Test mode behavior
In TEST_PHONE mode, only Wave 1 fires (1 provider to test phone). Waves 2-3 are skipped.

---

## 3. Geo-Fence: Hadera Region Only

### Service zone
**Center:** Hadera (32.45, 34.92)
**Radius:** 20km

This covers: Caesarea, Or Akiva, Hadera, Pardes Hanna-Karkur, Binyamina, Emek Hefer (Kfar Yona, Kadima, Tzur Moshe, Tulkarm junction area), northern Netanya.

### Enforcement
1. **Profile setup** — after location is obtained, check distance from center. If > 20km → show "not in your area yet" screen instead of proceeding.
2. **Worker `/broadcast`** — secondary check: reject broadcasts where location is > 25km from center (safety margin).

### "Not in your area" screen (Wolt-style)
**Route:** `app/(auth)/out-of-area.tsx`

Visual design inspired by the Wolt screenshot:
- Illustration/icon at top (map with pin)
- Big Hebrew headline: "מצטערים, עדיין לא מגיעים לאזור שלך 😔"
- Explanation text: "אנחנו פעילים כרגע באזור חדרה, קיסריה, נתניה ועמק חפר. עובדים קשה כדי להגיע גם אליך!"
- Email input + "עדכנו אותי" button
- Footer: list of active areas

### Waitlist collection
```typescript
// Firestore: waitlist/{id}
{
  email: string,
  location: { lat, lng, address },
  createdAt: Timestamp,
  notified: boolean,  // set true when we expand to their area
}
```

### Config (not hardcoded)
```typescript
// src/constants/serviceZone.ts
export const SERVICE_ZONE = {
  center: { lat: 32.45, lng: 34.92 },
  radiusKm: 20,
  nameHe: 'חדרה, קיסריה, נתניה ועמק חפר',
  activeAreas: ['חדרה', 'קיסריה', 'אור עקיבא', 'נתניה', 'פרדס חנה-כרכור', 'בנימינה', 'עמק חפר'],
} as const;
```

---

## 4. Bug Reports — WhatsApp (critical only) + Firestore + Error Screens

### Three triggers
1. **Profile → "דווח על בעיה"** button (always accessible)
2. **Error screens** — every error state gets a "דווח על הבעיה 💬" button
3. **Critical errors only → WhatsApp to owner** (app crash, auth failure, Firestore permission-denied)

### Data collected
```typescript
// Firestore: feedback/{id}
{
  userId: string,
  userPhone: string,
  screen: string,
  errorMessage: string | null,
  freeText: string,
  platform: 'android' | 'ios' | 'web',
  appVersion: string,
  severity: 'critical' | 'bug' | 'suggestion',
  createdAt: Timestamp,
}
```

### Critical errors → WhatsApp
Only these trigger a WhatsApp to the owner's phone:
- `severity: 'critical'` (user-reported)
- Uncaught exceptions caught by ErrorBoundary
- Auth failures (sign-in loop, token expired)
- Firestore permission-denied errors

Regular feedback goes to Firestore only (no WhatsApp spam).

### Feedback form UI
```
┌────────────────────────────┐
│  דווח על בעיה               │
│                            │
│  מה קרה?                   │
│  ┌────────────────────┐    │
│  │                    │    │
│  └────────────────────┘    │
│                            │
│  חומרה:                    │
│  [🔴 קריטי] [🟡 באג] [💡 הצעה] │
│                            │
│  [       שלח דיווח        ] │
└────────────────────────────┘
```

---

## 5. Reviews — Add "Price Paid"

### Schema update
```typescript
interface Review {
  // ...existing fields (rating, categories, comment)
  pricePaid: number | null;  // NEW — user-reported final price
}
```

### UI addition
In the existing review screen, add between comment and submit:

```
כמה שילמת בסוף? (רשות)
┌─────────────┐
│         ש"ח │
└─────────────┘
```

Number input, optional. Stored for future price intelligence.

---

## 6. Admin Page

### Access
Hidden screen at `app/(dev)/admin.tsx`. Accessible via:
- Profile → "כלי פיתוח" → "לוח בקרה" (dev builds only)
- Direct URL on web: `/(dev)/admin`

### Sections

**a) Live Activity Feed**
Real-time list of recent events (last 24h):
```
10:32 — 🆕 בקשת שירות חדשה: אינסטלטור (חדרה)
10:35 — 💰 הצעה התקבלה: יוסי א. — 350 ש"ח
10:40 — ✅ לקוח בחר: יוסי א.
11:20 — ⭐ דירוג: 4 כוכבים, 350 ש"ח
14:00 — 🐛 דיווח באג: "המסך נתקע אחרי שליחה"
```

**b) Stats Cards**
```
[  12  ]  [  8  ]  [  5  ]  [  ⭐ 4.2  ]
requests   bids   selected  avg rating
```

**c) Feedback List**
All bug reports/suggestions with severity badges.

**d) Waitlist Count**
Number of emails collected from out-of-area users.

### Data source
Reads from existing Firestore collections: `serviceRequests`, `bids`, `reviews`, `feedback`, `waitlist`. No new data needed — just a read-only view.

---

## 7. Analytics Funnel — User Journey Tracking

### The funnel
```
app_opened
  → capture_started
    → capture_photo_added / capture_video_recorded
      → capture_submitted (sent to AI)
        → ai_analysis_completed
          → request_confirmed (sent to providers)
            → bid_received (at least one)
              → bid_selected (picked a provider)
                → chat_opened
                  → request_closed
                    → review_submitted
```

### Drop-off tracking
For each step, we track:
- `userId` — who
- `requestId` — which request (null for early steps)
- `timestamp` — when
- `metadata` — extra context (profession, bid count, etc.)

### Implementation
```typescript
// Already exists:
analyticsService.trackEvent('capture_started');
analyticsService.trackEvent('request_created', { requestId });

// NEW events to add:
analyticsService.trackEvent('capture_submitted');        // tap "שלח לניתוח"
analyticsService.trackEvent('request_confirmed');         // tap "שלח ומצא"
analyticsService.trackEvent('bid_received', { requestId, bidCount });
analyticsService.trackEvent('chat_opened', { requestId });
analyticsService.trackEvent('review_submitted', { requestId, rating });
analyticsService.trackEvent('geo_blocked', { lat, lng }); // tried from outside zone
analyticsService.trackEvent('waitlist_signup', { email }); // signed up for waitlist
analyticsService.trackEvent('feedback_submitted', { severity });
```

### Admin page integration
The admin page reads analytics from Firebase Analytics (already wired) and shows the funnel as a simple visualization.

### Session logging
For CTO-level debugging, log key actions to a Firestore `session_logs` collection:

```typescript
// Firestore: session_logs/{id}
{
  userId: string,
  sessionId: string,        // unique per app open
  action: string,           // 'photo_added', 'description_typed', 'submitted', 'abandoned'
  screen: string,
  metadata: Record<string, any>,
  createdAt: Timestamp,
}
```

This lets you see: "User X opened the app, started capture, added 2 photos, typed 15 chars of description, then ABANDONED at the confirm screen." — you know exactly where users drop off and why.

---

## 8. Security Hardening

### a) Worker endpoint authentication
Currently `/broadcast`, `/provider/selected`, `/chat/send` accept any request. Add Firebase Auth JWT verification:

```typescript
// workers/broker/src/middleware/authMiddleware.ts
async function verifyAuthToken(request: Request, env: Env): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  // Verify the JWT against Firebase's public keys
  // Return uid if valid, null if not
}
```

The app sends the user's Firebase ID token with every worker request. The worker verifies it before processing.

### b) Rate limiting
```
/broadcast:          max 3 per user per hour
/chat/send:          max 60 per user per hour
/review/submit:      max 1 per request per user
/feedback:           max 10 per user per day
```

Implemented via Cloudflare's built-in rate limiting (free tier covers this) or KV-based counters.

### c) Input validation
Every worker endpoint validates input with strict schema checks:
- Phone numbers: E.164 format only
- Text fields: max length (description: 1000 chars, comment: 500 chars)
- Numeric fields: within bounds (price: 1-100000, rating: 1-5)
- Media URLs: must be valid Supabase URLs

### d) Firestore rules audit
Current rules are dev-friendly. Tighten:
- `bids`: add read restriction (only request owner can read)
- `reviews`: prevent editing after creation (`allow update: if false`)
- `session_logs`: write-only, no read from client (`allow create: if request.auth != null; allow read: if false`)
- `waitlist`: write-only from client
- `feedback`: write-only from client

### e) Environment variable security
- Never log API keys or tokens
- Worker secrets are in Wrangler secrets (not vars)
- `.env` is in `.gitignore`
- No secrets in the web build output (checked at build time)

---

## 9. Test Cases

### Unit tests (TDD)

**nameUtils.ts — provider name shortening**
```
"יוסי אברהמי" → "יוסי אברהמי"
"קוסמי מחשבים | תיקון מחשבים" → "קוסמי מחשבים"
"א.ב שרברבות ואינסטלציה בע\"מ" → "א.ב שרברבות"
"" → "בעל מקצוע" (fallback)
"X" → "X" (single word)
"Very Long Business Name That Exceeds Twenty Chars" → "Very Long Business N…"
```

**serviceZone.ts — geo-fence check**
```
isInServiceZone(32.45, 34.92) → true  (Hadera center)
isInServiceZone(32.50, 34.89) → true  (Caesarea)
isInServiceZone(32.33, 34.86) → true  (Netanya)
isInServiceZone(32.08, 34.78) → false (Tel Aviv)
isInServiceZone(32.80, 35.00) → false (Haifa)
isInServiceZone(31.25, 34.79) → false (Beer Sheva)
```

**tiering.ts — wave assignment**
```
assignWave(providers=[5 items], existingBidCount=0) → Wave 1: first 3
assignWave(providers=[5 items], existingBidCount=1) → Wave 2: next 3
assignWave(providers=[5 items], existingBidCount=3) → skip (enough bids)
```

### Screen render tests
- Out-of-area screen renders with zone info
- Feedback form renders with severity options
- Admin page renders with empty data
- Admin page renders with mock data
- Review screen shows price input field

### Integration tests (manual via wrangler tail)
- Create request from inside zone → broadcasts normally
- Create request from outside zone → shows Wolt-style screen, collects email
- Submit feedback with severity=critical → WhatsApp sent to owner
- Submit feedback with severity=bug → Firestore only, no WhatsApp
- Wave 1 sends 3 providers → wait 15 min → Wave 2 sends next 3
- Provider with 4.8 rating gets Wave 1; provider with 3.0 gets Wave 2

---

## 10. Files to Create

| File | Purpose |
|---|---|
| `workers/broker/src/nameUtils.ts` | `shortenProviderName()` pure function |
| `workers/broker/src/nameUtils.test.ts` | TDD tests |
| `src/constants/serviceZone.ts` | Geo-fence config (center, radius, area names) |
| `src/utils/geoFence.ts` | `isInServiceZone(lat, lng)` pure function |
| `src/utils/geoFence.test.ts` | TDD tests |
| `app/(auth)/out-of-area.tsx` | Wolt-style "not here yet" screen |
| `app/(dev)/admin.tsx` | Admin dashboard (read-only) |
| `src/components/ui/FeedbackModal.tsx` | Bug report form |
| `src/services/feedback/types.ts` | Feedback interface |
| `src/services/feedback/firebaseFeedback.ts` | Feedback CRUD |
| `src/services/feedback/index.ts` | Barrel export |
| `src/services/analytics/sessionLogger.ts` | Session action logging |
| `workers/broker/src/tiering.ts` | Wave assignment logic |
| `workers/broker/src/tiering.test.ts` | TDD tests |

## 11. Files to Modify

| File | Change |
|---|---|
| `workers/broker/src/index.ts` | Add tiering to broadcast, add wave cron, add feedback WhatsApp |
| `workers/broker/wrangler.toml` | Add cron trigger `*/5 * * * *` |
| `app/(auth)/profile-setup.tsx` | Add geo-fence check after location |
| `app/_layout.tsx` | Add out-of-area + admin routes to Stack |
| `app/(tabs)/profile.tsx` | Add "דווח על בעיה" + "לוח בקרה" buttons |
| `app/request/[id].tsx` | Show `displayName` on bid cards, full name after selection |
| `app/review/[requestId].tsx` | Add price paid input |
| `src/components/ui/ErrorBoundary.tsx` | Add "דווח" button + critical WhatsApp trigger |
| `firebase/firestore.rules` | Add waitlist, feedback, session_logs rules |
