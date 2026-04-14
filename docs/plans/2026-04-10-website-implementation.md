# ai-fixly Website — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a full web version of ai-fixly using Expo Web, with an app-download modal, 29 SEO service pages, and platform fallbacks for camera/auth/location. Deploy to Cloudflare Pages.

**Architecture:** Same Expo codebase exports to web. Platform-specific code is guarded by `Platform.OS === 'web'`. New web-only components live in `src/components/web/`. SEO pages are statically generated from problemMatrix.ts at build time.

**Tech Stack:** Expo SDK 54 (web export), react-native-web, firebase (web SDK for auth), Cloudflare Pages, Expo Router static generation.

---

## Task 1: Verify Expo Web builds and renders

**Goal:** Confirm the existing app renders on web before adding anything new.

**Files:**
- Modify: `package.json` (add `web` script)
- Modify: `app.json` (verify web config)

**Step 1: Add web script to package.json**

Add to `scripts`:
```json
"web": "expo start --web",
"build:web": "npx expo export --platform web"
```

**Step 2: Run `npm run web` and open in browser**

Run: `cd C:\Users\roeea\OneDrive\Documents\Github\ai-fixly && npx expo start --web`

Open `http://localhost:8081` in Chrome. Check:
- Does the onboarding screen render?
- Does RTL layout work?
- Are fonts loading?
- Does navigation work?

Note any crashes — they'll be from native-only modules. Common ones:
- `@react-native-firebase/*` — need web fallbacks
- `expo-camera` — need platform guard
- `expo-location` — need web Geolocation
- `expo-haptics` — no-op on web (already handled by Expo)

**Step 3: Fix any immediate web build crashes**

The most likely crash: `@react-native-firebase/app` doesn't export for web. Fix by adding the Firebase Web SDK and creating a platform-aware initialization.

Install Firebase Web SDK (this is SEPARATE from @react-native-firebase):
```bash
npm install firebase
```

Create `src/config/firebaseWeb.ts`:
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = getFirestore(firebaseApp);
```

Add the Firebase web config values to `.env`:
```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=fixly-c4040.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=fixly-c4040
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=fixly-c4040.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

These values come from Firebase Console → Project Settings → General → Your Apps → Web app config. If no web app exists yet, create one (Firebase Console → Add app → Web).

**Step 4: Verify web builds without crashing**

Run: `npx expo export --platform web`
Expected: `dist/` folder created with HTML + JS bundles, no build errors.

**Step 5: Commit**

```bash
git add package.json .env.example src/config/firebaseWeb.ts
git commit -m "chore: verify Expo Web build, add Firebase Web SDK config"
```

---

## Task 2: Platform-aware Auth service

**Goal:** Phone auth works on web with invisible reCAPTCHA, without breaking native.

**Files:**
- Create: `src/services/auth/firebaseAuthWeb.ts`
- Modify: `src/services/auth/index.ts`
- Modify: `app/(auth)/phone.tsx` (add reCAPTCHA container on web)

**Step 1: Create web auth implementation**

```typescript
// src/services/auth/firebaseAuthWeb.ts
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged as webOnAuthStateChanged,
  signOut as webSignOut,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { firebaseApp } from '../../config/firebaseWeb';
import type { AuthService, AuthUser } from './types';

const auth = getAuth(firebaseApp);
let confirmationResult: ConfirmationResult | null = null;

function mapUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    phoneNumber: user.phoneNumber,
    displayName: user.displayName,
    email: user.email,
  };
}

class FirebaseAuthWebService implements AuthService {
  async sendOtp(phoneNumber: string): Promise<string> {
    const container = document.getElementById('recaptcha-container');
    if (!container) throw new Error('reCAPTCHA container not found');

    const verifier = new RecaptchaVerifier(auth, container, {
      size: 'invisible',
    });

    confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    return 'web-verification';
  }

  async confirmOtp(_verificationId: string, code: string): Promise<void> {
    if (!confirmationResult) throw new Error('No pending verification');
    await confirmationResult.confirm(code);
    confirmationResult = null;
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    return webOnAuthStateChanged(auth, (user) => {
      callback(mapUser(user));
    });
  }

  async signOut(): Promise<void> {
    await webSignOut(auth);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return mapUser(auth.currentUser);
  }
}

export const authServiceWeb: AuthService = new FirebaseAuthWebService();
```

