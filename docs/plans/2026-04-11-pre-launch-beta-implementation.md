# Pre-Launch Beta System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the prototype into a controlled beta: geo-fenced to Hadera region, provider names masked, 3-wave tiering, bug reporting, session analytics, admin dashboard, price in reviews, and security hardening.

**Architecture:** Pure functions (name masking, geo-fence, tiering) are TDD'd with full test coverage. Screens are additive. Worker changes are config-driven. Admin page reads existing Firestore data. Analytics events are fire-and-forget.

**Tech Stack:** Expo SDK 54, Cloudflare Workers, Firebase Firestore, Twilio (critical alerts only), Jest + node:test.

---

### Task 1: Provider Name Masking (TDD)

**Files:**
- Create: `workers/broker/src/nameUtils.ts`
- Create: `workers/broker/src/nameUtils.test.ts`
- Modify: `workers/broker/src/index.ts` — add `displayName` to bid creation
- Modify: `app/request/[id].tsx` — show `displayName` on bid cards, full name after selection

**Step 1: Write failing tests**

```typescript
// workers/broker/src/nameUtils.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shortenProviderName } from './nameUtils';

test('regular two-word name passes through', () => {
  assert.equal(shortenProviderName('יוסי אברהמי'), 'יוסי אברהמי');
});
test('long pipe-separated name takes first 2 words', () => {
  assert.equal(shortenProviderName('קוסמי מחשבים | תיקון מחשבים | שירותי מחשוב'), 'קוסמי מחשבים');
});
test('strips בע"מ suffix', () => {
  assert.equal(shortenProviderName('א.ב שרברבות ואינסטלציה בע"מ'), 'א.ב שרברבות');
});
test('strips בע״מ suffix (Hebrew quotes)', () => {
  assert.equal(shortenProviderName('שיפוצי הצפון בע״מ'), 'שיפוצי הצפון');
});
test('strips LTD suffix', () => {
  assert.equal(shortenProviderName('ELITE PLUMBING SOLUTIONS LTD'), 'Elite Plumbing');
});
test('already short name passes through', () => {
  assert.equal(shortenProviderName('שרברב מקצועי'), 'שרברב מקצועי');
});
test('single word passes through', () => {
  assert.equal(shortenProviderName('יוסי'), 'יוסי');
});
test('empty string returns fallback', () => {
  assert.equal(shortenProviderName(''), 'בעל מקצוע');
});
test('truncates at 20 chars', () => {
  const result = shortenProviderName('Very Long Business Name Corporation');
  assert.ok(result.length <= 21); // 20 + possible …
});
test('strips phone numbers from name', () => {
  assert.equal(shortenProviderName('יוסי שרברב 054-1234567'), 'יוסי שרברב');
});
```

**Step 2:** Run `cd workers/broker && npm test` — expect FAIL (module not found)

**Step 3: Implement**

```typescript
// workers/broker/src/nameUtils.ts
const STRIP_PATTERNS = [
  /\s*\|.*/,                    // everything after first |
  /\s*בע"מ\s*/gi,              // בע"מ
  /\s*בע״מ\s*/gi,              // בע״מ (Hebrew quotes)
  /\s*LTD\.?\s*/gi,            // LTD
  /\s*\d{2,}-?\d{3,}-?\d{3,}/, // phone numbers
  /\s*-\s*$/,                  // trailing dash
];

export function shortenProviderName(fullName: string): string {
  if (!fullName || fullName.trim().length === 0) return 'בעל מקצוע';

  let cleaned = fullName.trim();
  for (const pattern of STRIP_PATTERNS) {
    cleaned = cleaned.replace(pattern, '').trim();
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  const short = words.slice(0, 2).join(' ');

  if (short.length > 20) {
    return short.slice(0, 20) + '…';
  }

  return short || 'בעל מקצוע';
}
```

**Step 4:** Run tests — expect PASS

