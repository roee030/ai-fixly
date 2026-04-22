# Admin Dashboard + Foundation Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the admin dashboard to real Firestore data, add per-request + per-provider detail pages with full service timelines, close the customer review loop (cost + rating) into both request and provider records, and ship three foundation fixes (location hard-stop, draft save, silent-broadcast UX).

**Architecture:** Hybrid data model — main `requests` doc holds summaries for fast list queries; new `events/` subcollection holds the detailed per-call timeline (90-day TTL); new `providers/{phone}` aggregate doc with `jobs/` subcollection powers the provider drill-down; `adminStats/daily-*` pre-rolled docs power overview graphs. Review submission moves to the Cloudflare Worker with an atomic transaction. Instrumentation uses a thin `eventLogger` service, fire-and-forget on both client and worker.

**Tech Stack:** Expo SDK 54 · TypeScript · Firebase (Firestore + Auth) · Cloudflare Workers · Twilio · Google Places · `victory-native` (new) · AsyncStorage · Zustand · Zod

**Design doc:** [2026-04-22-admin-and-foundation-design.md](./2026-04-22-admin-and-foundation-design.md) — read this first.

---

## Pre-flight

**Step 1:** Verify you're on the worktree branch.
```bash
git rev-parse --abbrev-ref HEAD
# Expected: claude/agitated-zhukovsky-10d815 (or the current worktree branch)
```

**Step 2:** Confirm working tree is clean.
```bash
git status
# Expected: "nothing to commit, working tree clean"
```

**Step 3:** Pull latest from `main` into this worktree.
```bash
git fetch origin main
git merge origin/main --ff-only
# If non-ff, stop and ask the user.
```

---

# Phase 1 — Foundation (~1 day)

## Task 1.1: Add types for new Firestore shapes

**Files:**
- Create: `src/types/observability.ts`
- Create: `src/types/providerAggregate.ts`
- Create: `src/types/adminStats.ts`
- Modify: `src/types/serviceRequest.ts`
- Modify: `src/types/index.ts`

**Step 1: Create `src/types/observability.ts`**

```typescript
import type { Timestamp } from '@react-native-firebase/firestore';

export type RequestEventType =
  | 'gemini'
  | 'upload_image'
  | 'upload_video'
  | 'firestore_write'
  | 'places_search'
  | 'twilio_send'
  | 'push_notify'
  | 'first_response'
  | 'review_submitted'
  | 'broadcast_failed';

export interface RequestEvent {
  id: string;
  type: RequestEventType;
  ok: boolean;
  startedAt: Timestamp | Date;
  durationMs: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface BroadcastSummary {
  sentCount: number;
  failedCount: number;
  providersFound: number;
  startedAt: Timestamp | Date;
  finishedAt?: Timestamp | Date;
}

export interface ServiceSummary {
  geminiMs: number;
  uploadMs: number;
  firestoreWriteMs: number;
  totalMs: number;
  hadError: boolean;
}

export interface LocationSummary {
  city: string;    // one of ~15 Israeli metros (hadera, netanya, tlv, ...)
  region: string;  // 'center' | 'north' | 'south' | 'sharon' | ...
}

export interface ReviewSummary {
  rating: number;
  comment: string;
  pricePaid: number;
  submittedAt: Timestamp | Date;
}
```

**Step 2: Create `src/types/providerAggregate.ts`**

```typescript
import type { Timestamp } from '@react-native-firebase/firestore';

export interface ProviderAggregateStats {
  offersSent: number;
  accepted: number;
  completed: number;
  avgRating: number;        // 0-5
  avgPricePaid: number;     // ILS
  totalGrossValue: number;  // ILS sum
  replyRate: number;        // 0-100 percent
  avgResponseMinutes: number;
  lastJobAt?: Timestamp | Date;
}

export interface ProviderAggregate {
  phone: string;
  displayName: string;
  profession: string;
  city: string;
  stats: ProviderAggregateStats;
  updatedAt: Timestamp | Date;
}

export interface ProviderJobRecord {
  requestId: string;
  bidPrice: number;
  pricePaid?: number;
  rating?: number;
  comment?: string;
  customerReviewedAt?: Timestamp | Date;
  status: 'selected' | 'completed' | 'lost';
  completedAt?: Timestamp | Date;
}
```

**Step 3: Create `src/types/adminStats.ts`**

```typescript
export interface DailyCityStats {
  requestsCreated: number;
  reviewsSubmitted: number;
  avgTimeToFirstResponseMin: number;
  avgRating: number;
  grossValue: number;
}

export interface AdminDailyStats {
  date: string;  // 'YYYY-MM-DD'
  requestsCreated: number;
  reviewsSubmitted: number;
  avgTimeToFirstResponseMin: number;
  avgRating: number;
  grossValue: number;
  byCity: Record<string, DailyCityStats>;
}
```

**Step 4: Extend `src/types/serviceRequest.ts`**

Add the new optional fields right after `completedAt`:

```typescript
import type {
  BroadcastSummary, ServiceSummary, LocationSummary, ReviewSummary,
} from './observability';

export interface ServiceRequest {
  // ... existing fields
  completedAt?: Date;

  // New (all optional — old requests lack them)
  locationSummary?: LocationSummary;
  broadcastSummary?: BroadcastSummary;
  serviceSummary?: ServiceSummary;
  timeToFirstResponse?: number;  // minutes
  selectedBidPrice?: number;
  reviewSummary?: ReviewSummary;
}
```

**Step 5: Re-export from `src/types/index.ts`**

```typescript
export * from './observability';
export * from './providerAggregate';
export * from './adminStats';
```

**Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
# Expected: no new errors
```

**Step 7: Commit**

```bash
git add src/types/
git commit -m "feat(types): add observability, provider-aggregate, admin-stats types"
```

---

## Task 1.2: City bounding-box helper + test

**Files:**
- Create: `src/constants/cities.ts`
- Create: `src/utils/resolveCity.ts`
- Create: `src/utils/resolveCity.test.ts`

**Step 1: Write the failing test**

```typescript
// src/utils/resolveCity.test.ts
import { resolveCity } from './resolveCity';

