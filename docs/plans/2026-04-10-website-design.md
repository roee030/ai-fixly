# ai-fixly Website — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a full web version of ai-fixly using the existing Expo codebase, with a Reddit-style app-download modal on first visit, 29 SEO service pages auto-generated from the problem matrix, and platform-specific fallbacks for camera/auth/notifications. Deployed to Cloudflare Pages.

**Architecture:** Single codebase — same Expo Router screens render on web via react-native-web. Web-only additions: AppDownloadModal, WebUploadZone, SEO service routes, Firebase Web Auth adapter. No separate framework, no code duplication.

**Tech Stack:** Expo SDK 54 (web export), react-native-web, Expo Router (static + dynamic routes), Firebase Web SDK (auth only), Cloudflare Pages (hosting), problemMatrix.ts (SEO content source).

---

## 1. High-Level Architecture

```
aifixly.co.il
    │
    ├── / (Home)                    ← same as app home, with capture button
    ├── /onboarding                 ← same onboarding carousel
    ├── /(auth)/phone               ← phone auth with invisible reCAPTCHA on web
    ├── /(auth)/verify              ← OTP input (identical)
    ├── /(auth)/profile-setup       ← name + location (web uses Geolocation API)
    ├── /(auth)/permissions         ← SKIP on web (no native permissions needed)
    ├── /(tabs)/                    ← home, requests, profile (same layout)
    ├── /capture/                   ← WebUploadZone on web, camera on native
    ├── /request/[id]               ← bid cards, details, chat CTA
    ├── /chat/[requestId]           ← real-time chat (same Firestore listeners)
    │
    ├── /services/[profession]      ← NEW: 29 static SEO pages (web only)
    │
    └── AppDownloadModal            ← NEW: blocking modal on first visit (web only)
```

**Principle:** Every screen renders on all platforms. We add web-specific code ONLY where a native API doesn't exist. Platform checks use `Platform.OS === 'web'`.

---

## 2. App-Download Modal (Web Only)

### Behavior

| Visitor state | What they see |
|---|---|
| First visit (no cookie) | Full-screen blocking modal with app icon, "Open in App" / "Download" / "Continue to site" |
| Return visit within 7 days (cookie set) | Small top banner: "ai-fixly is better in the app — Open" |
| Cookie expired (>7 days) | Full modal again |
| Navigated from a service page | Deep link targets the same service in the app |

### Modal Design

```
┌─────────────────────────────────┐
│                                 │
│         [ai-fixly logo]         │
│                                 │
│     האפליקציה שלנו עובדת        │
│        הרבה יותר טוב            │
│                                 │
│   📱 צלם בעיה ← קבל הצעות       │
│                                 │
│  ┌─────────────────────────┐    │
│  │    פתח באפליקציה   →    │    │  ← Primary CTA (deep link)
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │   הורד את האפליקציה     │    │  ← Secondary (store link)
│  └─────────────────────────┘    │
│                                 │
│       המשך לאתר ←               │  ← Subtle text link
│                                 │
└─────────────────────────────────┘
```

### Deep Linking from Modal

The "Open in App" button constructs a deep link from the current web pathname:

| Current web URL | Deep link generated | App screen |
|---|---|---|
| `/` | `aifixly://` | Home |
| `/services/plumber` | `aifixly://services/plumber` | Home (plumber context) |
| `/request/abc123` | `aifixly://request/abc123` | Request details |
| `/chat/abc123` | `aifixly://chat/abc123` | Chat |

**Fallback mechanism:** Try the deep link first. After 2 seconds, if the app didn't open (not installed), redirect to the Play Store / App Store. Same pattern as Reddit, Slack, Twitter.

### Cookie Logic

```typescript
// On "Continue to site":
document.cookie = 'aifixly_app_modal_dismissed=1; max-age=604800; path=/';
// 604800 seconds = 7 days

// On page load, check:
const dismissed = document.cookie.includes('aifixly_app_modal_dismissed=1');
// dismissed → show small banner instead of full modal
```

### Component Location

```
src/components/web/
  AppDownloadModal.tsx     ← full-screen modal
  AppBanner.tsx            ← small top banner (return visitors)
  AppModalProvider.tsx     ← context provider, cookie logic, wraps root layout
```

Rendered in `app/_layout.tsx` inside a `Platform.OS === 'web'` guard:

```typescript
{Platform.OS === 'web' && <AppModalProvider />}
```

Native builds tree-shake this code out entirely — zero impact on app bundle.

---

## 3. Platform Fallbacks

### 3.1 Auth — Firebase Phone Auth on Web

**Problem:** React Native Firebase (`@react-native-firebase/auth`) doesn't run on web. Firebase Web SDK (`firebase/auth`) does, but requires a reCAPTCHA verifier.

**Solution:** Platform-split the auth service. On web, use the Firebase Web SDK with an invisible reCAPTCHA.

