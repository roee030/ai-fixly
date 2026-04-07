# Slice 1: Project Skeleton + Authentication — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** User can open the app, sign in with phone number (OTP), and land on the Hub screen with tab navigation.

**Architecture:** Expo Router file-based routing with (auth) and (tabs) groups. Firebase Auth for phone OTP. Zustand for auth state. Error boundaries at root and tab level. All visual values in constants.

**Tech Stack:** Expo SDK 53+, Expo Router, NativeWind v4, @react-native-firebase/app + auth + firestore + crashlytics, Zustand, Zod, React Native Reanimated, Sentry.

**Important:** This project uses @react-native-firebase (native SDK), NOT the JS firebase SDK. This requires EAS development builds — Expo Go will NOT work. Every `npx expo run` needs a dev build via `npx expo prebuild` or `eas build`.

---

### Task 1: Initialize Expo Project

**Files:**
- Create: `ai-fixly/` (Expo project root, inside the repo root)

**Step 1: Create Expo project with default template**

Run from `C:\Users\roeea\OneDrive\Documents\Github\ai-fixly`:

```bash
npx create-expo-app@latest . --template default
```

> Note: Using `.` to create in current directory. If it fails because directory is non-empty, use a temp directory and move files:
> ```bash
> npx create-expo-app@latest temp-app --template default
> cp -r temp-app/* temp-app/.* . 2>/dev/null
> rm -rf temp-app
> ```

**Step 2: Verify project runs**

```bash
npx expo start
```

Expected: Metro bundler starts, QR code displayed. Press `w` for web to quick-verify.

**Step 3: Update tsconfig.json**

Replace content of `tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"],
      "@/app/*": ["./app/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: initialize Expo project with default template"
```

---

### Task 2: Install and Configure NativeWind

**Files:**
- Modify: `package.json` (dependencies)
- Create: `tailwind.config.js`
- Create: `global.css`
- Modify: `metro.config.js`
- Modify: `babel.config.js`
- Modify: `app/_layout.tsx` (import global.css)

**Step 1: Install NativeWind and dependencies**

```bash
npx expo install nativewind tailwindcss react-native-reanimated react-native-safe-area-context
npm install -D tailwindcss prettier-plugin-tailwindcss
```

**Step 2: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

**Step 3: Create global.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 4: Update metro.config.js**

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
```

**Step 5: Update babel.config.js**

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

**Step 6: Add global.css import to app/_layout.tsx**

Add at the very top of `app/_layout.tsx`:
```typescript
import "../global.css";
```

**Step 7: Create nativewind-env.d.ts in project root**

```typescript
/// <reference types="nativewind/types" />
```

**Step 8: Verify NativeWind works**

In any component, test with:
```tsx
<View className="flex-1 bg-black items-center justify-center">
  <Text className="text-white text-2xl">NativeWind Works</Text>