describe('resolveCity', () => {
  it('returns hadera for Hadera center coordinates', () => {
    // 32.4384, 34.9196 is Hadera city center
    expect(resolveCity(32.4384, 34.9196)).toEqual({ city: 'hadera', region: 'sharon' });
  });

  it('returns netanya for Netanya center', () => {
    expect(resolveCity(32.3329, 34.8599)).toEqual({ city: 'netanya', region: 'sharon' });
  });

  it('returns tlv for Tel Aviv center', () => {
    expect(resolveCity(32.0853, 34.7818)).toEqual({ city: 'tlv', region: 'center' });
  });

  it('returns unknown for coordinates outside all boxes', () => {
    expect(resolveCity(0, 0)).toEqual({ city: 'unknown', region: 'unknown' });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx jest src/utils/resolveCity.test.ts
# Expected: FAIL — module not found
```

**Step 3: Create `src/constants/cities.ts`**

```typescript
import type { LocationSummary } from '../types';

export interface CityBox {
  city: string;
  region: string;
  minLat: number; maxLat: number;
  minLng: number; maxLng: number;
}

// Rough bounding boxes for Israeli metros we care about.
// Refined against Google Maps — good enough for admin filtering.
export const CITY_BOXES: CityBox[] = [
  { city: 'hadera',      region: 'sharon',  minLat: 32.40, maxLat: 32.48, minLng: 34.88, maxLng: 34.96 },
  { city: 'netanya',     region: 'sharon',  minLat: 32.28, maxLat: 32.38, minLng: 34.83, maxLng: 34.90 },
  { city: 'kfar_saba',   region: 'sharon',  minLat: 32.16, maxLat: 32.22, minLng: 34.88, maxLng: 34.95 },
  { city: 'raanana',     region: 'sharon',  minLat: 32.17, maxLat: 32.20, minLng: 34.85, maxLng: 34.89 },
  { city: 'herzliya',    region: 'sharon',  minLat: 32.14, maxLat: 32.20, minLng: 34.78, maxLng: 34.85 },
  { city: 'tlv',         region: 'center',  minLat: 32.03, maxLat: 32.13, minLng: 34.74, maxLng: 34.82 },
  { city: 'ramat_gan',   region: 'center',  minLat: 32.05, maxLat: 32.10, minLng: 34.81, maxLng: 34.86 },
  { city: 'petah_tikva', region: 'center',  minLat: 32.06, maxLat: 32.11, minLng: 34.85, maxLng: 34.92 },
  { city: 'rishon',      region: 'center',  minLat: 31.95, maxLat: 32.02, minLng: 34.76, maxLng: 34.83 },
  { city: 'bat_yam',     region: 'center',  minLat: 32.00, maxLat: 32.04, minLng: 34.73, maxLng: 34.77 },
  { city: 'haifa',       region: 'north',   minLat: 32.76, maxLat: 32.84, minLng: 34.97, maxLng: 35.04 },
  { city: 'jerusalem',   region: 'center',  minLat: 31.73, maxLat: 31.83, minLng: 35.17, maxLng: 35.25 },
  { city: 'beer_sheva',  region: 'south',   minLat: 31.22, maxLat: 31.28, minLng: 34.77, maxLng: 34.83 },
  { city: 'ashdod',      region: 'south',   minLat: 31.78, maxLat: 31.83, minLng: 34.63, maxLng: 34.68 },
  { city: 'ashkelon',    region: 'south',   minLat: 31.65, maxLat: 31.70, minLng: 34.55, maxLng: 34.60 },
];

export const UNKNOWN_CITY: LocationSummary = { city: 'unknown', region: 'unknown' };
```

**Step 4: Create `src/utils/resolveCity.ts`**

```typescript
import { CITY_BOXES, UNKNOWN_CITY } from '../constants/cities';
import type { LocationSummary } from '../types';

export function resolveCity(lat: number, lng: number): LocationSummary {
  for (const box of CITY_BOXES) {
    if (lat >= box.minLat && lat <= box.maxLat
        && lng >= box.minLng && lng <= box.maxLng) {
      return { city: box.city, region: box.region };
    }
  }
  return UNKNOWN_CITY;
}
```

**Step 5: Run test to verify it passes**

```bash
npx jest src/utils/resolveCity.test.ts
# Expected: PASS (4 tests)
```

**Step 6: Commit**

```bash
git add src/constants/cities.ts src/utils/resolveCity.ts src/utils/resolveCity.test.ts
git commit -m "feat(cities): bounding-box helper for admin location filtering"
```

---

## Task 1.3: Location hard-stop on onboarding

**Files:**
- Read first: `app/(auth)/permissions.tsx` — understand current flow.
- Modify: `app/(auth)/permissions.tsx`
- Modify: `app/_layout.tsx` — re-check on app resume (likely already partial).

**Step 1: Read the current permissions screen.**

```bash
# Open app/(auth)/permissions.tsx and read start to end.
# Identify where the "grant location" CTA lives and where it navigates on grant.
```

**Step 2: Add the Hebrew denial message constant.**

Add to `src/i18n/locales/he.ts` under `onboarding`:
```typescript
locationRequired: {
  title: 'צריכים את המיקום שלך',
  body: 'אנחנו חייבים מיקום כדי למצוא לך את בעל המקצוע הכי קרוב ומהיר',
  openSettings: 'פתח הגדרות',
  tryAgain: 'נסה שוב',
},
```

Translate the three strings to en/ar/ru in their respective files (keep keys identical).

**Step 3: Modify `app/(auth)/permissions.tsx`** so:
- The "Skip" option is removed entirely.
- On `Location.getForegroundPermissionsAsync()` returning `denied` or `undetermined`, show a blocking view with the Hebrew message from step 2 + two buttons (`openSettings`, `tryAgain`). No progression.
- On `granted`, `getCurrentPositionAsync()` + call `resolveCity(lat, lng)` + write:
  ```typescript
  await firestore().collection('users').doc(uid).set({
    location: { lat, lng, address },
    locationSummary: resolveCity(lat, lng),
  }, { merge: true });
  ```
- Then navigate to the next onboarding step as today.

**Step 4: Add resume-check hook**

Create `src/hooks/useLocationGuard.ts`:

```typescript
import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';

export function useLocationGuard() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        router.replace('/(auth)/permissions');
      }
    });
    return () => sub.remove();
  }, []);
}
```

Call `useLocationGuard()` from `app/(tabs)/_layout.tsx` so it guards the entire Hub.

**Step 5: Delete the Tel Aviv fallback in `app/capture/confirm.tsx`**

In `handleConfirmAndSend`, replace the current block:

```typescript
let location = { lat: 32.0853, lng: 34.7818, address: 'Tel Aviv, Israel' };
try { ... } catch { ... }
```

with:

```typescript
const db = getFirestore();
const userDoc = await getDoc(doc(db, 'users', user.uid));
const userData = userDoc.data?.() || {};
if (!userData.location?.lat || !userData.location?.lng) {
  Alert.alert(
    'לא מצאנו את המיקום שלך',
    'רענן את הרשאות המיקום בהגדרות ונסה שוב',
  );
  setIsSending(false);
  return;
}
const location = userData.location;
```

**Step 6: Verify zero references to the TLV default remain**

```bash
npx grep -rn "32.0853" src/ app/
npx grep -rn "34.7818" src/ app/
# Expected: zero matches (or only in resolveCity tests)
```

**Step 7: Commit**

```bash
git add app/ src/hooks/useLocationGuard.ts src/i18n/
git commit -m "feat(location): hard-stop onboarding, delete TLV fallback"
```

---

## Task 1.4: AsyncStorage draft service + test

**Files:**
- Create: `src/services/drafts/draftService.ts`
- Create: `src/services/drafts/draftService.test.ts`
- Create: `src/services/drafts/index.ts`

**Step 1: Write the failing test**

```typescript
// src/services/drafts/draftService.test.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { draftService } from './draftService';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('draftService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('saves a draft under the correct key', async () => {
    await draftService.save('user-1', {
      description: 'hi',
      imageUris: [], videoAssets: [],
      analysis: null, chosenProfessions: [],
      analysisVersion: 'v1',
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'draft:request:user-1',
      expect.stringContaining('"description":"hi"'),
    );
  });

  it('returns null when no draft exists', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    expect(await draftService.load('user-1')).toBeNull();
  });

  it('returns null and deletes when draft is older than 24h', async () => {
    const stale = { createdAt: new Date(Date.now() - 25 * 3600_000).toISOString(), description: '' };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(stale));
    expect(await draftService.load('user-1')).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('draft:request:user-1');
  });

  it('returns a fresh draft unchanged', async () => {
    const fresh = { createdAt: new Date().toISOString(), description: 'x' };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(fresh));
    expect(await draftService.load('user-1')).toEqual(fresh);
  });
});
```

**Step 2: Run test to verify it fails.**

```bash
npx jest src/services/drafts/draftService.test.ts
# Expected: FAIL
```

**Step 3: Implement `draftService.ts`**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export interface RequestDraft {
  createdAt: string;  // ISO
  imageUris: string[];
  videoAssets: { uri: string; thumbnailUri?: string }[];
  description: string;
  analysis: unknown | null;
  chosenProfessions: string[];
  analysisKey?: string;
  analysisVersion: string;
}

function key(userId: string) { return `draft:request:${userId}`; }

export const draftService = {
  async save(userId: string, data: Omit<RequestDraft, 'createdAt'>): Promise<void> {
    const draft: RequestDraft = { ...data, createdAt: new Date().toISOString() };
    await AsyncStorage.setItem(key(userId), JSON.stringify(draft));
  },

  async load(userId: string): Promise<RequestDraft | null> {
    const raw = await AsyncStorage.getItem(key(userId));
    if (!raw) return null;
    try {
      const draft = JSON.parse(raw) as RequestDraft;
      const age = Date.now() - new Date(draft.createdAt).getTime();
      if (age > DRAFT_TTL_MS) {
        await AsyncStorage.removeItem(key(userId));
        return null;
      }
      return draft;
    } catch {
      await AsyncStorage.removeItem(key(userId));
      return null;
    }
  },

  async delete(userId: string): Promise<void> {
    await AsyncStorage.removeItem(key(userId));
  },
};
```

