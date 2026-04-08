import "../global.css";
import { useEffect } from 'react';
import { ActivityIndicator, View, I18nManager } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { ErrorBoundary } from '../src/components/ui';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { useAuth } from '../src/hooks/useAuth';
import { COLORS } from '../src/constants';
import { analyticsService } from '../src/services/analytics';
import { useNotifications } from '../src/hooks/useNotifications';
import { useAppStore } from '../src/stores/useAppStore';

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
  const { hasSeenOnboarding, loadOnboardingState } = useAppStore();
  useNotifications();

  useEffect(() => {
    loadOnboardingState();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!hasSeenOnboarding && !segments.includes('onboarding' as never)) {
      router.replace('/onboarding');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/phone');
    } else if (isAuthenticated && !hasCompletedProfile && segments[1] !== 'profile-setup') {
      router.replace('/(auth)/profile-setup');
    } else if (isAuthenticated && hasCompletedProfile && inAuthGroup) {
      analyticsService.trackEvent('app_opened');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, hasCompletedProfile, hasSeenOnboarding, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
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