**Step 5:** Wire into worker — in `handleBroadcast`, when creating bids, add:
```typescript
import { shortenProviderName } from './nameUtils';
// In createBid data:
displayName: shortenProviderName(provider.name),
```

Wire into app — in `app/request/[id].tsx`, bid cards show `bid.displayName || bid.providerName`. Selected provider card shows full `bid.providerName`.

---

### Task 2: Geo-Fence (TDD)

**Files:**
- Create: `src/constants/serviceZone.ts`
- Create: `src/utils/geoFence.ts`
- Create: `src/utils/geoFence.test.ts`
- Create: `app/(auth)/out-of-area.tsx`
- Modify: `app/(auth)/profile-setup.tsx` — check zone after location
- Modify: `app/_layout.tsx` — add route
- Modify: `firebase/firestore.rules` — add waitlist collection

**Step 1: Write failing tests**

```typescript
// src/utils/geoFence.test.ts
import { isInServiceZone } from './geoFence';

describe('isInServiceZone', () => {
  test('Hadera center is in zone', () => {
    expect(isInServiceZone(32.45, 34.92)).toBe(true);
  });
  test('Caesarea is in zone', () => {
    expect(isInServiceZone(32.50, 34.89)).toBe(true);
  });
  test('Or Akiva is in zone', () => {
    expect(isInServiceZone(32.51, 34.92)).toBe(true);
  });
  test('Netanya (north) is in zone', () => {
    expect(isInServiceZone(32.33, 34.86)).toBe(true);
  });
  test('Pardes Hanna is in zone', () => {
    expect(isInServiceZone(32.47, 34.97)).toBe(true);
  });
  test('Tel Aviv is NOT in zone', () => {
    expect(isInServiceZone(32.08, 34.78)).toBe(false);
  });
  test('Haifa is NOT in zone', () => {
    expect(isInServiceZone(32.80, 35.00)).toBe(false);
  });
  test('Jerusalem is NOT in zone', () => {
    expect(isInServiceZone(31.77, 35.23)).toBe(false);
  });
  test('Beer Sheva is NOT in zone', () => {
    expect(isInServiceZone(31.25, 34.79)).toBe(false);
  });
});
```

**Step 2:** Run `npx jest src/utils/geoFence.test.ts` — FAIL

**Step 3: Implement**

```typescript
// src/constants/serviceZone.ts
export const SERVICE_ZONE = {
  center: { lat: 32.45, lng: 34.92 },
  radiusKm: 20,
  nameHe: 'חדרה, קיסריה, נתניה ועמק חפר',
  activeAreas: ['חדרה', 'קיסריה', 'אור עקיבא', 'נתניה', 'פרדס חנה-כרכור', 'בנימינה', 'עמק חפר'],
} as const;

// src/utils/geoFence.ts
import { SERVICE_ZONE } from '../constants/serviceZone';

export function isInServiceZone(lat: number, lng: number): boolean {
  const R = 6371; // Earth radius km
  const dLat = (lat - SERVICE_ZONE.center.lat) * Math.PI / 180;
  const dLng = (lng - SERVICE_ZONE.center.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(SERVICE_ZONE.center.lat * Math.PI/180) *
    Math.cos(lat * Math.PI/180) *
    Math.sin(dLng/2)**2;
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return dist <= SERVICE_ZONE.radiusKm;
}
```

**Step 4:** Tests PASS

**Step 5:** Create `app/(auth)/out-of-area.tsx` — Wolt-style screen with illustration placeholder, headline, email input, waitlist submit, active areas footer.

**Step 6:** In `app/(auth)/profile-setup.tsx`, after location is obtained: `if (!isInServiceZone(lat, lng)) { router.replace('/(auth)/out-of-area'); return; }`

**Step 7:** Add `waitlist` to Firestore rules: `allow create: if request.auth != null`

---

### Task 3: Feedback System