**Step 4: Create `src/services/drafts/index.ts`**

```typescript
export { draftService } from './draftService';
export type { RequestDraft } from './draftService';
```

**Step 5: Run test to verify it passes**

```bash
npx jest src/services/drafts/draftService.test.ts
# Expected: PASS (4 tests)
```

**Step 6: Commit**

```bash
git add src/services/drafts/
git commit -m "feat(drafts): AsyncStorage draft service with 24h TTL"
```

---

## Task 1.5: Wire draft into capture/confirm flow

**Files:**
- Modify: `app/capture/confirm.tsx`
- Modify: `app/(tabs)/index.tsx` — add "resume draft" banner.
- Create: `src/components/ui/ResumeDraftBanner.tsx`

**Step 1: Write draft BEFORE the first upload.**

In `app/capture/confirm.tsx`, inside `handleConfirmAndSend`, right after analysis is confirmed but BEFORE `mediaService.uploadImage`:

```typescript
await draftService.save(user.uid, {
  imageUris,
  videoAssets,
  description,
  analysis: finalAnalysis,
  chosenProfessions,
  analysisKey,
  analysisVersion: 'v1',
});
```

**Step 2: Delete draft after `createRequest` success.**

After `await requestService.updateStatus(request.id, REQUEST_STATUS.OPEN);`:

```typescript
await draftService.delete(user.uid);
```

**Step 3: Create `ResumeDraftBanner` component.**

```typescript
// src/components/ui/ResumeDraftBanner.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../../constants';

interface Props {
  onContinue: () => void;
  onDiscard: () => void;
}

export function ResumeDraftBanner({ onContinue, onDiscard }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>יש לך בקשה שהתחלת — המשך או התחל חדש?</Text>
      <View style={styles.row}>
        <Pressable style={styles.btnContinue} onPress={onContinue}>
          <Text style={styles.btnContinueText}>המשך</Text>
        </Pressable>
        <Pressable style={styles.btnDiscard} onPress={onDiscard}>
          <Text style={styles.btnDiscardText}>התחל חדש</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, marginBottom: 12 },
  text: { color: '#92400E', fontSize: 14, marginBottom: 10, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8 },
  btnContinue: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 8, padding: 10, alignItems: 'center' },
  btnContinueText: { color: '#FFFFFF', fontWeight: '700' },
  btnDiscard: { flex: 1, backgroundColor: 'transparent', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#92400E' },
  btnDiscardText: { color: '#92400E', fontWeight: '700' },
});
```

**Step 4: Show banner on Hub.**

In `app/(tabs)/index.tsx`, on mount, call `draftService.load(user.uid)`. If non-null, render `<ResumeDraftBanner />` at the top of the screen:

```typescript
const [draft, setDraft] = useState<RequestDraft | null>(null);
useEffect(() => {
  if (!user) return;
  draftService.load(user.uid).then(setDraft);
}, [user]);

// ... in render:
{draft && (
  <ResumeDraftBanner
    onContinue={() => router.push({
      pathname: '/capture/confirm',
      params: {
        images: JSON.stringify(draft.imageUris),
        base64Images: JSON.stringify([]),
        description: draft.description,
        videoAssets: JSON.stringify(draft.videoAssets),
        analysisKey: draft.analysisKey,
        resumed: '1',
      },
    })}
    onDiscard={() => { draftService.delete(user.uid); setDraft(null); }}
  />
)}
```

**Step 5: Smoke test manually.**

```bash
npx expo start
```

Exercise the flow: capture → confirm → kill app mid-upload → reopen → banner appears → Continue resumes.

**Step 6: Commit**

```bash
git add app/ src/components/ui/ResumeDraftBanner.tsx
git commit -m "feat(drafts): wire resumable request flow end-to-end"
```

---

## Task 1.6: Firestore rules for new collections

**Files:**
- Modify: `firebase/firestore.rules`

**Step 1: Read current rules to understand conventions.**

```bash
cat firebase/firestore.rules
```

**Step 2: Add rules for `requests/{id}/events/*`:**

```
match /requests/{requestId} {
  // ... existing match block

  match /events/{eventId} {
    allow read: if request.auth.uid == get(/databases/$(database)/documents/requests/$(requestId)).data.userId
                || request.auth.uid in /databases/$(database)/documents/adminUids/$(request.auth.uid);
    allow create: if request.auth.uid == get(/databases/$(database)/documents/requests/$(requestId)).data.userId;
    allow update, delete: if false;  // events are immutable; worker uses service account
  }
}
```

**Step 3: Add rules for `providers/{phone}`:**

```
match /providers/{phone} {
  allow read: if request.auth != null;  // browsable by any signed-in user
  allow write: if false;                // worker only (service account bypasses rules)

  match /jobs/{jobId} {
    allow read: if request.auth != null;
    allow write: if false;
  }
}
```