</View>
```

Run: `npx expo start` — verify styled text appears.

**Step 9: Commit**

```bash
git add -A
git commit -m "chore: configure NativeWind with Tailwind CSS"
```

---

### Task 3: Create Constants Files

**Files:**
- Create: `src/constants/theme.ts`
- Create: `src/constants/layout.ts`
- Create: `src/constants/animation.ts`
- Create: `src/constants/limits.ts`
- Create: `src/constants/categories.ts`
- Create: `src/constants/status.ts`
- Create: `src/constants/index.ts`

**Step 1: Create src/constants/theme.ts**

```typescript
export const COLORS = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  background: '#0F0F1A',
  backgroundLight: '#1A1A2E',
  surface: 'rgba(255, 255, 255, 0.06)',
  surfaceHover: 'rgba(255, 255, 255, 0.10)',
  border: 'rgba(255, 255, 255, 0.12)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textTertiary: 'rgba(255, 255, 255, 0.4)',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
} as const;

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
} as const;
```

**Step 2: Create src/constants/layout.ts**

```typescript
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const LAYOUT = {
  SCREEN_WIDTH: width,
  SCREEN_HEIGHT: height,
  TAB_BAR_HEIGHT: 80,
  HEADER_HEIGHT: 56,
  CAPTURE_BUTTON_SIZE: 72,
  MIN_TOUCH_TARGET: 44,
  CONTENT_PADDING: 16,
} as const;
```

**Step 3: Create src/constants/animation.ts**

```typescript
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  PULSE_DURATION: 2000,
  EASING: 'easeInOut',
} as const;
```

**Step 4: Create src/constants/limits.ts**

```typescript
export const LIMITS = {
  MAX_VIDEO_DURATION_SEC: 60,
  MAX_IMAGE_SIZE_MB: 10,
  MAX_IMAGES_PER_REQUEST: 5,
  BID_WINDOW_MINUTES: 30,
  SEARCH_RADIUS_KM: 15,
  MAX_ACTIVE_REQUESTS: 3,
  MIN_BID_PRICE: 50,
  OTP_LENGTH: 6,
  OTP_TIMEOUT_SEC: 60,
  PHONE_NUMBER_MIN_LENGTH: 10,
  DISPLAY_NAME_MIN_LENGTH: 2,
  DISPLAY_NAME_MAX_LENGTH: 50,
} as const;
```

**Step 5: Create src/constants/categories.ts**

```typescript
export interface ServiceCategory {
  id: string;
  labelHe: string;
  labelEn: string;
  icon: string;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: 'plumbing', labelHe: 'אינסטלציה', labelEn: 'Plumbing', icon: 'water' },
  { id: 'electrical', labelHe: 'חשמל', labelEn: 'Electrical', icon: 'flash' },
  { id: 'hvac', labelHe: 'מיזוג אוויר', labelEn: 'HVAC', icon: 'thermometer' },
  { id: 'locksmith', labelHe: 'מנעולן', labelEn: 'Locksmith', icon: 'key' },
  { id: 'appliances', labelHe: 'מכשירי חשמל', labelEn: 'Appliances', icon: 'hardware-chip' },
  { id: 'computers', labelHe: 'מחשבים', labelEn: 'Computers & IT', icon: 'laptop' },
  { id: 'painting', labelHe: 'צביעה', labelEn: 'Painting', icon: 'color-palette' },
  { id: 'cleaning', labelHe: 'ניקיון', labelEn: 'Cleaning', icon: 'sparkles' },
  { id: 'moving', labelHe: 'הובלות', labelEn: 'Moving', icon: 'cube' },
  { id: 'general', labelHe: 'כללי', labelEn: 'General', icon: 'build' },
] as const;
```

**Step 6: Create src/constants/status.ts**

```typescript
export const REQUEST_STATUS = {
  DRAFT: 'draft',
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  CLOSED: 'closed',
} as const;

export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS];

export const REQUEST_STATUS_LABELS: Record<RequestStatus, { he: string; en: string }> = {
  draft: { he: 'טיוטה', en: 'Draft' },
  open: { he: 'פתוח', en: 'Open' },
  in_progress: { he: 'בטיפול', en: 'In Progress' },
  paused: { he: 'מושהה', en: 'Paused' },
  closed: { he: 'סגור', en: 'Closed' },
};

export const BID_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

export type BidStatus = typeof BID_STATUS[keyof typeof BID_STATUS];
```

**Step 7: Create src/constants/index.ts**

```typescript
export * from './theme';
export * from './layout';
export * from './animation';
export * from './limits';
export * from './categories';
export * from './status';
```

**Step 8: Commit**

```bash
git add src/constants/
git commit -m "feat: add all constants files (theme, layout, animation, limits, categories, status)"
```

---

### Task 4: Create Core Type Definitions

**Files:**
- Create: `src/types/user.ts`
- Create: `src/types/serviceRequest.ts`
- Create: `src/types/bid.ts`
- Create: `src/types/provider.ts`
- Create: `src/types/index.ts`

**Step 1: Create src/types/user.ts**

```typescript
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export interface User {
  uid: string;
  phone: string;
  displayName: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  lastActiveAt: FirebaseFirestoreTypes.Timestamp;
}

export interface UserCreateInput {
  phone: string;
  displayName: string;
}
```

**Step 2: Create src/types/serviceRequest.ts**

```typescript
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { RequestStatus } from '@/constants/status';

export interface MediaItem {
  type: 'video' | 'image' | 'voice';
  url: string;
  storagePath: string;
  thumbnailUrl?: string;
}

