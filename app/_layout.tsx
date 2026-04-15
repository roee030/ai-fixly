import "../global.css";
import '../src/i18n'; // Initialize i18n before any component renders
import { applyPersistedLanguage } from '../src/i18n';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ErrorBoundary } from '../src/components/ui';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { useAuth } from '../src/hooks/useAuth';
import { analyticsService } from '../src/services/analytics';
import { useNotifications } from '../src/hooks/useNotifications';
import { useAppStore } from '../src/stores/useAppStore';

// Disable React DevTools in production to prevent inspection
if (typeof window !== 'undefined' && !__DEV__) {
  try {
    const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook && typeof hook === 'object') {
      Object.keys(hook).forEach((key) => { hook[key] = typeof hook[key] === 'function' ? () => {} : undefined; });
    }
  } catch {
    // Some browsers make this property read-only — ignore
  }
}

// Keep splash screen visible until the app is fully ready
SplashScreen.preventAutoHideAsync().catch(() => {});

// RTL is now handled dynamically by src/i18n/index.ts based on device language

// Initialize Sentry — only on native (@sentry/react-native is not web-compatible)
if (Platform.OS !== 'web') {
  const Sentry = require('@sentry/react-native');
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
    enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  });
}

// Kick off loading persisted state (onboarding flag, permissions flag) at
// module load. AuthGate awaits this before hiding the splash screen so the
// first render already has the correct redirect target — no flicker.
const persistedStatePromise = useAppStore.getState().loadPersistedState();