**Step 2: Update auth index to platform-select**

```typescript
// src/services/auth/index.ts
import { Platform } from 'react-native';

function getAuthService() {
  if (Platform.OS === 'web') {
    // Dynamic import so native builds don't bundle Firebase Web SDK
    const { authServiceWeb } = require('./firebaseAuthWeb');
    return authServiceWeb;
  }
  const { authService: nativeAuth } = require('./firebaseAuth');
  return nativeAuth;
}

export const authService = getAuthService();
export type { AuthService, AuthUser } from './types';
```

**Step 3: Add reCAPTCHA container to phone screen (web only)**

In `app/(auth)/phone.tsx`, add inside the JSX:

```typescript
import { Platform } from 'react-native';

// Inside the component's return, at the bottom:
{Platform.OS === 'web' && (
  <div id="recaptcha-container" style={{ position: 'absolute', opacity: 0 }} />
)}
```

Note: Using `<div>` directly is fine in react-native-web — it renders as a native HTML div.

**Step 4: Verify auth works on web**

Run: `npx expo start --web`
Navigate to phone screen. Enter a test phone number. Verify:
- No visible reCAPTCHA
- OTP is sent
- Verification completes

**Step 5: Verify native still works**

Run: `npx jest`
Expected: All existing tests pass (no native regression)

**Step 6: Commit**

```bash
git add src/services/auth/firebaseAuthWeb.ts src/services/auth/index.ts app/\(auth\)/phone.tsx
git commit -m "feat: platform-aware auth with Firebase Web SDK + invisible reCAPTCHA"
```

---

## Task 3: WebUploadZone (camera replacement for web)

**Goal:** Modern drag-and-drop photo upload component for web, replacing the native camera.

**Files:**
- Create: `src/components/web/WebUploadZone.tsx`
- Modify: `app/capture/index.tsx` (platform guard)

**Step 1: Create WebUploadZone**

```typescript
// src/components/web/WebUploadZone.tsx
import { useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants';

interface Props {
  onPhotosSelected: (files: File[]) => void;
  maxPhotos?: number;
}

export function WebUploadZone({ onPhotosSelected, maxPhotos = 5 }: Props) {
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, maxPhotos - previews.length);

    const newPreviews = newFiles.map(file => ({
      file,
      url: URL.createObjectURL(file),
    }));

    const updated = [...previews, ...newPreviews].slice(0, maxPhotos);
    setPreviews(updated);
    onPhotosSelected(updated.map(p => p.file));
  }, [previews, maxPhotos, onPhotosSelected]);

  const removePhoto = (index: number) => {
    const updated = previews.filter((_, i) => i !== index);
    setPreviews(updated);
    onPhotosSelected(updated.map(p => p.file));
  };

  // Only render on web
  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.container}>
      {/* Drop zone */}
      <Pressable
        onPress={() => inputRef.current?.click()}
        style={[styles.dropZone, isDragOver && styles.dropZoneActive]}
        // @ts-ignore — web-only DOM events
        onDragOver={(e: any) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e: any) => {
          e.preventDefault();
          setIsDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <Ionicons
          name="cloud-upload-outline"
          size={48}
          color={isDragOver ? COLORS.primary : COLORS.textTertiary}
        />
        <Text style={styles.dropText}>
          {isDragOver ? 'שחרר כאן' : 'גרור תמונות לכאן או לחץ לבחירה'}
        </Text>
        <Text style={styles.dropHint}>
          עד {maxPhotos} תמונות • JPG, PNG
        </Text>
      </Pressable>

      {/* Hidden file input */}
      <input
        ref={inputRef as any}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e: any) => {
          if (e.target.files) addFiles(e.target.files);
        }}
      />

      {/* Thumbnails */}
      {previews.length > 0 && (
        <View style={styles.thumbRow}>
          {previews.map((p, i) => (
            <View key={i} style={styles.thumbContainer}>
              <Image source={{ uri: p.url }} style={styles.thumb} />
              <Pressable style={styles.thumbRemove} onPress={() => removePhoto(i)}>
                <Ionicons name="close-circle" size={20} color={COLORS.error} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  dropZone: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    cursor: 'pointer' as any,
  },
  dropZoneActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  dropText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  dropHint: {
    color: COLORS.textTertiary,
    fontSize: 13,
  },
  thumbRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumbContainer: {
    position: 'relative',
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
});
```