export interface AIAnalysis {
  category: string;
  summary: string;
  urgency: 'low' | 'medium' | 'high';
  confidence: number;
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface ServiceRequest {
  id: string;
  userId: string;
  status: RequestStatus;
  media: MediaItem[];
  aiAnalysis?: AIAnalysis;
  location?: Location;
  selectedBidId?: string;
  selectedProviderId?: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
  completedAt?: FirebaseFirestoreTypes.Timestamp;
}
```

**Step 3: Create src/types/bid.ts**

```typescript
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { BidStatus } from '@/constants/status';

export interface Bid {
  id: string;
  requestId: string;
  providerId: string;
  price: number;
  currency: string;
  etaMinutes: number;
  message?: string;
  status: BidStatus;
  createdAt: FirebaseFirestoreTypes.Timestamp;
}
```

**Step 4: Create src/types/provider.ts**

```typescript
export interface Provider {
  id: string;
  phone: string;
  displayName: string;
  businessName: string;
  categories: string[];
  location: {
    lat: number;
    lng: number;
  };
  radiusKm: number;
  rating: number;
  isAvailable: boolean;
}
```

**Step 5: Create src/types/index.ts**

```typescript
export type { User, UserCreateInput } from './user';
export type { ServiceRequest, MediaItem, AIAnalysis, Location } from './serviceRequest';
export type { Bid } from './bid';
export type { Provider } from './provider';
```

**Step 6: Commit**

```bash
git add src/types/
git commit -m "feat: add core type definitions (User, ServiceRequest, Bid, Provider)"
```

---

### Task 5: Create Zod Validators

**Files:**
- Create: `src/validators/user.ts`
- Create: `src/validators/index.ts`
- Create: `src/validators/user.test.ts`

**Step 1: Install Zod**

```bash
npx expo install zod
```

**Step 2: Write the failing test — src/validators/user.test.ts**

```typescript
import { userCreateSchema, phoneNumberSchema, otpSchema } from './user';

describe('phoneNumberSchema', () => {
  it('accepts valid Israeli phone number', () => {
    expect(() => phoneNumberSchema.parse('+972501234567')).not.toThrow();
  });

  it('rejects empty string', () => {
    expect(() => phoneNumberSchema.parse('')).toThrow();
  });

  it('rejects too short number', () => {
    expect(() => phoneNumberSchema.parse('+972')).toThrow();
  });
});

describe('otpSchema', () => {
  it('accepts 6-digit code', () => {
    expect(() => otpSchema.parse('123456')).not.toThrow();
  });

  it('rejects 5-digit code', () => {
    expect(() => otpSchema.parse('12345')).toThrow();
  });

  it('rejects non-numeric', () => {
    expect(() => otpSchema.parse('12345a')).toThrow();
  });
});

describe('userCreateSchema', () => {
  it('accepts valid input', () => {
    const result = userCreateSchema.parse({
      phone: '+972501234567',
      displayName: 'Test User',
    });
    expect(result.displayName).toBe('Test User');
  });

  it('trims displayName whitespace', () => {
    const result = userCreateSchema.parse({
      phone: '+972501234567',
      displayName: '  Test User  ',
    });
    expect(result.displayName).toBe('Test User');
  });

  it('rejects short displayName', () => {
    expect(() =>
      userCreateSchema.parse({ phone: '+972501234567', displayName: 'A' })
    ).toThrow();
  });
});
```

**Step 3: Run test to verify it fails**

```bash
npx jest src/validators/user.test.ts
```

Expected: FAIL — module './user' not found.

**Step 4: Implement src/validators/user.ts**

```typescript
import { z } from 'zod';
import { LIMITS } from '@/constants/limits';

export const phoneNumberSchema = z
  .string()
  .min(LIMITS.PHONE_NUMBER_MIN_LENGTH, 'Phone number is too short')
  .regex(/^\+?[0-9]+$/, 'Invalid phone number format');

export const otpSchema = z
  .string()
  .length(LIMITS.OTP_LENGTH, `OTP must be ${LIMITS.OTP_LENGTH} digits`)
  .regex(/^[0-9]+$/, 'OTP must contain only digits');

export const userCreateSchema = z.object({
  phone: phoneNumberSchema,
  displayName: z
    .string()
    .trim()
    .min(LIMITS.DISPLAY_NAME_MIN_LENGTH, 'Name is too short')
    .max(LIMITS.DISPLAY_NAME_MAX_LENGTH, 'Name is too long'),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
```

**Step 5: Create src/validators/index.ts**

```typescript
export { phoneNumberSchema, otpSchema, userCreateSchema } from './user';
export type { UserCreateInput } from './user';
```

**Step 6: Run test to verify it passes**

```bash
npx jest src/validators/user.test.ts
```

Expected: 7 tests PASS.

**Step 7: Commit**

```bash
git add src/validators/ package.json package-lock.json
git commit -m "feat: add Zod validators for user input with tests"
```

---

### Task 6: Install and Configure Firebase

**Files:**
- Modify: `app.json` (plugins, android/ios config)
- Create: `src/config/firebase.ts`
- Create: `firebase/firestore.rules`
- Create: `firebase/storage.rules`
- Create: `.env.example`

**Step 1: Install Firebase packages**

```bash
npx expo install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore @react-native-firebase/crashlytics @react-native-firebase/analytics expo-build-properties
```

**Step 2: Update app.json with Firebase plugins**

Add to the `expo` object in `app.json`:

```json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "@react-native-firebase/crashlytics",
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ]
    ],
    "android": {
      "googleServicesFile": "./google-services.json",
      "package": "com.aifixly.app"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist",
      "bundleIdentifier": "com.aifixly.app"
    }
  }
}
```

**Step 3: Create src/config/firebase.ts**

```typescript
import { getFirestore } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

