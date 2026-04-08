import { View, Pressable, StyleSheet, Platform, Text } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBoundary } from '../../src/components/ui';
import { COLORS } from '../../src/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CAPTURE_SIZE = 62;
const NOTCH_SIZE = CAPTURE_SIZE + 20;
const TAB_HEIGHT = 60;

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <ErrorBoundary>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} bottomInset={insets.bottom} />}
      >
        <Tabs.Screen name="index" options={{ title: 'הקריאות שלי' }} />
        <Tabs.Screen name="profile" options={{ title: 'פרופיל' }} />
      </Tabs>
    </ErrorBoundary>
  );
}

function CustomTabBar({ state, navigation, bottomInset }: any) {
  const isLeftFocused = state.index === 0;
  const isRightFocused = state.index === 1;

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(bottomInset, 0) }]}>
      {/* The raised capture button — sits above the bar */}
      <View style={styles.captureContainer}>
        <Pressable onPress={() => router.push('/capture')} style={styles.captureButton}>
          <Ionicons name="scan-outline" size={28} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* The tab bar with a visual notch gap in the middle */}
      <View style={styles.barRow}>
        {/* Left side */}
        <View style={styles.barSide}>
          <Pressable
            onPress={() => navigation.navigate(state.routes[0].name)}
            style={styles.tabItem}
          >
            <Ionicons
              name={isLeftFocused ? 'document-text' : 'document-text-outline'}
              size={24}
              color={isLeftFocused ? COLORS.primary : COLORS.textTertiary}
            />
            <Text style={[
              styles.tabLabel,
              { color: isLeftFocused ? COLORS.primary : COLORS.textTertiary }
            ]}>
              הקריאות שלי
            </Text>
          </Pressable>
        </View>

        {/* Center gap — the notch space */}
        <View style={styles.notchGap} />

        {/* Right side */}
        <View style={styles.barSide}>
          <Pressable
            onPress={() => navigation.navigate(state.routes[1].name)}
            style={styles.tabItem}
          >
            <Ionicons
              name={isRightFocused ? 'person' : 'person-outline'}
              size={24}
              color={isRightFocused ? COLORS.primary : COLORS.textTertiary}
            />
            <Text style={[
              styles.tabLabel,
              { color: isRightFocused ? COLORS.primary : COLORS.textTertiary }
            ]}>
              פרופיל
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
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
  captureContainer: {
    position: 'absolute',
    top: -(CAPTURE_SIZE / 2),
    left: '50%',
    marginLeft: -(CAPTURE_SIZE / 2),
    zIndex: 10,
    // White ring behind the button to create the "notch" illusion
    width: CAPTURE_SIZE + 8,
    height: CAPTURE_SIZE + 8,
    borderRadius: (CAPTURE_SIZE + 8) / 2,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -(CAPTURE_SIZE + 8) / 2,
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
      android: {
        elevation: 10,
      },
    }),
  },
});