**Step 2: Platform guard in capture screen**

In `app/capture/index.tsx`, add at the top of the component:

```typescript
import { Platform } from 'react-native';

// At the top of the component function:
if (Platform.OS === 'web') {
  // Lazy import to keep native bundle clean
  const { WebUploadZone } = require('../../src/components/web/WebUploadZone');
  return (
    <ScreenContainer>
      <Text style={styles.header}>צלם או העלה תמונה</Text>
      <WebUploadZone onPhotosSelected={handleWebPhotos} />
      <TextInput
        placeholder="תאר את הבעיה..."
        value={description}
        onChangeText={setDescription}
        style={styles.descriptionInput}
        multiline
      />
      <Button title="המשך" onPress={handleContinue} disabled={!hasPhotos} />
    </ScreenContainer>
  );
}
// Native flow continues below...
```

The `handleWebPhotos` function converts `File[]` to the same format the rest of the pipeline expects (upload to Supabase, pass URIs to the AI).

**Step 3: Verify on web**

Run: `npx expo start --web`
Navigate to capture. Verify:
- Drop zone renders
- Clicking opens file picker
- Dragging files highlights the zone
- Thumbnails appear
- Remove button works

**Step 4: Commit**

```bash
git add src/components/web/WebUploadZone.tsx app/capture/index.tsx
git commit -m "feat: web upload zone with drag-and-drop, replaces camera on web"
```

---

## Task 4: App-Download Modal + Banner

**Goal:** Reddit-style blocking modal on first visit, small banner on return visits.

**Files:**
- Create: `src/components/web/AppDownloadModal.tsx`
- Create: `src/components/web/AppBanner.tsx`
- Create: `src/components/web/AppModalProvider.tsx`
- Modify: `app/_layout.tsx` (mount provider on web)

**Step 1: Create AppDownloadModal**

Full-screen modal with:
- ai-fixly logo/icon
- Hebrew headline: "האפליקציה שלנו עובדת הרבה יותר טוב"
- 3 value props with icons
- "פתח באפליקציה" button (deep link → 2s fallback to store)
- "הורד את האפליקציה" button (direct to store)
- "המשך לאתר" subtle text link (sets 7-day cookie, dismisses)

The deep link is constructed from `usePathname()` — maps 1:1 to `aifixly://{pathname}`.

**Step 2: Create AppBanner**

Small fixed banner at the top of the page:
- One line: "ai-fixly עובד הרבה יותר טוב באפליקציה"
- "פתח" button (deep link)
- "✕" dismiss button

**Step 3: Create AppModalProvider**

Context provider that:
1. On mount, checks `document.cookie` for `aifixly_app_modal_dismissed`
2. If no cookie → show `AppDownloadModal`
3. If cookie exists (within 7 days) → show `AppBanner`
4. On "Continue to site" → sets cookie, switches to banner
5. On banner dismiss → hides banner for session

**Step 4: Mount in root layout**

In `app/_layout.tsx`, inside `RootLayout`:

```typescript
import { Platform } from 'react-native';

// Inside RootLayout's return, BEFORE the Stack:
{Platform.OS === 'web' && <AppModalProvider />}
```

**Step 5: Verify**

- Open web in incognito → full modal appears
- Click "Continue to site" → modal closes, banner shows
- Refresh → banner shows (cookie remembered)
- Clear cookies → full modal again
- Click "Open in App" → deep link fires

**Step 6: Commit**

```bash
git add src/components/web/AppDownloadModal.tsx src/components/web/AppBanner.tsx
git add src/components/web/AppModalProvider.tsx app/_layout.tsx
git commit -m "feat: Reddit-style app download modal + return-visitor banner (web only)"
```

---