// Firebase is auto-initialized by @react-native-firebase/app
// via google-services.json (Android) and GoogleService-Info.plist (iOS)

export const db = getFirestore();
export const auth = getAuth();
```

**Step 4: Create firebase/firestore.rules**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users: read/write own document only
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Default: deny everything
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Step 5: Create firebase/storage.rules**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can upload to their own folder
    match /users/{uid}/{allPaths=**} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if request.auth != null
                   && request.auth.uid == uid
                   && request.resource.size < 50 * 1024 * 1024;
    }

    // Default: deny everything
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

**Step 6: Create .env.example**

```bash
# Firebase config files (download from Firebase Console)
# Place google-services.json in project root (Android)
# Place GoogleService-Info.plist in project root (iOS)

# Sentry
SENTRY_DSN=

# Gemini AI (Slice 2)
GEMINI_API_KEY=

# WhatsApp Business API (Slice 3)
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

**Step 7: Update .gitignore — add Firebase service files**

Append to `.gitignore`:
```
# Firebase service account files
google-services.json
GoogleService-Info.plist
```

**Step 8: Commit**

```bash
git add src/config/ firebase/ .env.example app.json .gitignore package.json package-lock.json
git commit -m "feat: configure Firebase (Auth, Firestore, Crashlytics) with security rules"
```

---

### Task 7: Create Error Boundary Components

**Files:**
- Create: `src/components/ui/ErrorBoundary.tsx`
- Create: `src/components/ui/ErrorFallback.tsx`

**Step 1: Install Sentry**

```bash
npx expo install @sentry/react-native
```

**Step 2: Create src/components/ui/ErrorFallback.tsx**

```tsx
import { View, Text, Pressable } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: COLORS.background }}>
      <Text className="text-4xl mb-4">!</Text>
      <Text className="text-xl font-bold text-center mb-2" style={{ color: COLORS.text }}>
        משהו השתבש
      </Text>
      <Text className="text-sm text-center mb-8" style={{ color: COLORS.textSecondary }}>
        אנחנו מתנצלים על התקלה. נסה שוב.
      </Text>
      <Pressable
        onPress={resetError}
        className="px-8 py-3 rounded-xl"
        style={{ backgroundColor: COLORS.primary }}
      >
        <Text className="text-white font-bold text-base">נסה שוב</Text>
      </Pressable>
    </View>
  );
}
```

**Step 3: Create src/components/ui/ErrorBoundary.tsx**

```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react-native';
import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || ErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}
```

**Step 4: Commit**

```bash
git add src/components/ui/ package.json package-lock.json
git commit -m "feat: add ErrorBoundary and ErrorFallback components with Sentry reporting"
```