**Step 4: Add rules for `adminStats/*`:**

```
match /adminStats/{docId} {
  allow read: if request.auth.uid in /databases/$(database)/documents/adminUids/$(request.auth.uid);
  allow write: if false;  // worker only
}
```

**Step 5: Add an `adminUids` collection** — one doc per admin UID, empty body. Used to gate read access above. Create `6sLBVwm1vyWSDjkrK0DffMIJ2i03` (the existing admin UID from `app/admin/_layout.tsx`) manually in Firebase Console.

**Step 6: Deploy rules.**

```bash
npm run deploy:rules
# Expected: "firestore: rules file firebase/firestore.rules compiled successfully"
```

**Step 7: Commit**

```bash
git add firebase/firestore.rules
git commit -m "feat(rules): events subcollection, providers aggregate, adminStats"
```

---

## Task 1.7: Firestore composite indexes

**Files:**
- Modify: `firebase/firestore.indexes.json` (create if it doesn't exist — check with `ls firebase/`)

**Step 1: Add required indexes**

```json
{
  "indexes": [
    {
      "collectionGroup": "requests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "requests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "locationSummary.city", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "jobs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "completedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "startedAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

**Step 2: Deploy indexes.**

```bash
npx firebase-tools deploy --only firestore:indexes
# Expected: index build queued (can take minutes)
```

**Step 3: Commit.**

```bash
git add firebase/firestore.indexes.json
git commit -m "feat(indexes): admin requests + events + provider jobs"
```

---

# Phase 2 — Instrumentation (~2 days)

## Task 2.1: Client event logger

**Files:**
- Create: `src/services/observability/eventLogger.ts`
- Create: `src/services/observability/eventLogger.test.ts`
- Create: `src/services/observability/index.ts`

**Step 1: Write the failing test.**

```typescript
// src/services/observability/eventLogger.test.ts
import { eventLogger } from './eventLogger';

const mockAdd = jest.fn().mockResolvedValue({ id: 'ev1' });
jest.mock('../firestore/imports', () => ({
  getFirestore: () => ({}),
  collection: (_db: any, ..._parts: string[]) => ({}),
  addDoc: (...args: any[]) => mockAdd(...args),
  serverTimestamp: () => 'NOW',
}));

describe('eventLogger', () => {
  beforeEach(() => mockAdd.mockClear());

  it('writes an event doc under the request', async () => {
    await eventLogger.log('req-1', {
      type: 'gemini', ok: true, durationMs: 123,
      metadata: { model: 'flash' },
    });
    expect(mockAdd).toHaveBeenCalled();
  });

  it('swallows errors, never throws', async () => {
    mockAdd.mockRejectedValueOnce(new Error('boom'));
    await expect(
      eventLogger.log('req-1', { type: 'gemini', ok: true, durationMs: 1 }),
    ).resolves.toBeUndefined();
  });
});
```

**Step 2: Implement eventLogger.**

```typescript
// src/services/observability/eventLogger.ts
import {
  getFirestore, collection, addDoc, serverTimestamp,
} from '../firestore/imports';
import type { RequestEventType } from '../../types';

interface LogInput {
  type: RequestEventType;
  ok: boolean;
  durationMs: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

async function log(requestId: string, input: LogInput): Promise<void> {
  try {
    const db = getFirestore();
    await addDoc(collection(db, 'requests', requestId, 'events'), {
      ...input,
      startedAt: serverTimestamp(),
    });
  } catch {
    // fire-and-forget — never fail caller
  }
}

export const eventLogger = { log };
```

**Step 3: Run test, verify pass.**

```bash
npx jest src/services/observability/eventLogger.test.ts
# Expected: PASS
```

**Step 4: Commit.**

```bash
git add src/services/observability/
git commit -m "feat(observability): client eventLogger with fire-and-forget semantics"
```

---

## Task 2.2: Instrument Gemini analysis

**Files:**
- Modify: `src/services/ai/geminiAnalysis.ts`

**Step 1: After the successful JSON parse at the end of the `for` loop, add:**

```typescript
import { eventLogger } from '../observability';

// after "const parsed = JSON.parse(jsonStr);" and before the return:
// (note: we don't have the requestId in this service — accept it as param)
```

**Step 2: Thread a `requestId` parameter through `AIAnalysisInput`.**

In `src/services/ai/types.ts`:

```typescript
export interface AIAnalysisInput {
  // ... existing
  requestId?: string;  // optional to keep backward compat
}
```

**Step 3: In geminiAnalysis.ts, emit the event inside both the success and failure paths.**

After success:
```typescript
if (input.requestId) {
  void eventLogger.log(input.requestId, {
    type: 'gemini', ok: true, durationMs: ms,
    metadata: { model: modelName, payloadKB, imageCount: (input.images || []).length },
  });
}
```

In the outer `throw lastError` block (all models failed):
```typescript
if (input.requestId) {
  void eventLogger.log(input.requestId, {
    type: 'gemini', ok: false, durationMs: Date.now() - totalStart,
    error: lastError?.message, metadata: { payloadKB },
  });
}
```

**Step 4: Pass `requestId` from the caller** (`analysisStore.startAnalysis`):

We don't have a requestId yet at capture time (request hasn't been created). Use `tempId = analysisKey` and write events under a stable temp id. Later, on `createRequest` success, call `copyEventsFromTempId(tempId, finalRequestId)` — OR simpler, delay emitting Gemini events until `createRequest` is done and emit them retrospectively from data we already have (`serviceSummary.geminiMs`).

**Recommendation:** keep Gemini event emission simple — emit it at `handleConfirmAndSend` time right after `createRequest` using data captured earlier. Add to `AIAnalysisResult`:

```typescript
export interface AIAnalysisResult {
  // ... existing
  __perf?: { model: string; ms: number; imageCount: number };  // internal
}
```

Populate in `geminiAnalysis.ts` success path. Then in `confirm.tsx` after `createRequest`:

```typescript
if (analysis.__perf) {
  void eventLogger.log(request.id, {
    type: 'gemini', ok: true, durationMs: analysis.__perf.ms,
    metadata: { model: analysis.__perf.model, imageCount: analysis.__perf.imageCount },
  });
}
```

**Step 5: Commit.**

```bash
git add src/services/ai/ app/capture/confirm.tsx
git commit -m "feat(observability): emit gemini events per request"
```

---

## Task 2.3: Instrument uploads + firestore_write

**Files:**
- Modify: `app/capture/confirm.tsx`

**Step 1: Wrap each upload call** in a timing block and emit events. Replace the current `Promise.all` blocks:

```typescript
const uploadStart = Date.now();

const uploadedImages = await Promise.all(
  imageUris.map(async (uri) => {
    const t0 = Date.now();
    const result = await mediaService.uploadImage(uri, user.uid, tempId);
    void eventLogger.log(tempId, {
      type: 'upload_image', ok: true, durationMs: Date.now() - t0,
      metadata: { sizeMB: result.sizeMB ?? 0 },
    });
    return result;
  }),
);

const uploadedVideos = await Promise.all(
  videoAssets.map(async (v) => {
    const t0 = Date.now();
    const result = await mediaService.uploadVideo(v.uri, user.uid, tempId, v.thumbnailUri);
    void eventLogger.log(tempId, {
      type: 'upload_video', ok: true, durationMs: Date.now() - t0,
      metadata: { sizeMB: result.sizeMB ?? 0 },
    });
    return result;
  }),
);

const uploadMs = Date.now() - uploadStart;
```

**Step 2: Emit firestore_write event around createRequest.**

```typescript
const writeStart = Date.now();
const request = await requestService.createRequest({ ... });
const writeMs = Date.now() - writeStart;
void eventLogger.log(request.id, {
  type: 'firestore_write', ok: true, durationMs: writeMs,
});
```

**Step 3: Write serviceSummary onto the request doc.**

```typescript
await updateDoc(doc(db, 'requests', request.id), {
  serviceSummary: {
    geminiMs: analysis.__perf?.ms ?? 0,
    uploadMs,
    firestoreWriteMs: writeMs,
    totalMs: (analysis.__perf?.ms ?? 0) + uploadMs + writeMs,
    hadError: false,
  },
});
```

**Step 4: Commit.**

```bash
git add app/capture/confirm.tsx
git commit -m "feat(observability): emit upload+firestore events, write serviceSummary"
```

---

## Task 2.4: Worker event logger + broadcast summary

**Files:**
- Create: `workers/broker/src/eventLogger.ts`
- Modify: `workers/broker/src/index.ts` in `handleBroadcast`

**Step 1: Create worker event logger.**

```typescript
// workers/broker/src/eventLogger.ts
import { FirestoreClient } from './firestore';

export interface WorkerEventInput {
  type: string;
  ok: boolean;
  durationMs: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export async function batchLogEvents(
  firestore: FirestoreClient,
  requestId: string,
  events: WorkerEventInput[],
): Promise<void> {
  if (events.length === 0) return;
  try {
    await firestore.batchCreateEvents(requestId, events);
  } catch (err) {
    console.error('[eventLogger] batch write failed:', err);
    // never throw — fire-and-forget
  }
}
```

**Step 2: Add `batchCreateEvents` to `FirestoreClient`.**

In `workers/broker/src/firestore.ts`:

```typescript
async batchCreateEvents(
  requestId: string,
  events: Array<{ type: string; ok: boolean; durationMs: number; error?: string; metadata?: any }>,
): Promise<void> {
  const writes = events.map((ev) => ({
    update: {
      name: `projects/${this.projectId}/databases/(default)/documents/requests/${requestId}/events/${crypto.randomUUID()}`,
      fields: this.encodeFields({
        ...ev,
        startedAt: new Date().toISOString(),
      }),
    },
  }));
  await this.commitWrites(writes);
}
```

(You may already have a `commitWrites` helper — if not, implement via the `projects/*/databases/(default)/documents:commit` REST endpoint.)

**Step 3: Instrument `handleBroadcast`.**

Wrap each Places search and Twilio send, accumulating events:

```typescript
const events: WorkerEventInput[] = [];
const broadcastStart = Date.now();

// Places search loop
for (const profession of body.professions) {
  const t0 = Date.now();
  try {
    const found = await findNearbyProvidersCached({ ... });
    events.push({
      type: 'places_search', ok: true, durationMs: Date.now() - t0,
      metadata: { profession, foundCount: found.length, cached: found.cached },
    });
    allProviders.push(...found.providers);
  } catch (err) {
    events.push({
      type: 'places_search', ok: false, durationMs: Date.now() - t0,
      error: String(err).slice(0, 200), metadata: { profession },
    });
  }
}

// Twilio send loop (similar pattern)
for (const provider of filtered) {
  const t0 = Date.now();
  try {
    const res = await sendWhatsAppTemplate({ ... });
    events.push({
      type: 'twilio_send', ok: true, durationMs: Date.now() - t0,
      metadata: { providerPhone: provider.phone, twilioSid: res.sid },
    });
    sentCount++;
  } catch (err) {
    events.push({
      type: 'twilio_send', ok: false, durationMs: Date.now() - t0,
      error: String(err).slice(0, 200), metadata: { providerPhone: provider.phone },
    });
    failedCount++;
  }
}

// Write broadcastSummary to the request doc
await firestore.updateRequest(body.requestId, {
  broadcastSummary: {
    sentCount, failedCount,
    providersFound: allProviders.length,
    startedAt: new Date(broadcastStart).toISOString(),
    finishedAt: new Date().toISOString(),
  },
});

// Fire-and-forget batch write
ctx.waitUntil(batchLogEvents(firestore, body.requestId, events));
```

**Step 4: Run worker tests.**

```bash
cd workers/broker && npm test
# Expected: PASS
```

**Step 5: Deploy worker to a staging variant** (if you have one; otherwise test locally with `npx wrangler dev`).

```bash
cd workers/broker && npx wrangler dev
# Trigger a broadcast from the app, verify events appear in the events subcollection.
```

**Step 6: Commit.**

```bash
git add workers/broker/
git commit -m "feat(worker): instrument broadcast with events + broadcastSummary"
```

---

## Task 2.5: timeToFirstResponse in Twilio webhook

**Files:**
- Modify: `workers/broker/src/index.ts` — `handleTwilioWebhook`

**Step 1: When a new bid is created from an incoming message, check if the request already has `timeToFirstResponse` set. If NOT, compute and set it.**

Inside the handler, after confirming the message is a valid bid:

```typescript
const request = await firestore.getRequest(requestId);
if (request && !request.timeToFirstResponse && request.broadcastSummary?.startedAt) {
  const startedAt = new Date(request.broadcastSummary.startedAt).getTime();
  const minutes = Math.round((Date.now() - startedAt) / 60000);
  await firestore.updateRequest(requestId, { timeToFirstResponse: minutes });

  ctx.waitUntil(batchLogEvents(firestore, requestId, [{
    type: 'first_response', ok: true, durationMs: 0,
    metadata: { providerPhone: senderPhone, minutesAfterBroadcast: minutes },
  }]));
}
```

**Step 2: Commit.**

```bash
git add workers/broker/src/index.ts
git commit -m "feat(worker): record timeToFirstResponse on first incoming bid"
```

---

## Task 2.6: Worker `/review` endpoint with transaction

**Files:**
- Modify: `workers/broker/src/index.ts`
- Modify: `workers/broker/src/firestore.ts` — add `runReviewTransaction`
- Modify: `app/review/[requestId].tsx` — call worker instead of direct Firestore write
- Modify: `src/services/reviews/*.ts` — route submission through worker.

**Step 1: Add route in the `fetch` handler.**

```typescript
if (url.pathname === '/review' && request.method === 'POST') {
  const rlOk = await checkRateLimit(env.PLACES_CACHE, `review:${clientIp}`, 10, 3600);
  if (!rlOk) return jsonResponse({ error: 'rate_limited' }, 429, request);
  return await handleReview(request, env, ctx);
}
```

**Step 2: Implement `handleReview`.**

```typescript
interface ReviewBody {
  requestId: string;
  rating: number;
  comment: string;
  pricePaid: number;
  selectedCategories?: string[];
  classificationCorrect?: boolean | null;
}

async function handleReview(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const body = (await request.json()) as ReviewBody;
  const uid = await verifyFirebaseIdToken(request, env);
  if (!uid) return jsonResponse({ error: 'unauthorized' }, 401, request);

  if (!body.requestId || body.rating < 1 || body.rating > 5 || body.pricePaid < 0
      || !body.comment || body.comment.length > 1000) {
    return jsonResponse({ error: 'invalid_input' }, 400, request);
  }

  const firestore = createFirestoreClient(env);
  const result = await firestore.runReviewTransaction({
    uid, ...body,
  });

  if (!result.ok) {
    return jsonResponse({ error: result.reason }, result.status, request);
  }

  ctx.waitUntil(batchLogEvents(firestore, body.requestId, [{
    type: 'review_submitted', ok: true, durationMs: 0,
    metadata: { rating: body.rating, pricePaid: body.pricePaid },
  }]));

  return jsonResponse({ ok: true }, 200, request);
}
```

**Step 3: Implement `runReviewTransaction` in `firestore.ts`.**

Uses the Firestore REST `beginTransaction` → `commit` pattern. Inside:
1. Read `requests/{requestId}`. Fail if not found, `userId != uid`, `status != 'CLOSED'`, or `reviewSummary` already set.
2. Read `providers/{selectedProviderPhone}`.
3. Compute new aggregates (O(1)).
4. Commit 4 writes:
   - `reviews/{reviewId}` (new doc, id = autogen)
   - `requests/{requestId}.reviewSummary = ...`
   - `providers/{phone}/jobs/{requestId}` (update: pricePaid, rating, comment, customerReviewedAt)
   - `providers/{phone}.stats = ...`

Return `{ ok: true }` or `{ ok: false, reason, status }`.

**Step 4: Swap client review submission to POST `/review`.**

In `src/services/reviews/...` (wherever the current review write happens):

```typescript
import { getAuth } from '@react-native-firebase/auth';

export async function submitReview(input: ReviewInput): Promise<void> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('not_signed_in');
  const idToken = await user.getIdToken();

  const url = process.env.EXPO_PUBLIC_BROKER_URL + '/review';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`review_failed: ${res.status} ${text}`);
  }
}
```

**Step 5: In `app/review/[requestId].tsx`, on submission failure, keep form state + show Retry.**

```typescript
try {
  await reviewService.submitReview({ ... });
  router.replace('/(tabs)');
} catch (err) {
  setError(t('review.submitFailed'));  // new string: "נסה שוב"
  setIsSubmitting(false);
}
```

**Step 6: Run worker tests.**

```bash
cd workers/broker && npm test
```

**Step 7: Commit.**

```bash
git add workers/broker/ src/services/reviews/ app/review/
git commit -m "feat(worker): POST /review endpoint with atomic transaction"
```

---

## Task 2.7: Denormalize selectedBidPrice on selection

**Files:**
- Find the code that runs when a customer selects a bid (likely in `src/services/bids/*` or a `handleProviderSelected` worker endpoint).
- Modify it to copy the bid's `price` onto `requests.selectedBidPrice` atomically with the other selection updates.

**Step 1: Locate the selection handler.**

```bash
npx grep -rn "selectedBidId\|selectedProviderId" src/ app/ workers/
```

**Step 2: Add `selectedBidPrice: bid.price` to the update call.**

**Step 3: Commit.**

```bash
git add -p src/ app/ workers/
git commit -m "feat(bids): denormalize selectedBidPrice onto request"
```

---

## Task 2.8: Broadcast-failed event on client when broker is unreachable

**Files:**
- Modify: `src/services/broadcast/broadcastService.ts`

**Step 1:** In `broadcastToProviders`, when the `fetch` throws OR returns non-2xx:

```typescript
void eventLogger.log(input.requestId, {
  type: 'broadcast_failed', ok: false, durationMs: 0,
  error: String(err).slice(0, 200),
  metadata: { status: response?.status ?? 0 },
});
```

**Step 2: Commit.**

```bash
git add src/services/broadcast/broadcastService.ts
git commit -m "feat(observability): emit broadcast_failed on broker outage"
```

---

# Phase 3 — Daily rollup (~0.5 day)

## Task 3.1: `handleDailyRollup` cron

**Files:**
- Modify: `workers/broker/src/index.ts` — add cron task + handler.
- Modify: `workers/broker/wrangler.toml` — add 6h schedule.

**Step 1: Implement `handleDailyRollup`.**

```typescript
async function handleDailyRollup(firestore: FirestoreClient): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const startOfDay = new Date(today + 'T00:00:00Z').getTime();
  const endOfDay = startOfDay + 24 * 3600_000;

  const requests = await firestore.getRequestsInRange(startOfDay, endOfDay);

  const byCity: Record<string, any> = {};
  let totalRating = 0, totalPrice = 0, totalRespMin = 0;
  let reviewsSubmitted = 0, respCount = 0;

  for (const req of requests) {
    const city = req.locationSummary?.city ?? 'unknown';
    byCity[city] ??= { requestsCreated: 0, reviewsSubmitted: 0, avgTimeToFirstResponseMin: 0, avgRating: 0, grossValue: 0 };
    byCity[city].requestsCreated++;

    if (req.reviewSummary) {
      reviewsSubmitted++;
      totalRating += req.reviewSummary.rating;
      totalPrice += req.reviewSummary.pricePaid;
      byCity[city].reviewsSubmitted++;
      byCity[city].grossValue += req.reviewSummary.pricePaid;
    }
    if (req.timeToFirstResponse != null) {
      respCount++;
      totalRespMin += req.timeToFirstResponse;
    }
  }

  const payload = {
    date: today,
    requestsCreated: requests.length,
    reviewsSubmitted,
    avgTimeToFirstResponseMin: respCount > 0 ? totalRespMin / respCount : 0,
    avgRating: reviewsSubmitted > 0 ? totalRating / reviewsSubmitted : 0,
    grossValue: totalPrice,
    byCity,
  };

  await firestore.setDoc(`adminStats/daily-${today.replace(/-/g, '')}`, payload);
  console.log(`[rollup] daily-${today} written: ${requests.length} requests`);
}
```

**Step 2: Wire into `scheduled()` handler.**

```typescript
await handleDailyRollup(firestore).catch((err) =>
  console.error('[cron] daily rollup failed:', err),
);
```

**Step 3: Add to `wrangler.toml`.**

```toml
[triggers]
crons = ["0 * * * *", "0 */6 * * *"]
```

(Add the 6h cron alongside the existing hourly; both fire into `scheduled()`.)

**Step 4: On first deploy, backfill 30 days.**

Add a one-shot admin endpoint `POST /admin/backfill-rollup?days=30` that loops the helper and calls `handleDailyRollup` for each of the last 30 days. Remove or gate behind an env flag after first use.

**Step 5: Deploy worker.**

```bash
npm run deploy:worker
# Expected: deployment success
```

**Step 6: Commit.**

```bash
git add workers/broker/
git commit -m "feat(worker): handleDailyRollup cron + backfill endpoint"
```

---

# Phase 4 — Admin UI (~3 days)

## Task 4.1: Install & smoke-test victory-native

**Step 1: Install.**

```bash
npm install victory-native react-native-svg
```

**Step 2: Add to app.json plugins section** if the plugin needs it (check victory-native docs).

**Step 3: Create a dev build.**

```bash
npx expo prebuild --clean
# Then either:
eas build --profile development --platform android
# OR for quick local test:
npx expo run:android
```

**Step 4: Render a trivial chart** in `app/(dev)/gallery.tsx` to verify it works on both mobile and web.

```typescript
import { VictoryLine } from 'victory-native';
// <VictoryLine data={[{x:1,y:1},{x:2,y:4},{x:3,y:2}]} />
```

**Step 5: If SDK 54 incompatibility surfaces,** fall back to `react-native-svg-charts`. Update the design doc note accordingly.

**Step 6: Commit.**

```bash
git add package.json package-lock.json app.json app/(dev)/gallery.tsx
git commit -m "chore(deps): add victory-native + smoke test"
```

---

## Task 4.2: `useAdminQuery` hook with 60s cache

**Files:**
- Create: `src/hooks/useAdminQuery.ts`
- Create: `src/hooks/useAdminQuery.test.ts`

**Step 1: Write a simple test.**

```typescript
import { useAdminQuery } from './useAdminQuery';
// test caches result for 60s (mock Date.now)
```

**Step 2: Implement.**

```typescript
import { useEffect, useRef, useState } from 'react';

type QueryFn<T> = () => Promise<T>;
const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; data: unknown }>();

export function useAdminQuery<T>(key: string, fn: QueryFn<T>) {
  const [data, setData] = useState<T | null>(() => {
    const hit = cache.get(key);
    return hit && Date.now() - hit.at < CACHE_MS ? (hit.data as T) : null;
  });
  const [isLoading, setIsLoading] = useState(!data);
  const [error, setError] = useState<Error | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const refresh = async () => {
    setIsLoading(true); setError(null);
    try {
      const result = await fnRef.current();
      cache.set(key, { at: Date.now(), data: result });
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (!data) void refresh(); }, [key]);

  return { data, isLoading, error, refresh };
}
```

**Step 3: Run tests, commit.**

```bash
npx jest src/hooks/useAdminQuery.test.ts
git add src/hooks/useAdminQuery.ts src/hooks/useAdminQuery.test.ts
git commit -m "feat(admin): useAdminQuery hook with 60s cache"
```

---

## Task 4.3: `/admin/requests` list page

**Files:**
- Create: `app/admin/requests.tsx`
- Create: `app/admin/requests/_layout.tsx` — if nested routing needed.
- Modify: `app/admin/_layout.tsx` — add 'Requests' tab.
- Create: `src/services/admin/requestsQuery.ts`
- Create: `src/components/admin/RequestsTable.tsx`
- Create: `src/components/admin/FiltersBar.tsx`
- Create: `src/components/admin/PaginationBar.tsx`

**Step 1: Add the route to the tabs array in `app/admin/_layout.tsx`.**

```typescript
const TABS = [
  { name: 'index', label: 'סקירה', icon: 'pulse-outline' },
  { name: 'requests', label: 'בקשות', icon: 'list-outline' },
  // ... existing
];
```

**Step 2: Create `src/services/admin/requestsQuery.ts`.**

```typescript
import {
  getFirestore, collection, query, where, orderBy, limit, startAfter, getDocs,
} from '../firestore/imports';

export interface AdminRequestRow {
  id: string;
  createdAt: Date;
  city: string;
  professions: string[];
  status: string;
  bidCount: number;
  timeToFirstResponse?: number;
  selectedProviderName?: string;
  selectedBidPrice?: number;
  pricePaid?: number;
  rating?: number;
}

export async function queryAdminRequests(params: {
  fromDate?: Date; toDate?: Date;
  city?: string; status?: string; hasReview?: boolean;
  cursor?: unknown; pageSize?: number;
}): Promise<{ rows: AdminRequestRow[]; nextCursor?: unknown }> {
  const db = getFirestore();
  const constraints = [];
  if (params.status) constraints.push(where('status', '==', params.status));
  if (params.city) constraints.push(where('locationSummary.city', '==', params.city));
  if (params.fromDate) constraints.push(where('createdAt', '>=', params.fromDate));
  if (params.toDate) constraints.push(where('createdAt', '<=', params.toDate));
  constraints.push(orderBy('createdAt', 'desc'));
  if (params.cursor) constraints.push(startAfter(params.cursor));
  constraints.push(limit(params.pageSize ?? 50));

  const snap = await getDocs(query(collection(db, 'requests'), ...constraints));
  const rows = snap.docs.map((d) => mapDocToRow(d));
  const nextCursor = snap.docs[snap.docs.length - 1];
  return { rows, nextCursor };
}

function mapDocToRow(d: any): AdminRequestRow { /* ... */ }
```

**Step 3: Create `RequestsTable.tsx` (component).**

Implement the columns from the design doc §4.2. Use styles from `app/admin/index.tsx` as a template. Add urgency color props:

```typescript
function getUrgencyStyle(row: AdminRequestRow): ViewStyle {
  const ageMin = (Date.now() - row.createdAt.getTime()) / 60000;
  if (row.status === 'OPEN' && row.bidCount === 0 && ageMin > 240) return { backgroundColor: 'rgba(239, 68, 68, 0.08)' };
  if (row.status === 'OPEN' && row.bidCount === 0 && ageMin > 60) return { backgroundColor: 'rgba(245, 158, 11, 0.08)' };
  if (row.status === 'CLOSED' && (row.rating ?? 0) >= 4) return { backgroundColor: 'rgba(34, 197, 94, 0.06)' };
  return {};
}
```

**Step 4: Create `FiltersBar.tsx`.**

Date range dropdown (30d/90d/custom), city multi-select (driven by `CITY_BOXES.map(b => b.city)`), status dropdown, has-review toggle.

**Step 5: Create `app/admin/requests.tsx`** that composes the above with `useAdminQuery`.

**Step 6: Commit.**

```bash
git add app/admin/ src/services/admin/ src/components/admin/
git commit -m "feat(admin): /admin/requests list with filters + pagination"
```

---

## Task 4.4: `/admin/requests/[id]` detail page

**Files:**
- Create: `app/admin/requests/[id].tsx`
- Create: `src/components/admin/ServiceTimeline.tsx`
- Create: `src/components/admin/BroadcastCard.tsx`
- Create: `src/components/admin/ReviewCard.tsx`
- Create: `src/services/admin/requestDetailQuery.ts`

**Step 1: Implement `requestDetailQuery.ts`** — fetches the request doc + `events/` subcollection.

**Step 2: `ServiceTimeline.tsx`** renders events as colored dots + one-line descriptions per design §4.3.5.

Color map:
```typescript
const EVENT_COLORS: Record<string, string> = {
  gemini: '#6366F1', upload_image: '#10B981', upload_video: '#10B981',
  firestore_write: '#64748B', places_search: '#F59E0B', twilio_send: '#22C55E',
  push_notify: '#EC4899', first_response: '#22C55E',
  review_submitted: '#8B5CF6', broadcast_failed: '#EF4444',
};
```
Override with red if `!ev.ok`.

**Step 3: `BroadcastCard.tsx`** shows `sentCount / failedCount / providersFound` + duration.

**Step 4: `ReviewCard.tsx`** shows rating stars, pricePaid, comment. If missing: "ממתין לתגובת לקוח".

**Step 5: Assemble in `[id].tsx`.**

**Step 6: Commit.**

```bash
git add app/admin/requests/ src/components/admin/ src/services/admin/requestDetailQuery.ts
git commit -m "feat(admin): /admin/requests/[id] detail with timeline + broadcast + review"
```

---

## Task 4.5: CSV export for requests table

**Files:**
- Create: `src/utils/csvExport.ts`
- Modify: `src/components/admin/RequestsTable.tsx` — add export button.

**Step 1: `csvExport.ts`.**

```typescript
export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: (keyof T)[]): string {
  const header = columns.join(',');
  const body = rows.map((r) =>
    columns.map((c) => {
      const v = r[c];
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(','),
  ).join('\n');
  return header + '\n' + body;
}

export async function downloadCsv(filename: string, csv: string): Promise<void> {
  if (typeof window !== 'undefined' && 'document' in window) {
    // web
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  } else {
    // mobile: save to cache + share
    const FileSystem = require('expo-file-system');
    const Sharing = require('expo-sharing');
    const path = FileSystem.cacheDirectory + filename;
    await FileSystem.writeAsStringAsync(path, '\uFEFF' + csv);
    await Sharing.shareAsync(path);
  }
}
```

**Step 2: Wire button** in `RequestsTable.tsx`:

```typescript
<Pressable onPress={() => downloadCsv(`requests-${Date.now()}.csv`, toCsv(rows, COLUMNS))}>
  <Text>יצא CSV</Text>
</Pressable>
```

**Step 3: Commit.**

```bash
git add src/utils/csvExport.ts src/components/admin/RequestsTable.tsx
git commit -m "feat(admin): CSV export for requests table"
```

---

## Task 4.6: Provider detail page + click-through

**Files:**
- Create: `app/admin/providers/[phone].tsx`
- Modify: `app/admin/providers.tsx` — make rows pressable.
- Create: `src/components/admin/ProviderJobsTable.tsx`
- Create: `src/components/admin/ProviderActivityGraph.tsx`
- Create: `src/services/admin/providerDetailQuery.ts`

**Step 1: `providerDetailQuery.ts`** fetches `providers/{phone}` + `providers/{phone}/jobs/*`.

**Step 2: `ProviderJobsTable.tsx`** — row per job with CSV export button.

**Step 3: `ProviderActivityGraph.tsx`** — bids-per-week over 90 days using victory-native `VictoryBar`.

**Step 4: `[phone].tsx`** composes header + stats + jobs + graph.

**Step 5: Wire click in existing `providers.tsx`** — wrap each row in `<Pressable onPress={() => router.push(`/admin/providers/${row.phone}`)}>`.

**Step 6: Commit.**

```bash
git add app/admin/providers/ app/admin/providers.tsx src/components/admin/ src/services/admin/
git commit -m "feat(admin): provider detail page + click-through from list"
```

---

## Task 4.7: Overview graphs wired to adminStats

**Files:**
- Modify: `app/admin/index.tsx` — replace mock-backed components with real data.
- Create: `src/components/admin/charts/RequestsPerDayChart.tsx`
- Create: `src/components/admin/charts/FunnelBarChart.tsx`
- Create: `src/components/admin/charts/TimeToFirstBidChart.tsx`
- Create: `src/components/admin/charts/RevenueChart.tsx`
- Create: `src/components/admin/charts/RatingChart.tsx`
- Create: `src/components/admin/RangeToggle.tsx` — [30d][90d]
- Create: `src/components/admin/CityFilter.tsx`
- Create: `src/services/admin/dailyStatsQuery.ts`

**Step 1: `dailyStatsQuery.ts`** queries `adminStats/daily-*` sorted by date desc, limit N.

**Step 2: Each chart component** takes `{ stats: AdminDailyStats[]; city?: string }` and picks the right fields:

```typescript
// RequestsPerDayChart
const data = stats.map((s) => ({ x: s.date, y: city ? s.byCity[city]?.requestsCreated ?? 0 : s.requestsCreated }));
<VictoryLine data={data} />
```

**Step 3: Assemble in `app/admin/index.tsx`.**

A `RangeToggle` + `CityFilter` at the top update shared state, propagated to the five charts.

**Step 4: Commit.**

```bash
git add app/admin/index.tsx src/components/admin/ src/services/admin/dailyStatsQuery.ts
git commit -m "feat(admin): overview graphs from daily rollups + city filter"
```

---

# Phase 5 — Polish (~1 day)

## Task 5.1: Wire funnel.tsx to real data

Replace `MOCK_FUNNEL` import with a new `queryFunnelData()` that aggregates from `adminStats/daily-*`. Commit.

## Task 5.2: Wire revenue.tsx to real data

Similar; aggregate `grossValue` from adminStats. Commit.

## Task 5.3: Wire geo.tsx to real data

Use `adminStats.byCity.*` for per-metro heat. Commit.

## Task 5.4: Wire alerts feed to adminAlerts/*

Replace `MOCK_ALERTS` with a Firestore query on the existing `adminAlerts` collection (populated by the worker's `handleAlertChecks`). Commit.

## Task 5.5: Delete mockData.ts

```bash
npx grep -rn "mockData" src/ app/
# Expected: 0 matches.
rm src/services/admin/mockData.ts
git commit -am "chore(admin): remove mockData.ts — dashboard is fully live"
```

---

# Test & QA checklist

Before merging to `main`:

- [ ] `npm test` — all unit tests pass
- [ ] `npm run test:worker` — worker tests pass
- [ ] `npx tsc --noEmit` — no TS errors
- [ ] `npx expo lint` — clean
- [ ] Manual smoke test: full capture → confirm → broadcast → review flow on a dev build
- [ ] Admin pages render on mobile AND web
- [ ] CSV exports open cleanly in Excel (UTF-8 BOM verified)
- [ ] Firestore indexes all show "Ready" in console
- [ ] Deploy rules + worker + web in that order

---

# Execution handoff

Plan complete and saved to `docs/plans/2026-04-22-admin-and-foundation-plan.md`.

Two execution options when the user returns:

1. **Subagent-Driven (this session)** — dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Parallel Session (separate)** — open a new session in this worktree, run `executing-plans` skill, batch execution with checkpoints.

User is offline. They chose no preference. Default: the user will pick when they return. This plan is fully self-contained and can be executed by either mode.
