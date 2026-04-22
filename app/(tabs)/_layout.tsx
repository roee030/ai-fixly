import { View, Pressable, StyleSheet, Platform, Text, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '../../src/components/ui';
import { COLORS } from '../../src/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRequestsStore } from '../../src/stores/useRequestsStore';
import { REQUEST_STATUS } from '../../src/constants/status';
import { useProviderProfile } from '../../src/hooks/useProviderProfile';
import { useLocationGuard } from '../../src/hooks/useLocationGuard';

const CAPTURE_SIZE = 62;
const NOTCH_SIZE = CAPTURE_SIZE + 36;
const TAB_HEIGHT = 60;
const DESKTOP_BREAKPOINT = 768;
const DESKTOP_MAX_WIDTH = 480;

// NOTE: Android hardware-back handling lives in src/hooks/useBackToHome.ts,
// invoked once at the root layout. Don't add a second BackHandler here.

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Bounces the user back to the permissions screen if they revoke
  // location access in system Settings while the app is running.
  useLocationGuard();

  return (
    <ErrorBoundary>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} bottomInset={insets.bottom} />}
      >
        <Tabs.Screen name="requests" options={{ title: t('tabs.myRequests') }} />
        <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
        <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
        {/* Always registered so the Dashboard route exists; the bar
            decides whether to *render* its pill based on isProvider. */}
        <Tabs.Screen name="dashboard" options={{ title: t('providerDashboard.tabLabel') }} />
      </Tabs>
    </ErrorBoundary>
  );
}

function CustomTabBar({ state, navigation, bottomInset }: any) {
  const { t } = useTranslation();
  const { isProvider } = useProviderProfile();

  // Look up route indices by name so the bar's UI doesn't depend on the
  // declaration order of <Tabs.Screen>. Defensive: missing route → -1.
  const routeIdx = (name: string) => state.routes.findIndex((r: any) => r.name === name);
  const requestsIdx = routeIdx('requests');
  const homeIdx = routeIdx('index');
  const profileIdx = routeIdx('profile');
  const dashboardIdx = routeIdx('dashboard');

  const focused = state.index;
  const isCenterFocused = focused === homeIdx;
  const isRequestsFocused = focused === requestsIdx;
  const isProfileFocused = focused === profileIdx;
  const isDashboardFocused = focused === dashboardIdx;

  // Compute unread count for the requests tab badge.
  const requests = useRequestsStore((s) => s.requests);
  const bidCounts = useRequestsStore((s) => s.bidCounts);
  const unreadBaseline = useRequestsStore((s) => s.unreadBaseline);
  let unreadTotal = 0;
  for (const req of requests) {
    if (req.status !== REQUEST_STATUS.OPEN && req.status !== REQUEST_STATUS.PAUSED) continue;
    const count = bidCounts[req.id] || 0;
    const seen = unreadBaseline[req.id]?.lastSeenBidCount || 0;
    unreadTotal += Math.max(0, count - seen);
  }

  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && windowWidth >= DESKTOP_BREAKPOINT;

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(bottomInset, 0), alignItems: isDesktop ? 'center' : undefined }]}>
      <View style={isDesktop ? { width: '100%', maxWidth: DESKTOP_MAX_WIDTH, position: 'relative' } : { position: 'relative' }}>
        {/* Raised center button */}
        <View style={styles.captureContainer}>
          <Pressable
            onPress={() => navigation.navigate(state.routes[homeIdx].name)}
            style={[styles.captureButton, isCenterFocused && styles.captureButtonActive]}
          >
            <Ionicons name="home" size={26} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.barRow}>
          {/* LEFT side — My Requests, then Dashboard if provider */}
          <View style={styles.barSide}>
            <View style={styles.leftCluster}>
              <TabPill
                onPress={() => navigation.navigate(state.routes[requestsIdx].name)}
                iconActive="document-text"
                iconInactive="document-text-outline"
                label={t('tabs.myRequests')}
                focused={isRequestsFocused}
                badge={unreadTotal > 0 ? (unreadTotal > 99 ? '99+' : String(unreadTotal)) : null}
              />
              {isProvider && dashboardIdx >= 0 && (
                <TabPill
                  onPress={() => navigation.navigate(state.routes[dashboardIdx].name)}
                  iconActive="analytics"
                  iconInactive="analytics-outline"
                  label={t('providerDashboard.tabLabel')}
                  focused={isDashboardFocused}
                />
              )}
            </View>
          </View>

          {/* Center gap (raised FAB) */}
          <View style={styles.notchGap} />

          {/* RIGHT side — Profile */}
          <View style={styles.barSide}>
            <TabPill
              onPress={() => navigation.navigate(state.routes[profileIdx].name)}
              iconActive="person"
              iconInactive="person-outline"
              label={t('tabs.profile')}
              focused={isProfileFocused}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

interface TabPillProps {
  onPress: () => void;
  iconActive: string;
  iconInactive: string;
  label: string;
  focused: boolean;
  badge?: string | null;
}

function TabPill({ onPress, iconActive, iconInactive, label, focused, badge }: TabPillProps) {
  return (
    <Pressable onPress={onPress} style={styles.tabItem}>
      <View>
        <Ionicons
          name={(focused ? iconActive : iconInactive) as any}
          size={24}
          color={focused ? COLORS.primary : COLORS.textTertiary}
        />
        {badge && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tabLabel, { color: focused ? COLORS.primary : COLORS.textTertiary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  barRow: {
    flexDirection: 'row',
    height: TAB_HEIGHT,
    alignItems: 'center',
  },
  barSide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  leftCluster: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'center',
  },
  notchGap: {
    width: NOTCH_SIZE,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.backgroundLight,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 12,
  },
  captureContainer: {
    position: 'absolute',
    top: -(CAPTURE_SIZE / 2),
    left: '50%',
    marginLeft: -(CAPTURE_SIZE + 8) / 2,
    zIndex: 10,
    width: CAPTURE_SIZE + 8,
    height: CAPTURE_SIZE + 8,
    borderRadius: (CAPTURE_SIZE + 8) / 2,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: CAPTURE_SIZE,
    height: CAPTURE_SIZE,
    borderRadius: CAPTURE_SIZE / 2,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: { elevation: 10 },
    }),
  },
  captureButtonActive: {
    backgroundColor: COLORS.primaryDark,
  },
});