---

### Task 8: Create Auth Service

**Files:**
- Create: `src/services/auth/types.ts`
- Create: `src/services/auth/firebaseAuth.ts`
- Create: `src/services/auth/index.ts`

**Step 1: Create src/services/auth/types.ts**

```typescript
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

export interface AuthService {
  signInWithPhone(phoneNumber: string): Promise<PhoneSignInResult>;
  confirmOtp(verificationId: string, code: string): Promise<FirebaseAuthTypes.UserCredential>;
  signOut(): Promise<void>;
  getCurrentUser(): FirebaseAuthTypes.User | null;
  onAuthStateChanged(callback: (user: FirebaseAuthTypes.User | null) => void): () => void;
}

export interface PhoneSignInResult {
  verificationId: string;
}
```

**Step 2: Create src/services/auth/firebaseAuth.ts**

```typescript
import {
  getAuth,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import { AuthService, PhoneSignInResult } from './types';

class FirebaseAuthService implements AuthService {
  private auth = getAuth();

  async signInWithPhone(phoneNumber: string): Promise<PhoneSignInResult> {
    const confirmation = await signInWithPhoneNumber(this.auth, phoneNumber);
    return { verificationId: confirmation.verificationId };
  }

  async confirmOtp(
    verificationId: string,
    code: string
  ): Promise<FirebaseAuthTypes.UserCredential> {
    const credential = PhoneAuthProvider.credential(verificationId, code);
    return this.auth.signInWithCredential(credential);
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(this.auth);
  }

  getCurrentUser(): FirebaseAuthTypes.User | null {
    return this.auth.currentUser;
  }

  onAuthStateChanged(
    callback: (user: FirebaseAuthTypes.User | null) => void
  ): () => void {
    return firebaseOnAuthStateChanged(this.auth, callback);
  }
}

export const authService: AuthService = new FirebaseAuthService();
```

**Step 3: Create src/services/auth/index.ts**

```typescript
export { authService } from './firebaseAuth';
export type { AuthService, PhoneSignInResult } from './types';
```

**Step 4: Commit**

```bash
git add src/services/auth/
git commit -m "feat: add auth service with phone sign-in (interface + Firebase implementation)"
```

---

### Task 9: Create Auth Store (Zustand)

**Files:**
- Create: `src/stores/useAuthStore.ts`
- Create: `src/hooks/useAuth.ts`

**Step 1: Install Zustand**

```bash
npx expo install zustand
```

**Step 2: Create src/stores/useAuthStore.ts**

```typescript
import { create } from 'zustand';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

interface AuthState {
  user: FirebaseAuthTypes.User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasCompletedProfile: boolean;
  setUser: (user: FirebaseAuthTypes.User | null) => void;
  setLoading: (loading: boolean) => void;
  setHasCompletedProfile: (completed: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  hasCompletedProfile: false,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  setHasCompletedProfile: (hasCompletedProfile) => set({ hasCompletedProfile }),
  reset: () =>
    set({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      hasCompletedProfile: false,
    }),
}));
```

**Step 3: Create src/hooks/useAuth.ts**

```typescript
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { authService } from '@/services/auth';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';

export function useAuth() {
  const { setUser, setLoading, setHasCompletedProfile } = useAuthStore();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        // Check if user has completed profile
        const userDoc = await getDoc(doc(getFirestore(), 'users', user.uid));
        setHasCompletedProfile(userDoc.exists && !!userDoc.data()?.displayName);
      } else {
        setHasCompletedProfile(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [setUser, setLoading, setHasCompletedProfile]);

  return useAuthStore();
}
```

**Step 4: Commit**

```bash
git add src/stores/ src/hooks/ package.json package-lock.json
git commit -m "feat: add auth store (Zustand) and useAuth hook"
```

---

### Task 10: Create Base UI Components

