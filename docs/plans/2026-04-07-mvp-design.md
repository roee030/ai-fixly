# ai-fixly MVP Design

## Build Strategy: Vertical Slices

Build one complete flow end-to-end before moving to the next. Each slice delivers working functionality.

| Slice | What | Core Value |
|-------|------|------------|
| 1 | Skeleton + Auth | Foundation, user can sign in |
| 2 | Capture -> AI -> Request | Core value prop: problem -> categorized request |
| 3 | Provider Side + Bidding | Supply side: providers see requests, submit bids |
| 4 | Selection + Chat | Close the loop: pick provider, communicate |

---

## Slice 1: Project Skeleton + Authentication

### User Journey

Open app -> Splash -> Sign in (phone OTP) -> Create profile (name) -> Land on Hub (empty state).

### Project Initialization

- Expo SDK (latest) with Expo Router tabs template
- TypeScript strict mode
- NativeWind configured with RTL support
- Firebase SDK: Firestore, Auth, Storage, Analytics, Crashlytics
- Sentry initialized for error tracking
- All constants files scaffolded (theme, limits, animation, layout, categories, status)
- Core type interfaces defined (User, ServiceRequest, Bid, Provider)
- Zod validators for User schema

### Navigation Structure

```
app/
  _layout.tsx              # Root: ErrorBoundary, providers, auth gate
  (auth)/
    _layout.tsx            # Auth stack layout
    phone.tsx              # Phone number input
    verify.tsx             # SMS OTP verification
    profile-setup.tsx      # First-time: enter display name
  (tabs)/
    _layout.tsx            # Tab bar (Hub, History, Profile)
    index.tsx              # Hub - empty state with pulsing capture button
    history.tsx            # History - empty state
    profile.tsx            # Profile & settings
```

### Auth Flow

1. User opens app -> auth gate in root layout checks Firebase Auth state
2. No session -> redirect to (auth)/phone
3. User enters phone number -> Firebase sends SMS OTP
4. User enters OTP on verify screen -> Firebase Auth creates/signs in user
5. First-time user -> redirect to profile-setup (enter name)
6. Returning user -> redirect to Hub
7. Auth state persisted locally (auto-login on app restart)

### Error Handling (Day 1)

```
src/components/ui/
  ErrorBoundary.tsx        # Reusable class component, catches render errors
  ErrorFallback.tsx        # "Something went wrong" UI with retry button
```

**Three layers:**
1. **Global Error Boundary** - wraps entire app in _layout.tsx. Catches fatal crashes, reports to Sentry, shows fallback with retry.
2. **Navigation Error Boundary** - wraps each tab/stack independently. Crash in one tab doesn't kill others.
3. **Async Error Handler** - global unhandled promise rejection handler -> Sentry.

**Sentry integration:**
- Every caught error logged with context (screen name, user ID, action)
- Breadcrumbs for navigation events
- Release tracking tied to EAS build versions

### Firestore Schema

```
users/{uid}
  phone: string
  displayName: string
  createdAt: Timestamp
  lastActiveAt: Timestamp
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users: read/write own document only
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    // Default deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Files Created in Slice 1

```
ai-fixly/
  app/
    _layout.tsx
    (auth)/_layout.tsx
    (auth)/phone.tsx
    (auth)/verify.tsx
    (auth)/profile-setup.tsx
    (tabs)/_layout.tsx
    (tabs)/index.tsx
    (tabs)/history.tsx
    (tabs)/profile.tsx
  src/
    components/
      ui/ErrorBoundary.tsx
      ui/ErrorFallback.tsx
      ui/Button.tsx
      ui/Input.tsx
      ui/ScreenContainer.tsx
      layout/Header.tsx
    hooks/
      useAuth.ts
    services/
      auth/types.ts
      auth/firebaseAuth.ts
    stores/
      useAuthStore.ts
    types/
      user.ts
      serviceRequest.ts
      bid.ts
      provider.ts
    constants/
      theme.ts
      layout.ts
      animation.ts
      limits.ts
      categories.ts
      status.ts
    validators/
      user.ts
    config/
      firebase.ts
  firebase/
    firestore.rules
    storage.rules
  .env.example
```

### What's NOT in Slice 1

No camera, no media upload, no AI, no providers, no bids, no chat, no WhatsApp.

---

## Slice 2: Capture -> AI Analysis -> Request Created

### User Journey

Hub -> long-press capture button -> camera/voice recorder opens -> capture media -> upload to Firebase Storage -> Cloud Function triggers Gemini API -> AI returns category + summary + urgency -> user sees confirmation screen -> approves -> request saved to Firestore (status: OPEN).

### Key Components

- **CaptureButton** - pulsing animated button, long-press to activate
- **CaptureScreen** - Instagram Stories-style, video/photo/voice modes
- **Waveform** - voice recording visualization
- **AIConfirmation** - shows AI analysis, edit or confirm

### AI Pipeline (Cloud Function)

1. Media uploaded to Firebase Storage triggers Cloud Function
2. Function sends media to Gemini API (multimodal)
3. Gemini returns: category, summary (Hebrew), urgency (low/medium/high)
4. Result saved to Firestore under the request document
5. Push notification sent to user: "Analysis ready"

### Firestore Schema Addition

```
serviceRequests/{requestId}
  userId: string (ref to users)
  status: 'draft' | 'open' | 'in_progress' | 'paused' | 'closed'
  media: { type: 'video' | 'image' | 'voice', url: string, storagePath: string }[]
  aiAnalysis: {
    category: string
    summary: string
    urgency: 'low' | 'medium' | 'high'
    confidence: number
    rawResponse: string
  }
  location: { lat: number, lng: number, address: string }
  createdAt: Timestamp
  updatedAt: Timestamp
```

---

## Slice 3: Provider Side + Bidding

### Provider Journey

Receives WhatsApp message with link -> opens web app -> views request (media + AI summary + location on map) -> submits bid (price + ETA) -> waits for customer response.

### Customer Journey

Request is OPEN -> sees bids arriving in real-time on Bidding Wall -> each bid card shows: provider name, price, ETA, Google rating.

### Key Components

- **Provider Web App** (Vite SPA): RequestView, BidForm, ProviderDashboard
- **Customer BiddingWall**: animated stacking cards, real-time Firestore listener
- **Cloud Function**: broadcast request to providers via WhatsApp Business API

### Firestore Schema Addition

```
providers/{providerId}
  phone: string
  displayName: string
  businessName: string
  categories: string[]
  location: { lat: number, lng: number }
  radiusKm: number
  rating: number
  isAvailable: boolean

bids/{bidId}
  requestId: string
  providerId: string
  price: number
  currency: string
  etaMinutes: number
  message: string (optional)
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  createdAt: Timestamp
```

---

## Slice 4: Selection + Chat

### User Journey

Customer selects bid -> status changes to IN_PROGRESS -> other providers notified (bid expired) -> chat screen opens between customer and selected provider -> job timeline visible on Job Details screen.

### Key Components

- **Chat**: real-time messaging via Firestore subcollection
- **JobDetails**: status timeline, controls (pause, close)
- **Notification Function**: notify losing bidders their bid expired

### Firestore Schema Addition

```
serviceRequests/{requestId}/messages/{messageId}
  senderId: string
  text: string
  mediaUrl: string (optional)
  createdAt: Timestamp

serviceRequests/{requestId}
  selectedBidId: string
  selectedProviderId: string
  completedAt: Timestamp (when closed)
```