## Task 5: SEO Service Pages

**Goal:** 29 static HTML pages, one per profession, auto-generated from problemMatrix.ts.

**Files:**
- Create: `app/services/[profession].tsx`
- Create: `app/services/_layout.tsx`
- Create: `scripts/generate-sitemap.ts`
- Create: `public/robots.txt`

**Step 1: Create the service page layout**

```typescript
// app/services/_layout.tsx
import { Stack } from 'expo-router';

export default function ServicesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

**Step 2: Create the dynamic service page**

```typescript
// app/services/[profession].tsx
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';
import { PROFESSIONS, PROBLEM_MATRIX } from '../../src/constants/problemMatrix';
import type { Profession, Problem } from '../../src/constants/problemMatrix';
import { COLORS } from '../../src/constants';

// Static generation: create one HTML page per profession at build time
export function generateStaticParams() {
  return PROFESSIONS.map(p => ({ profession: p.key }));
}

export default function ServicePage() {
  const { profession } = useLocalSearchParams<{ profession: string }>();

  const prof = PROFESSIONS.find(p => p.key === profession);
  if (!prof) return <Text>Not found</Text>;

  const problems = PROBLEM_MATRIX
    .flatMap(d => d.problems)
    .filter(p => p.professions.includes(profession as any));

  const problemCount = problems.length;

  return (
    <>
      {Platform.OS === 'web' && (
        <Head>
          <title>{prof.labelHe} באזורך - ai-fixly | מצא בעל מקצוע</title>
          <meta
            name="description"
            content={`מחפש ${prof.labelHe}? ai-fixly מחבר אותך עם בעלי מקצוע מובילים. קבל הצעות מחיר תוך דקות. ${problemCount} סוגי בעיות שאנחנו פותרים.`}
          />
          <meta property="og:title" content={`${prof.labelHe} באזורך - ai-fixly`} />
          <meta property="og:description" content={`צלם את הבעיה, קבל הצעות מ${prof.labelHe}ים מובילים`} />
          <meta property="og:type" content="website" />
        </Head>
      )}

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* H1 — profession name */}
        <Text role="heading" aria-level={1} style={styles.h1}>
          {prof.labelHe} באזורך
        </Text>
        <Text style={styles.subtitle}>
          צלם את הבעיה ואנחנו נמצא לך את בעל המקצוע המתאים
        </Text>

        {/* CTA */}
        <Pressable
          style={styles.ctaButton}
          onPress={() => router.push('/capture')}
        >
          <Ionicons name="camera" size={22} color="#FFFFFF" />
          <Text style={styles.ctaText}>דווח על בעיה עכשיו</Text>
        </Pressable>

        {/* H2 — problem list */}
        <Text role="heading" aria-level={2} style={styles.h2}>
          בעיות שאנחנו פותרים
        </Text>
        <View style={styles.problemList}>
          {problems.map(p => (
            <View key={p.id} style={styles.problemItem}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.problemText}>{p.descriptionHe}</Text>
            </View>
          ))}
        </View>

        {/* H2 — how it works */}
        <Text role="heading" aria-level={2} style={styles.h2}>
          איך זה עובד?
        </Text>
        <View style={styles.steps}>
          {[
            { icon: 'camera-outline', text: 'צלם את הבעיה' },
            { icon: 'sparkles-outline', text: 'ה-AI שלנו מזהה מה צריך' },
            { icon: 'people-outline', text: 'בעלי מקצוע שולחים הצעות' },
            { icon: 'checkmark-done-outline', text: 'בחר את הטוב ביותר' },
          ].map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Ionicons name={step.icon as any} size={24} color={COLORS.primary} />
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>

        {/* Bottom CTA */}
        <Pressable
          style={styles.ctaButton}
          onPress={() => router.push('/capture')}
        >
          <Text style={styles.ctaText}>בוא נתחיל →</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

// Styles omitted for brevity — use COLORS from constants,
// RTL-aware layout, semantic sizing for h1/h2
```

**Step 3: Create robots.txt**

Create `public/robots.txt`:
```
User-agent: *
Allow: /
Sitemap: https://aifixly.co.il/sitemap.xml
```

**Step 4: Create sitemap generator**

```typescript
// scripts/generate-sitemap.ts
import { PROFESSIONS } from '../src/constants/problemMatrix';
import fs from 'fs';

const BASE_URL = 'https://aifixly.co.il';

const urls = [
  BASE_URL + '/',
  ...PROFESSIONS.map(p => `${BASE_URL}/services/${p.key}`),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>`;

fs.writeFileSync('dist/sitemap.xml', sitemap, 'utf-8');
console.log(`Generated sitemap.xml with ${urls.length} URLs`);
```

Add to `package.json` scripts:
```json
"build:web": "npx expo export --platform web && npx tsx scripts/generate-sitemap.ts"
```

**Step 5: Verify static generation**

Run: `npm run build:web`

Check `dist/` folder:
- `dist/services/plumber/index.html` exists
- `dist/services/electrician/index.html` exists
- ...29 total
- `dist/sitemap.xml` exists with 30 URLs
- HTML contains `<h1>אינסטלטור באזורך</h1>` (semantic)
- HTML contains `<meta name="description" ...>` (SEO)

**Step 6: Commit**

```bash
git add app/services/ scripts/generate-sitemap.ts public/robots.txt package.json
git commit -m "feat: 29 SEO service pages auto-generated from problem matrix"
```

---

## Task 6: Web platform guards for remaining screens

**Goal:** Fix any remaining screens that crash on web due to native-only APIs.

**Files:**
- Modify: `app/(auth)/permissions.tsx` (skip on web)
- Modify: `app/(auth)/profile-setup.tsx` (web Geolocation fallback)
- Modify: `src/hooks/useNotifications.ts` (no-op on web)
- Modify: `app/_layout.tsx` (skip permissions redirect on web)

**Step 1: Skip permissions screen on web**

In `app/_layout.tsx` AuthGate, modify the permissions redirect:

```typescript
// Web doesn't need native permissions (no POST_NOTIFICATIONS, no Location permission prompt)
const needsPermissions = Platform.OS !== 'web' && !hasCompletedPermissions;

// Replace the permissions gate:
if (isAuthenticated && hasCompletedProfile && needsPermissions && !inPermissions) {
  navigate('/(auth)/permissions');
  return;
}
```

**Step 2: Web Geolocation in profile-setup**

In `app/(auth)/profile-setup.tsx`, add web fallback for location:

```typescript
const handleGetLocation = async () => {
  setIsLoadingLocation(true);
  try {
    if (Platform.OS === 'web') {
      // Web Geolocation API
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
        })
      );
      // Reverse geocode via Google API
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${pos.coords.latitude},${pos.coords.longitude}&language=he&key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY}`
      );
      const data = await res.json();
      const addressStr = data.results?.[0]?.formatted_address || 'המיקום שלי';
      setLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        address: addressStr,
      });
      return;
    }
    // Native: existing expo-location flow
    // ... (unchanged)
  } finally {
    setIsLoadingLocation(false);
  }
};
```

**Step 3: useNotifications no-op on web**

In `src/hooks/useNotifications.ts`, guard the entire hook:

```typescript
export function useNotifications() {
  const uid = useAuthStore((s) => s.user?.uid || null);

  useEffect(() => {
    // Web: no push notifications for MVP. Users see real-time updates
    // via Firestore listeners when the tab is open.
    if (Platform.OS === 'web' || !uid) return;

    // ... rest of native notification setup
  }, [uid]);
}
```

**Step 4: Verify all screens render on web**

Navigate through every screen on web:
- Onboarding → phone → verify → profile-setup → home
- Capture (WebUploadZone) → confirm → sent
- My Requests → Request details → Chat
- Profile

**Step 5: Commit**

```bash
git add app/_layout.tsx app/\(auth\)/profile-setup.tsx src/hooks/useNotifications.ts
git commit -m "fix: web platform guards for permissions, location, notifications"
```

---

## Task 7: Firestore web adapter

**Goal:** Firestore reads/writes work on web using the Firebase Web SDK.

**Context:** The app uses `@react-native-firebase/firestore` which doesn't work on web. On web, we need `firebase/firestore` from the Firebase Web SDK.

**Files:**
- Create: `src/services/firestore/firestoreAdapter.ts` (platform-aware Firestore exports)
- Modify: All services that import from `@react-native-firebase/firestore`

**Step 1: Create the adapter**

This is the trickiest integration piece. Both SDKs have the SAME API shape (modular) but different import paths. Create a single file that re-exports the right one:

```typescript
// src/services/firestore/firestoreAdapter.ts
import { Platform } from 'react-native';