// Apply saved language on native (async — web is handled sync during i18n init).
// Fire-and-forget: UI will switch once resolved. Users who never changed language
// see DEFAULT_LANGUAGE (he) immediately.
applyPersistedLanguage().catch(() => {});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, hasCompletedProfile } = useAuth();
  const segments = useSegments();
  // Only subscribe to the primitive booleans - no actions
  const hasSeenOnboarding = useAppStore((s) => s.hasSeenOnboarding);
  const hasCompletedPermissions = useAppStore((s) => s.hasCompletedPermissions);
  useNotifications();

  // Wait for Expo Router's root navigator to mount before navigating.
  // Calling router.replace() before this is ready throws
  // "Attempted to navigate before mounting the Root Layout component".
  const rootNavState = useRootNavigationState();
  const isNavigationReady = !!rootNavState?.key;

  // Stable string version of segments to use as dependency
  const segmentsKey = segments.join('/');

  // Guard against repeated navigation to the same destination
  const lastDestination = useRef<string | null>(null);

  // Hide native splash screen only after:
  //  1. Firebase auth is ready (isLoading=false)
  //  2. Persisted state (onboarding + permissions flags) is loaded
  // This prevents the "onboarding flashes then disappears" bug.
  useEffect(() => {
    if (isLoading) return;
    let cancelled = false;
    persistedStatePromise.then(() => {
      if (!cancelled) SplashScreen.hideAsync().catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [isLoading]);

  // On web, wait an extra 300ms after auth resolves before navigating.
  // This prevents the flash where the AuthGate briefly sees isAuthenticated=false
  // (Firebase Web SDK fires null first, then the real user from IndexedDB).
  const [isSettled, setIsSettled] = useState(Platform.OS !== 'web');
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (isLoading) { setIsSettled(false); return; }
    const timer = setTimeout(() => setIsSettled(true), 300);
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;
    if (!isSettled) return;
    if (!isNavigationReady) return;

    // CRITICAL: defer navigation to a macrotask. Per the Expo Router docs
    // (https://docs.expo.dev/router/advanced/authentication-rewrites), calling
    // router.replace() synchronously from a root layout useEffect can throw
    // "Attempted to navigate before mounting the Root Layout component" because
    // the root Stack may still be committing when the effect fires. setTimeout
    // pushes the navigate call out of the current React commit cycle, by which
    // point Stack is guaranteed to be fully mounted and routable.
    const timer = setTimeout(() => {
      // Dev gallery bypass — allow navigating to any screen without redirects
      if (__DEV__) {
        const { devBypass } = require('../src/stores/devBypass');
        if (devBypass.get()) {
          lastDestination.current = null;
          return;
        }
      }

      const inOnboarding = segments[0] === 'onboarding';
      const inAuthGroup = segments[0] === '(auth)';
      const inProfileSetup = segments[1] === 'profile-setup';
      const inPermissions = segments[1] === 'permissions';
      const inOutOfArea = (segments[1] as string) === 'out-of-area';

      const navigate = (to: string) => {
        if (lastDestination.current === to) return; // prevent re-nav to same place
        lastDestination.current = to;
        router.replace(to as any);
      };

      // Onboarding flow
      if (!hasSeenOnboarding && !inOnboarding) {
        navigate('/onboarding');
        return;
      }

      // On web, skip the native permissions screen entirely — browsers handle
      // geolocation & notification prompts natively.
      const needsPermissions = Platform.OS !== 'web' && !hasCompletedPermissions;

      if (hasSeenOnboarding && inOnboarding) {
        if (!isAuthenticated) navigate('/(auth)/phone');
        else if (!hasCompletedProfile) navigate('/(auth)/profile-setup');
        else if (needsPermissions) navigate('/(auth)/permissions');
        else navigate('/(tabs)');
        return;
      }

      // Routes that handle their own auth (no AuthGate redirects)
      // - /join: public provider signup
      // - /admin: has its own UID check + "access denied" screen
      // - /services/*: public SEO pages
      // - /(dev)/*: dev tools with devBypass
      // - /provider/*: public quote / report forms (provider arrives via WhatsApp link)
      const selfManagedRoute = ['join', 'admin', 'services', '(dev)', 'legal', 'provider'].includes(segments[0]);
      // App routes that require auth but shouldn't trigger redirect loops
      const inAppRoute = ['capture', 'request', 'chat', 'review'].includes(segments[0]);

      // Auth gates — skip for self-managed routes (they handle auth internally)
      if (selfManagedRoute) {
        lastDestination.current = null;
        return;
      }

      if (!isAuthenticated && !inAuthGroup && !inOnboarding && !inAppRoute) {
        navigate('/(auth)/phone');
        return;
      }

      if (isAuthenticated && !hasCompletedProfile && !inProfileSetup && !inOutOfArea) {
        navigate('/(auth)/profile-setup');
        return;
      }

      // Permissions gate - after profile setup, before reaching tabs (native only)
      if (
        isAuthenticated &&
        hasCompletedProfile &&
        needsPermissions &&
        !inPermissions
      ) {
        navigate('/(auth)/permissions');
        return;
      }

      // Fully onboarded - kick out of the auth group into the app
      if (
        isAuthenticated &&
        hasCompletedProfile &&
        !needsPermissions &&
        inAuthGroup
      ) {
        analyticsService.trackEvent('app_opened');
        navigate('/(tabs)');
        return;
      }

      // Stable state - clear the ref so future legitimate navigations can happen
      lastDestination.current = null;
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAuthenticated,
    isLoading,
    isSettled,
    hasCompletedProfile,
    hasCompletedPermissions,
    hasSeenOnboarding,
    segmentsKey,
    isNavigationReady,
  ]);

  // Always render children so the root navigator mounts on first render.
  // useRootNavigationState() only becomes ready once Stack is mounted, so
  // we can't hide Stack behind a loading view — that would deadlock navigation.
  // The native splash screen (controlled via SplashScreen.hideAsync above)
  // covers the visual loading state instead.
  return <>{children}</>;
}

function WebAppModal() {
  if (Platform.OS !== 'web') return null;
  const { AppModalProvider } = require('../src/components/web/AppModalProvider.web');
  return <AppModalProvider />;
}

function WebSettingsBarWrapper() {
  if (Platform.OS !== 'web') return null;
  try {
    const { WebSettingsBar } = require('../src/components/web/WebSettingsBar.web');
    return <WebSettingsBar />;
  } catch {
    return null;
  }
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthGate>
          <WebAppModal />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(dev)" />
            <Stack.Screen name="capture" />
            <Stack.Screen name="request" />
            <Stack.Screen name="chat" />
            <Stack.Screen name="review" />
            <Stack.Screen name="services" />
            <Stack.Screen name="admin" />
            <Stack.Screen name="join" />
            <Stack.Screen name="legal" />
          </Stack>
          <WebSettingsBarWrapper />
        </AuthGate>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
