import "../global.css";
import { useEffect } from 'react';
import { View, I18nManager } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import { ErrorBoundary } from '../src/components/ui';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { useAuth } from '../src/hooks/useAuth';
import { COLORS } from '../src/constants';
import { analyticsService } from '../src/services/analytics';
import { useNotifications } from '../src/hooks/useNotifications';
import { useAppStore } from '../src/stores/useAppStore';

// Keep splash screen visible until the app is fully ready
SplashScreen.preventAutoHideAsync().catch(() => {});

// Enable RTL for Hebrew
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// Initialize Sentry (disabled if no DSN)
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, hasCompletedProfile } = useAuth();
  const segments = useSegments();
  // Use selectors to avoid recreating references on every render
  const hasSeenOnboarding = useAppStore((s) => s.hasSeenOnboarding);
  const loadOnboardingState = useAppStore((s) => s.loadOnboardingState);
  useNotifications();

  // Stable string version of segments to use as dependency (avoids infinite loop)
  const segmentsKey = segments.join('/');

  useEffect(() => {
    loadOnboardingState();
  }, [loadOnboardingState]);

  // Hide native splash screen as soon as auth is ready
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;

    const inOnboarding = segments[0] === 'onboarding';
    const inAuthGroup = segments[0] === '(auth)';
    const inProfileSetup = segments[1] === 'profile-setup';

    if (!hasSeenOnboarding && !inOnboarding) {
      router.replace('/onboarding');
      return;
    }

    if (hasSeenOnboarding && inOnboarding) {
      // Onboarding done, move forward
      if (!isAuthenticated) {
        router.replace('/(auth)/phone');
      } else if (!hasCompletedProfile) {
        router.replace('/(auth)/profile-setup');
      } else {
        router.replace('/(tabs)');
      }
      return;
    }

    if (!isAuthenticated && !inAuthGroup && !inOnboarding) {
      router.replace('/(auth)/phone');
      return;
    }

    if (isAuthenticated && !hasCompletedProfile && !inProfileSetup) {
      router.replace('/(auth)/profile-setup');
      return;
    }

    if (isAuthenticated && hasCompletedProfile && inAuthGroup) {
      analyticsService.trackEvent('app_opened');
      router.replace('/(tabs)');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, hasCompletedProfile, hasSeenOnboarding, segmentsKey]);

  // Render empty view while loading — native splash is visible until hideAsync()
  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </AuthGate>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