// On web: use Firebase Web SDK
// On native: use React Native Firebase
// Both expose the same modular API surface

let firestoreModule: any;

if (Platform.OS === 'web') {
  firestoreModule = require('firebase/firestore');
} else {
  firestoreModule = require('@react-native-firebase/firestore');
}

export const {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} = firestoreModule;
```

**Step 2: Update all Firestore consumers**

Replace `import { ... } from '@react-native-firebase/firestore'` with `import { ... } from '../firestore/firestoreAdapter'` in:

- `src/services/requests/firebaseRequests.ts`
- `src/services/bids/firebaseBids.ts`
- `src/services/chat/firebaseChat.ts`
- `src/services/notifications/firebaseNotifications.ts`
- `app/(tabs)/profile.tsx`
- `app/(auth)/profile-setup.tsx`

On web, `getFirestore()` needs the Firebase app instance. The web adapter handles this by importing from `firebaseWeb.ts`:

```typescript
// In the adapter, for web:
import { firebaseApp } from '../../config/firebaseWeb';
const db = getFirestore(firebaseApp);
// Wrap getFirestore to always return the initialized instance
```

**Step 3: Verify Firestore works on web**

- Create a request on web
- Verify it appears in Firebase Console
- Verify real-time listeners work (bids update live)

**Step 4: Commit**

```bash
git add src/services/firestore/firestoreAdapter.ts
git add src/services/requests/ src/services/bids/ src/services/chat/
git commit -m "feat: platform-aware Firestore adapter (web + native)"
```

---

## Task 8: Deploy to Cloudflare Pages

**Goal:** Website live at a public URL.

**Step 1: Build the web export**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-fixly
npm run build:web
```