**Files:**
- Create: `src/services/feedback/types.ts`
- Create: `src/services/feedback/firebaseFeedback.ts`
- Create: `src/services/feedback/index.ts`
- Create: `src/components/ui/FeedbackModal.tsx`
- Modify: `app/(tabs)/profile.tsx` — add "דווח על בעיה" button
- Modify: `src/components/ui/ErrorBoundary.tsx` — add report button on errors
- Modify: `firebase/firestore.rules` — add feedback collection

**Implementation:** Feedback modal with text input + severity selector (critical/bug/suggestion). Critical severity triggers WhatsApp to owner via worker. All feedback saved to Firestore `feedback` collection.

Worker endpoint: `POST /feedback` — receives feedback, saves to Firestore, sends WhatsApp if critical.

---

### Task 4: Session Analytics Logger

**Files:**
- Create: `src/services/analytics/sessionLogger.ts`
- Modify: `app/capture/index.tsx` — add funnel events
- Modify: `app/capture/confirm.tsx` — add funnel events
- Modify: `app/request/[id].tsx` — add funnel events
- Modify: `app/chat/[requestId].tsx` — add funnel events
- Modify: `firebase/firestore.rules` — add session_logs collection

**Implementation:**

```typescript
// src/services/analytics/sessionLogger.ts
import { getFirestore, collection, doc, setDoc, serverTimestamp } from '../firestore/imports';

let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return sessionId;
}

export function logAction(action: string, screen: string, metadata?: Record<string, any>): void {
  try {
    const db = getFirestore();
    const docRef = doc(collection(db, 'session_logs'));
    setDoc(docRef, {
      sessionId: getSessionId(),
      action,
      screen,
      metadata: metadata || {},
      createdAt: serverTimestamp(),
    }).catch(() => {}); // fire-and-forget
  } catch {
    // never block UI
  }
}
```

Add calls at key funnel points: `capture_started`, `photo_added`, `video_recorded`, `description_typed`, `submitted_to_ai`, `confirmed_and_sent`, `bid_viewed`, `bid_selected`, `chat_opened`, `chat_message_sent`, `request_closed`, `review_submitted`, `abandoned_capture`, `abandoned_confirm`.

---

### Task 5: Reviews — Add Price Paid

**Files:**
- Modify: `src/services/reviews/types.ts` — add `pricePaid: number | null`
- Modify: `src/services/reviews/firebaseReviews.ts` — include in submitReview
- Modify: `app/review/[requestId].tsx` — add price input field

**Implementation:** Add a `TextInput` with `keyboardType="numeric"` between the comment field and the submit button. Label: "כמה שילמת בסוף? (רשות)". Store as `pricePaid: number | null`.

---

### Task 6: 3-Wave Provider Tiering

**Files:**
- Create: `workers/broker/src/tiering.ts`
- Create: `workers/broker/src/tiering.test.ts`
- Modify: `workers/broker/src/index.ts` — use tiering in broadcast + add cron handler
- Modify: `workers/broker/wrangler.toml` — add cron trigger

**Step 1: TDD tests**

```typescript
// workers/broker/src/tiering.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignWave, getProvidersForWave } from './tiering';

test('wave 1 returns first 3 providers', () => {
  const providers = [{r:4.9},{r:4.5},{r:4.2},{r:3.8},{r:3.5}];
  const result = getProvidersForWave(providers as any, 1);
  assert.equal(result.length, 3);
});
test('wave 2 returns next 3 providers', () => {
  const providers = [{r:4.9},{r:4.5},{r:4.2},{r:3.8},{r:3.5},{r:3.0}];
  const result = getProvidersForWave(providers as any, 2);
  assert.equal(result.length, 3);
  assert.equal(result[0].r, 3.8); // 4th provider
});
test('wave 3 returns all remaining', () => {
  const providers = [{r:4.9},{r:4.5},{r:4.2},{r:3.8},{r:3.5},{r:3.0},{r:2.5}];
  const result = getProvidersForWave(providers as any, 3);
  assert.equal(result.length, 1); // 7th provider only
});
test('shouldSendNextWave: true when <2 bids', () => {
  assert.equal(assignWave(1, 0), true);  // wave 2 needed
  assert.equal(assignWave(1, 1), true);  // still <2
});
test('shouldSendNextWave: false when >=2 bids', () => {
  assert.equal(assignWave(1, 2), false); // enough bids
  assert.equal(assignWave(2, 3), false);
});
```