**Files:**
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Input.tsx`
- Create: `src/components/layout/ScreenContainer.tsx`
- Create: `src/components/ui/index.ts`
- Create: `src/components/layout/index.ts`

**Step 1: Create src/components/ui/Button.tsx**

```tsx
import { Pressable, Text, ActivityIndicator, ViewStyle } from 'react-native';
import { COLORS } from '@/constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  const bgColor =
    variant === 'primary'
      ? COLORS.primary
      : variant === 'secondary'
        ? COLORS.surface
        : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className="py-4 rounded-xl items-center justify-center flex-row"
      style={[
        { backgroundColor: bgColor, opacity: isDisabled ? 0.5 : 1 },
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={COLORS.text} />
      ) : (
        <Text className="text-white font-bold text-base">{title}</Text>
      )}
    </Pressable>
  );
}
```

**Step 2: Create src/components/ui/Input.tsx**

```tsx
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '@/constants';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View className="w-full mb-4">
      {label && (
        <Text
          className="mb-2 text-sm"
          style={{ color: COLORS.textSecondary }}
        >
          {label}
        </Text>
      )}
      <TextInput
        className="w-full py-4 px-4 rounded-xl text-base"
        style={[
          {
            backgroundColor: COLORS.surface,
            color: COLORS.text,
            fontSize: FONT_SIZES.md,
            borderWidth: error ? 1 : 0,
            borderColor: error ? COLORS.error : 'transparent',
          },
          style,
        ]}
        placeholderTextColor={COLORS.textTertiary}
        {...props}
      />
      {error && (
        <Text
          className="mt-1 text-xs"
          style={{ color: COLORS.error }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
```

**Step 3: Create src/components/layout/ScreenContainer.tsx**

```tsx
import { View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '@/constants';

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
}

export function ScreenContainer({
  children,
  padded = true,
  style,
  ...props
}: ScreenContainerProps) {
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }}>
      <View
        className="flex-1"
        style={[padded && { paddingHorizontal: SPACING.md }, style]}
        {...props}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
```

**Step 4: Create src/components/ui/index.ts**

```typescript
export { Button } from './Button';
export { Input } from './Input';
export { ErrorBoundary } from './ErrorBoundary';
export { ErrorFallback } from './ErrorFallback';
```

**Step 5: Create src/components/layout/index.ts**

```typescript
export { ScreenContainer } from './ScreenContainer';
```

**Step 6: Commit**

```bash
git add src/components/
git commit -m "feat: add base UI components (Button, Input, ScreenContainer)"
```

---

### Task 11: Build Auth Screens

**Files:**
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(auth)/phone.tsx`
- Create: `app/(auth)/verify.tsx`
- Create: `app/(auth)/profile-setup.tsx`

**Step 1: Create app/(auth)/_layout.tsx**

```tsx
import { Stack } from 'expo-router';
import { COLORS } from '@/constants';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
```

**Step 2: Create app/(auth)/phone.tsx**

```tsx
import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/layout';
import { Button, Input } from '@/components/ui';
import { phoneNumberSchema } from '@/validators';
import { authService } from '@/services/auth';
import { COLORS } from '@/constants';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async () => {
    setError('');

    const result = phoneNumberSchema.safeParse(phone);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const { verificationId } = await authService.signInWithPhone(phone);
      router.push({
        pathname: '/(auth)/verify',
        params: { verificationId, phone },
      });
    } catch (err) {
      setError('Failed to send verification code. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center"
      >
        <Text className="text-3xl font-bold mb-2" style={{ color: COLORS.text }}>
          ברוכים הבאים
        </Text>
        <Text className="text-base mb-8" style={{ color: COLORS.textSecondary }}>
          הכנס מספר טלפון לקבלת קוד אימות
        </Text>

        <Input
          label="מספר טלפון"
          placeholder="+972501234567"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          error={error}
        />

        <Button
          title="שלח קוד"
          onPress={handleSendOtp}
          isLoading={isLoading}
          disabled={phone.length < 10}
        />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
```

**Step 3: Create app/(auth)/verify.tsx**

```tsx
import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/layout';
import { Button, Input } from '@/components/ui';
import { otpSchema } from '@/validators';
import { authService } from '@/services/auth';
import { COLORS, LIMITS } from '@/constants';

export default function VerifyScreen() {
  const { verificationId, phone } = useLocalSearchParams<{
    verificationId: string;
    phone: string;
  }>();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    setError('');

    const result = otpSchema.safeParse(code);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      await authService.confirmOtp(verificationId, code);
      // Auth state change will be caught by useAuth hook
      // which will redirect to profile-setup or tabs
    } catch (err) {
      setError('קוד שגוי. נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center"
      >
        <Text className="text-3xl font-bold mb-2" style={{ color: COLORS.text }}>
          קוד אימות
        </Text>
        <Text className="text-base mb-8" style={{ color: COLORS.textSecondary }}>
          הקוד נשלח ל-{phone}
        </Text>

        <Input
          label="קוד אימות"
          placeholder="000000"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={LIMITS.OTP_LENGTH}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          error={error}
        />

        <Button
          title="אמת"
          onPress={handleVerify}
          isLoading={isLoading}
          disabled={code.length !== LIMITS.OTP_LENGTH}
        />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
```

**Step 4: Create app/(auth)/profile-setup.tsx**

```tsx
import { useState } from 'react';
import { Text, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/layout';
import { Button, Input } from '@/components/ui';
import { userCreateSchema } from '@/validators';
import { useAuthStore } from '@/stores/useAuthStore';
import { getFirestore, doc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { COLORS } from '@/constants';

export default function ProfileSetupScreen() {
  const user = useAuthStore((s) => s.user);
  const setHasCompletedProfile = useAuthStore((s) => s.setHasCompletedProfile);

  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setError('');

    const result = userCreateSchema.safeParse({
      phone: user.phoneNumber || '',
      displayName: name,
    });

    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      await setDoc(doc(getFirestore(), 'users', user.uid), {
        phone: user.phoneNumber,
        displayName: result.data.displayName,
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      });
      setHasCompletedProfile(true);
      router.replace('/(tabs)');
    } catch (err) {
      setError('שגיאה בשמירת הפרופיל. נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center"
      >
        <Text className="text-3xl font-bold mb-2" style={{ color: COLORS.text }}>
          מה השם שלך?
        </Text>
        <Text className="text-base mb-8" style={{ color: COLORS.textSecondary }}>
          כך בעלי מקצוע יוכלו לפנות אליך
        </Text>

        <Input
          label="שם"
          placeholder="השם שלך"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          error={error}
        />

        <Button
          title="בוא נתחיל"
          onPress={handleSave}
          isLoading={isLoading}
          disabled={name.trim().length < 2}
        />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
```

**Step 5: Commit**

```bash
git add app/\(auth\)/
git commit -m "feat: add auth screens (phone input, OTP verification, profile setup)"
```

---

### Task 12: Build Tab Screens (Empty States)

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `app/(tabs)/index.tsx`
- Create: `app/(tabs)/history.tsx`
- Create: `app/(tabs)/profile.tsx`

**Step 1: Replace app/(tabs)/_layout.tsx**

```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, LAYOUT } from '@/constants';
import { ErrorBoundary } from '@/components/ui';

export default function TabLayout() {
  return (
    <ErrorBoundary>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textTertiary,
          tabBarStyle: {
            backgroundColor: COLORS.backgroundLight,
            borderTopColor: COLORS.border,
            height: LAYOUT.TAB_BAR_HEIGHT,
            paddingBottom: 8,
            paddingTop: 8,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'בית',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'היסטוריה',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'פרופיל',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </ErrorBoundary>
  );
}
```

**Step 2: Replace app/(tabs)/index.tsx (Hub — empty state)**

```tsx
import { View, Text } from 'react-native';
import { ScreenContainer } from '@/components/layout';
import { COLORS } from '@/constants';

export default function HubScreen() {
  return (
    <ScreenContainer>
      <View className="flex-1 items-center justify-center">
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: COLORS.primary }}
        >
          <Text className="text-white text-3xl">+</Text>
        </View>
        <Text className="text-xl font-bold mb-2" style={{ color: COLORS.text }}>
          יש תקלה?
        </Text>
        <Text className="text-sm text-center" style={{ color: COLORS.textSecondary }}>
          לחץ לחיצה ארוכה על הכפתור כדי לצלם או להקליט את הבעיה
        </Text>
      </View>
    </ScreenContainer>
  );
}
```

**Step 3: Create app/(tabs)/history.tsx**

```tsx
import { View, Text } from 'react-native';
import { ScreenContainer } from '@/components/layout';
import { COLORS } from '@/constants';

export default function HistoryScreen() {
  return (
    <ScreenContainer>
      <Text className="text-2xl font-bold mt-4 mb-6" style={{ color: COLORS.text }}>
        היסטוריה
      </Text>
      <View className="flex-1 items-center justify-center">
        <Text className="text-base" style={{ color: COLORS.textSecondary }}>
          אין קריאות קודמות
        </Text>
      </View>
    </ScreenContainer>
  );
}
```

**Step 4: Create app/(tabs)/profile.tsx**

```tsx
import { View, Text, Pressable } from 'react-native';
import { ScreenContainer } from '@/components/layout';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores/useAuthStore';
import { authService } from '@/services/auth';
import { COLORS } from '@/constants';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);

  const handleSignOut = async () => {
    await authService.signOut();
  };

  return (
    <ScreenContainer>
      <Text className="text-2xl font-bold mt-4 mb-6" style={{ color: COLORS.text }}>
        פרופיל
      </Text>
      <View className="flex-1">
        <View
          className="p-4 rounded-xl mb-4"
          style={{ backgroundColor: COLORS.surface }}
        >
          <Text className="text-sm mb-1" style={{ color: COLORS.textSecondary }}>
            טלפון
          </Text>
          <Text className="text-base" style={{ color: COLORS.text }}>
            {user?.phoneNumber || '-'}
          </Text>
        </View>
      </View>
      <Button title="התנתק" onPress={handleSignOut} variant="secondary" />
    </ScreenContainer>
  );
}
```

**Step 5: Commit**

```bash
git add app/\(tabs\)/
git commit -m "feat: add tab screens with empty states (Hub, History, Profile)"
```

---

### Task 13: Wire Up Root Layout with Auth Gate

**Files:**
- Modify: `app/_layout.tsx`

**Step 1: Replace app/_layout.tsx**

```tsx
import "../global.css";
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { ErrorBoundary } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants';

// Initialize Sentry
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, hasCompletedProfile } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/phone');
    } else if (isAuthenticated && !hasCompletedProfile && segments[1] !== 'profile-setup') {
      router.replace('/(auth)/profile-setup');
    } else if (isAuthenticated && hasCompletedProfile && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, hasCompletedProfile, segments]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthGate>
    </ErrorBoundary>
  );
}
```

**Step 2: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: add root layout with auth gate, error boundary, and Sentry init"
```

---

### Task 14: Create Firebase Project and Test

**Step 1: Create Firebase project**

1. Go to https://console.firebase.google.com
2. Create project: "ai-fixly"
3. Enable Authentication > Phone provider
4. Create Firestore database (production mode)
5. Download `google-services.json` (Android) -> place in project root
6. Download `GoogleService-Info.plist` (iOS) -> place in project root

**Step 2: Create development build**

```bash
npx expo prebuild
npx expo run:android
# or
npx expo run:ios
```

Or using EAS:
```bash
eas build --profile development --platform android
```

**Step 3: Test auth flow**

1. Open app -> should redirect to phone screen
2. Enter phone number -> receive OTP
3. Enter OTP -> redirect to profile setup
4. Enter name -> redirect to Hub
5. Kill app, reopen -> should go directly to Hub (session persisted)
6. Go to Profile tab -> sign out -> should redirect to phone screen

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: Slice 1 complete - skeleton + auth flow working"
```

---

## Summary of Commits

| # | Message | What |
|---|---------|------|
| 1 | chore: initialize Expo project | Project skeleton |
| 2 | chore: configure NativeWind | Styling |
| 3 | feat: add constants files | Theme, limits, categories, status |
| 4 | feat: add core type definitions | User, ServiceRequest, Bid, Provider |
| 5 | feat: add Zod validators with tests | Input validation |
| 6 | feat: configure Firebase | Auth, Firestore, rules |
| 7 | feat: add ErrorBoundary | Error handling + Sentry |
| 8 | feat: add auth service | Phone sign-in interface |
| 9 | feat: add auth store + hook | Zustand state |
| 10 | feat: add base UI components | Button, Input, ScreenContainer |
| 11 | feat: add auth screens | Phone, OTP, Profile setup |
| 12 | feat: add tab screens | Hub, History, Profile |
| 13 | feat: add root layout | Auth gate, error boundary |
| 14 | chore: Slice 1 complete | Integration test |