Verify `dist/` contains:
- `index.html` (home)
- `services/plumber/index.html` (29 SEO pages)
- `sitemap.xml`
- JS bundles

**Step 2: Deploy to Cloudflare Pages**

```bash
npx wrangler pages deploy dist/ --project-name ai-fixly-web
```

First run creates the project. Subsequent runs update it.

Output: `https://ai-fixly-web.pages.dev` (or similar)

**Step 3: Verify the deployed site**

- Open the URL in Chrome
- App download modal appears → dismiss
- Navigate through screens
- Create a test request
- Check `wrangler tail` for the broadcast

**Step 4: (Optional) Custom domain**

In Cloudflare Dashboard → Pages → ai-fixly-web → Custom domains → Add:
- `aifixly.co.il` (or your chosen domain)
- Follow DNS setup instructions

**Step 5: Submit sitemap to Google**

Go to Google Search Console → Add property → `aifixly.co.il` → Sitemaps → Add `sitemap.xml`.

**Step 6: Commit**

```bash
git commit -m "feat: deploy ai-fixly website to Cloudflare Pages"
```

---

## Summary

| Task | What | Key Risk |
|------|------|----------|
| 1 | Verify Expo Web builds | Native module crashes |
| 2 | Web auth (reCAPTCHA) | Firebase Web SDK setup |
| 3 | WebUploadZone | File handling on web |
| 4 | App download modal | Cookie logic, deep links |
| 5 | SEO service pages (29) | Static generation config |
| 6 | Platform guards | Screen-by-screen fixes |
| 7 | Firestore web adapter | Dual SDK compatibility |
| 8 | Deploy to Cloudflare Pages | Build + deploy pipeline |

**Estimated effort:** Tasks 1-6 can be done in one session (~4-6 hours). Task 7 (Firestore adapter) is the riskiest — dual-SDK compatibility requires careful testing. Task 8 is mechanical.

**Total new files:** ~10
**Modified files:** ~12
**No code duplication** — same screens, same logic, platform-guarded where needed.