**Files:**
```
src/services/auth/
  firebaseAuth.ts          ← existing native implementation
  firebaseAuthWeb.ts       ← NEW: web implementation using firebase/auth
  index.ts                 ← platform-aware export
```

**Web auth flow:**
1. User enters phone number, taps "Send Code"
2. `RecaptchaVerifier` with `size: 'invisible'` auto-solves in background (~1s)
3. `signInWithPhoneNumber(auth, phone, verifier)` sends the OTP
4. User enters OTP, `confirmationResult.confirm(code)` completes sign-in
5. Auth state syncs to the app via `onAuthStateChanged` (same listener)

**UI change on web:** A hidden `<div id="recaptcha-container" />` is mounted in the phone screen. Not visible to the user. If the invisible reCAPTCHA fails (rare bot detection), Firebase shows a visible checkbox — we handle this with a small "Verify you're human" message below the phone input.

**Native safety:** The existing `firebaseAuth.ts` is untouched. The `index.ts` export uses `Platform.select` to pick the right implementation. Native users never load the web auth code.

### 3.2 Camera — WebUploadZone

**Problem:** `expo-camera` (live viewfinder) doesn't work on web. `expo-image-picker` has a basic web fallback but it's ugly.

**Solution:** Custom `WebUploadZone` component that provides a polished upload experience.

**File:** `src/components/web/WebUploadZone.tsx`

**Design:**

```
Desktop:
┌─────────────────────────────────────┐
│                                     │
│     ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐       │
│     │  📷  גרור תמונות לכאן  │       │
│     │    או לחץ לבחירה       │       │
│     └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘       │
│                                     │
│   [thumb] [thumb] [thumb]  + Add    │
│                                     │
│   ┌────────────────────────────┐    │
│   │ תאר את הבעיה...            │    │
│   └────────────────────────────┘    │
│                                     │
│   [         המשך          ]         │
│                                     │
└─────────────────────────────────────┘

Mobile web:
Same layout but tap to open native file picker
(camera option available via accept="image/*;capture=camera")
```

**Features:**
- Dashed border drop zone with hover highlight
- Drag-and-drop (desktop): `onDragOver`, `onDrop` handlers
- Click to browse: hidden `<input type="file" accept="image/*" multiple>`
- Mobile web: adding `capture="environment"` opens the camera directly
- Paste from clipboard: `Ctrl+V` / `Cmd+V` pastes images
- Thumbnail preview with remove button
- Same `onPhotosSelected` callback as native — feeds into the shared Supabase upload + AI analysis pipeline

**Platform guard in capture screen:**
```typescript
// app/capture/index.tsx
if (Platform.OS === 'web') {
  return <WebUploadZone onPhotosSelected={handlePhotos} />;
}
return <NativeCameraScreen onPhotosSelected={handlePhotos} />;
```

### 3.3 Push Notifications — Web Push API

**Problem:** FCM native SDK doesn't work on web. Need Web Push API.

**Solution:** For MVP, web users don't get push notifications. They see real-time updates via Firestore listeners (which already work on web). The "new bids" badge and chat messages appear in real-time when the tab is open.

**Future (post-MVP):** Add Firebase Cloud Messaging for Web (FCM JS SDK) which uses the Web Push API. Requires a service worker (`firebase-messaging-sw.js`). Defer to after the website is live and validated.

**Platform guard:** The `useNotifications` hook already has a `uid` check. On web, `requestPermission` and `getToken` will no-op (return false/null). The rest of the app works fine — Firestore listeners handle real-time data.

### 3.4 Location — Geolocation API

**Problem:** `expo-location` doesn't work on web.

**Solution:** Web Geolocation API (`navigator.geolocation`). It's built into every browser and prompts the user the same way.

**Platform split:**
```typescript
if (Platform.OS === 'web') {
  const pos = await new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject)
  );
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}
// Native: existing expo-location flow
```

Reverse geocoding (lat/lng → address): Use the Google Geocoding API (one fetch call) instead of `expo-location`'s `reverseGeocodeAsync`.

---

## 4. SEO Service Pages

### Route: `/services/[profession]`

**File:** `app/services/[profession].tsx`

Auto-generates 29 static HTML pages at build time from `problemMatrix.ts`.

### Static Generation

```typescript
export function generateStaticParams() {
  return PROFESSIONS.map(p => ({ profession: p.key }));
}
// Output: /services/plumber, /services/electrician, ... (29 pages)
```

### Semantic HTML Structure

Each page renders:

```html
<html lang="he" dir="rtl">
<head>
  <title>אינסטלטור באזורך - ai-fixly | מצא בעל מקצוע</title>
  <meta name="description" content="מחפש אינסטלטור? ai-fixly מחבר אותך עם בעלי מקצוע מובילים. קבל הצעות מחיר תוך דקות. 22 סוגי בעיות שאנחנו פותרים." />
  <meta property="og:title" content="אינסטלטור באזורך - ai-fixly" />
  <meta property="og:description" content="צלם את הבעיה, קבל הצעות מאינסטלטורים מובילים" />
  <meta property="og:type" content="website" />
  <link rel="canonical" href="https://aifixly.co.il/services/plumber" />
</head>
<body>
  <header>
    <nav><!-- ai-fixly logo + "הורד את האפליקציה" link --></nav>
  </header>
  <main>
    <h1>אינסטלטור באזורך</h1>
    <p>מחפש אינסטלטור? צלם את הבעיה ואנחנו נמצא לך את בעל המקצוע המתאים.</p>

    <section>
      <h2>בעיות שאנחנו פותרים</h2>
      <ul>
        <li>צינור פרוץ</li>
        <li>ברז מטפטף</li>
        <li>סתימה בכיור</li>
        <!-- ...all problems for this profession from the matrix -->
      </ul>
    </section>

    <section>
      <h2>איך זה עובד?</h2>
      <ol>
        <li>צלם את הבעיה</li>
        <li>ה-AI שלנו מזהה מה צריך</li>
        <li>בעלי מקצוע שולחים הצעות</li>
        <li>בחר את הטוב ביותר</li>
      </ol>
    </section>

    <a href="/capture">דווח על בעיה עכשיו →</a>
  </main>
</body>
</html>
```

**Semantic HTML checklist:**
- `<h1>` = profession name (one per page)
- `<h2>` = section headers (problems, how it works)
- `<ul>/<li>` = problem list (Google loves structured lists)
- `<meta description>` = unique per page, includes problem count
- `<link rel="canonical">` = prevents duplicate content
- `lang="he" dir="rtl"` = tells Google it's Hebrew RTL content
- Structured data (`application/ld+json`) for local business schema (future)

### sitemap.xml

Auto-generated at build time:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://aifixly.co.il/</loc></url>
  <url><loc>https://aifixly.co.il/services/plumber</loc></url>
  <url><loc>https://aifixly.co.il/services/electrician</loc></url>
  <!-- ...29 service pages -->
</urlset>
```

---

## 5. Deployment — Cloudflare Pages

### Build command

```bash
npx expo export --platform web
```

Output goes to `dist/` folder — static HTML + JS bundles.

### Cloudflare Pages config

```
Project name: ai-fixly-web
Build command: npx expo export --platform web
Build output directory: dist
```

### Custom domain

Point `aifixly.co.il` (or chosen domain) to the Cloudflare Pages project. SSL is automatic.

### CI/CD (future)

GitHub Actions: on push to `master`, auto-build and deploy to Cloudflare Pages. For now, manual deploy via `npx wrangler pages deploy dist/`.

---

## 6. Files to Create

| File | Purpose |
|---|---|
| `src/components/web/AppDownloadModal.tsx` | Full-screen "open in app" modal |
| `src/components/web/AppBanner.tsx` | Small top banner for return visitors |
| `src/components/web/AppModalProvider.tsx` | Cookie logic, modal/banner state |
| `src/components/web/WebUploadZone.tsx` | Drag-and-drop photo upload for web |
| `src/services/auth/firebaseAuthWeb.ts` | Web-only Firebase auth with reCAPTCHA |
| `src/services/auth/index.ts` | Platform-aware auth export |
| `app/services/[profession].tsx` | SEO service pages (29 static) |
| `app/services/_layout.tsx` | Service pages layout (SEO head) |
| `scripts/generate-sitemap.ts` | Build-time sitemap generator |
| `public/robots.txt` | Allow all crawlers |

## 7. Files to Modify

| File | Change |
|---|---|
| `app/_layout.tsx` | Add `AppModalProvider` on web |
| `app/capture/index.tsx` | Platform split: camera vs WebUploadZone |
| `app/(auth)/phone.tsx` | Add reCAPTCHA container div on web |
| `app/(auth)/profile-setup.tsx` | Web Geolocation API fallback |
| `app/(auth)/permissions.tsx` | Skip on web (no native permissions) |
| `src/hooks/useNotifications.ts` | No-op on web (defer Web Push to post-MVP) |
| `app.json` | Add `web.bundler`, meta tags config |
| `package.json` | Add `firebase` (web SDK) for auth |

## 8. What NOT to Build (YAGNI)

- ❌ Web Push notifications (defer to post-MVP)
- ❌ PWA/service worker (defer)
- ❌ Server-side rendering (static export is enough for SEO)
- ❌ Separate admin dashboard
- ❌ Web-specific analytics (Firebase Analytics already works on web)
- ❌ i18n (Hebrew only for now, same as app)

## 9. Testing

- **Unit:** WebUploadZone file handling, cookie logic, deep link construction
- **Visual:** Each screen renders correctly on web (manual check in browser)
- **SEO:** Validate HTML structure with Google's Rich Results Test
- **Deep links:** Verify "Open in App" works on Android (with app installed)
- **Auth:** Verify invisible reCAPTCHA completes on web without visible UI
- **Regression:** All existing native tests still pass (`npx jest`)
