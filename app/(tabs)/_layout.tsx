import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBoundary } from '../../src/components/ui';
import { COLORS } from '../../src/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CAPTURE_SIZE = 64;

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <ErrorBoundary>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} bottomInset={insets.bottom} />}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'הקריאות שלי' }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: 'פרופיל' }}
        />
      </Tabs>
    </ErrorBoundary>
  );
}

function CustomTabBar({ state, descriptors, navigation, bottomInset }: any) {
  const isLeftFocused = state.index === 0;
  const isRightFocused = state.index === 1;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottomInset, 8) }]}>
      <View style={styles.tabBar}>
        {/* Left tab - My Requests */}
        <Pressable
          onPress={() => navigation.navigate(state.routes[0].name)}
          style={styles.tabItem}
        >
          <Ionicons
            name="list-outline"
            size={24}
            color={isLeftFocused ? COLORS.primary : COLORS.textTertiary}
          />
        </Pressable>

        {/* Center capture button */}
        <View style={styles.centerButtonWrapper}>
          <Pressable
            onPress={() => router.push('/capture')}
            style={styles.captureButton}
          >
            <Ionicons name="scan-outline" size={28} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Right tab - Profile */}
        <Pressable
          onPress={() => navigation.navigate(state.routes[1].name)}
          style={styles.tabItem}
        >
          <Ionicons
            name="person-outline"
            size={24}
            color={isRightFocused ? COLORS.primary : COLORS.textTertiary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 24,
    height: 64,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  centerButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -32,
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
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
});
