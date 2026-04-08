import { View, Pressable, StyleSheet, Platform, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBoundary } from '../../src/components/ui';
import { COLORS } from '../../src/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CAPTURE_SIZE = 62;
const NOTCH_SIZE = CAPTURE_SIZE + 36;
const TAB_HEIGHT = 60;

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <ErrorBoundary>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} bottomInset={insets.bottom} />}
      >
        <Tabs.Screen name="requests" options={{ title: 'הקריאות שלי' }} />
        <Tabs.Screen name="index" options={{ title: 'בית' }} />
        <Tabs.Screen name="profile" options={{ title: 'פרופיל' }} />
      </Tabs>
    </ErrorBoundary>
  );
}

function CustomTabBar({ state, navigation, bottomInset }: any) {
  const isLeftFocused = state.index === 0;
  const isCenterFocused = state.index === 1;
  const isRightFocused = state.index === 2;

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(bottomInset, 0) }]}>
      {/* Raised center button */}
      <View style={styles.captureContainer}>
        <Pressable
          onPress={() => navigation.navigate(state.routes[1].name)}
          style={[styles.captureButton, isCenterFocused && styles.captureButtonActive]}
        >
          <Ionicons name="home" size={26} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.barRow}>
        {/* Left - My Requests */}
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
            <Text style={[styles.tabLabel, { color: isLeftFocused ? COLORS.primary : COLORS.textTertiary }]}>
              הקריאות שלי
            </Text>
          </Pressable>
        </View>

        {/* Center gap */}
        <View style={styles.notchGap} />

        {/* Right - Profile */}
        <View style={styles.barSide}>
          <Pressable
            onPress={() => navigation.navigate(state.routes[2].name)}
            style={styles.tabItem}
          >
            <Ionicons
              name={isRightFocused ? 'person' : 'person-outline'}
              size={24}
              color={isRightFocused ? COLORS.primary : COLORS.textTertiary}
            />
            <Text style={[styles.tabLabel, { color: isRightFocused ? COLORS.primary : COLORS.textTertiary }]}>
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