**Step 2: Implement**

```typescript
// workers/broker/src/tiering.ts
const WAVE_SIZE = 3;
const MIN_BIDS_TO_STOP = 2;

export function getProvidersForWave<T>(sortedProviders: T[], wave: 1|2|3): T[] {
  const start = (wave - 1) * WAVE_SIZE;
  if (wave === 3) return sortedProviders.slice(start); // all remaining
  return sortedProviders.slice(start, start + WAVE_SIZE);
}

export function shouldSendNextWave(currentBidCount: number): boolean {
  return currentBidCount < MIN_BIDS_TO_STOP;
}
```

**Step 3:** Wire into worker:
- `handleBroadcast`: sort providers by rating, take Wave 1 only, set `nextWaveAt = now + 15min` on request doc
- Add cron handler: query requests with `nextWaveAt < now`, check bid count, send next wave or clear

**Step 4:** Add to `wrangler.toml`:
```toml
[triggers]
crons = ["*/5 * * * *"]
```

---

### Task 7: Admin Dashboard

**Files:**
- Create: `app/(dev)/admin.tsx`
- Modify: `app/(tabs)/profile.tsx` — add "לוח בקרה" button

**Implementation:** Read-only screen that queries:
- `serviceRequests` (recent, ordered by createdAt desc, limit 20)
- `bids` (count)
- `reviews` (recent + average rating)
- `feedback` (recent, severity badges)
- `waitlist` (count)

Display as:
1. Stats cards at top (requests count, bids, selections, avg rating)
2. Activity feed (recent events, chronological)
3. Feedback list with severity colors
4. Waitlist count

No new Firestore indexes needed — reads use simple queries within existing indexes.

---

### Task 8: Security Hardening + Firestore Rules

**Files:**
- Modify: `firebase/firestore.rules` — tighten all rules
- Modify: `workers/broker/src/index.ts` — add input validation
- Modify: `src/services/broadcast/broadcastService.ts` — send auth token with requests

**Step 1: Firestore rules**

```
// Tightened rules:
reviews:     allow create only, no update/delete
session_logs: allow create only, no read from client
waitlist:    allow create only
feedback:    allow create only
bids:        allow read only by request owner (via get() on parent request)
```

**Step 2: Worker input validation**

Add to each endpoint: check required fields exist, validate types, enforce max lengths:
- description: max 1000 chars
- comment: max 500 chars
- rating: 1-5 integer
- price: 1-100000 or null
- phone: E.164 regex
- email: basic email regex

**Step 3: Auth token forwarding**

In `broadcastService.ts`, add Firebase ID token to the Authorization header:
```typescript
import { getAuth } from '../firestore/imports';
const token = await getAuth().currentUser?.getIdToken();
headers: { 'Authorization': `Bearer ${token}`, ... }
```

Worker verifies the token against Firebase's public keys (or uses a simple shared-secret for MVP).

---

## Execution Order

| Order | Task | Depends on | Effort |
|---|---|---|---|
| 1 | Name masking (TDD) | Nothing | 30 min |
| 2 | Geo-fence (TDD) | Nothing | 45 min |
| 3 | Feedback system | Nothing | 45 min |
| 4 | Session logger | Nothing | 30 min |
| 5 | Price in reviews | Task from earlier session | 15 min |
| 6 | 3-wave tiering (TDD) | Nothing | 1 hour |
| 7 | Admin dashboard | Tasks 3-5 (reads their data) | 1 hour |
| 8 | Security hardening | All above | 30 min |

Tasks 1-5 are fully independent and can be dispatched in parallel.

**Total: ~5 hours of implementation.**
