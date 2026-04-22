import { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { FadeInView } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useRequestsStore } from '../../src/stores/useRequestsStore';
import { REQUEST_STATUS } from '../../src/constants/status';
import { COLORS, SPACING } from '../../src/constants';
import { getFirestore, doc, getDoc } from '../../src/services/firestore/imports';

/**
 * Home — minimal, action-first.
 *
 * The hero is a three-ring animated pulse: the outer two rings expand and
 * fade in a staggered loop, giving the screen a live 'heartbeat' without
 * overwhelming motion. The core (solid circle with camera) stays static
 * so the tap target is predictable.
 */

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const requests = useRequestsStore((s) => s.requests);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (!user) return;
    getDoc(doc(getFirestore(), 'users', user.uid))
      .then((snap: any) => {
        const exists = typeof snap.exists === 'function' ? snap.exists() : snap.exists;
        if (exists) setDisplayName(snap.data()?.displayName || '');
      })
      .catch(() => {});
  }, [user]);

  const activeCount = useMemo(
    () => requests.filter(
      (r) => r.status === REQUEST_STATUS.OPEN || r.status === REQUEST_STATUS.IN_PROGRESS,
    ).length,
    [requests],
  );

  const firstName = (displayName || '').split(' ')[0] || '';
  const initial = firstName ? firstName.charAt(0).toUpperCase() : '?';

  // Two ring animations — outer pulses expand and fade on a slow loop,
  // offset from each other so the effect is continuous.
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0.5);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0.3);

  useEffect(() => {
    ring1Scale.value = withRepeat(
      withTiming(1.18, { duration: 2200, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    ring1Opacity.value = withRepeat(
      withTiming(0, { duration: 2200, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    ring2Scale.value = withDelay(
      1100,
      withRepeat(
        withTiming(1.25, { duration: 2200, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
    ring2Opacity.value = withDelay(
      1100,
      withRepeat(
        withTiming(0, { duration: 2200, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
  }, []);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  return (
    <ScreenContainer>
      {/* Top bar — avatar + bell only, no brand text */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          style={styles.avatarBtn}
          accessibilityLabel="פרופיל"
        >
          <Text style={styles.avatarText}>{initial}</Text>
        </Pressable>
        <View style={styles.iconBtn}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
        </View>
      </View>

      <View style={styles.container}>
        {/* Greeting */}
        <FadeInView>
          <Text style={styles.greeting}>
            שלום, <Text style={{ color: COLORS.primary }}>{firstName || 'אורח'}</Text>
            <Text style={styles.wave}> 👋</Text>
          </Text>
          <Text style={styles.prompt}>יש לך בעיה? נפתור תוך דקות.</Text>
        </FadeInView>

        {/* Hero — pulsing animated rings BEHIND a solid core.
            All three layers are absolute-positioned at the same x/y
            anchor so they stack concentrically instead of drifting. */}
        <View style={styles.heroWrap}>
          <Pressable
            onPress={() => router.push('/capture')}
            style={({ pressed }) => [
              styles.heroContent,
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel="דווח על בעיה"
          >
            <Animated.View style={[styles.pulseRing, ring1Style]} pointerEvents="none" />
            <Animated.View style={[styles.pulseRing, ring2Style]} pointerEvents="none" />
            <View style={styles.coreCircle}>
              <Ionicons name="camera" size={52} color="#FFFFFF" />
            </View>
          </Pressable>

          {/* Title + subtitle under the ring, centered */}
          <FadeInView delay={100} style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>דווח על בעיה</Text>
            <Text style={styles.heroSubtitle}>
              צלם, תאר — והצעות מגיעות מיד
            </Text>
          </FadeInView>
        </View>

        {/* Active pill */}
        {activeCount > 0 && (
          <FadeInView delay={200}>
            <Pressable
              onPress={() => router.push('/(tabs)/requests')}
              style={styles.activePill}
            >
              <View style={styles.activePillLeft}>
                <Ionicons name="construct-outline" size={18} color={COLORS.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activePillTitle}>
                    יש לך {activeCount === 1 ? 'בעיה אחת פעילה' : `${activeCount} בעיות פעילות`}
                  </Text>
                  <Text style={styles.activePillSubtitle}>
                    לחץ לצפייה בהצעות ובחירה
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-back" size={18} color={COLORS.success} />
            </Pressable>
          </FadeInView>
        )}
      </View>
    </ScreenContainer>
  );
}

const CORE_SIZE = 140;
const RING_SIZE = 220;

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '25',
    borderWidth: 1,
    borderColor: COLORS.primary + '60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: {
    flex: 1,
    paddingVertical: SPACING.md,
  },

  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 32,
    textAlign: 'center',
  },
  wave: { fontSize: 24 },
  prompt: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 22,
    textAlign: 'center',
  },

  heroWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  heroContent: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Rings anchor to the CENTER of heroContent via explicit top/left.
  // alignItems: 'center' alone doesn't center absolute-positioned
  // siblings in React Native — the anchor defaults to (0,0). Using a
  // computed offset guarantees all three stacked layers share the same
  // center point regardless of platform.
  pulseRing: {
    position: 'absolute',
    top: (RING_SIZE - CORE_SIZE) / 2,
    left: (RING_SIZE - CORE_SIZE) / 2,
    width: CORE_SIZE,
    height: CORE_SIZE,
    borderRadius: CORE_SIZE / 2,
    backgroundColor: COLORS.primary,
  },
  coreCircle: {
    position: 'absolute',
    top: (RING_SIZE - CORE_SIZE) / 2,
    left: (RING_SIZE - CORE_SIZE) / 2,
    width: CORE_SIZE,
    height: CORE_SIZE,
    borderRadius: CORE_SIZE / 2,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  heroTextWrap: {
    alignItems: 'center',
    gap: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },

  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: COLORS.success + '18',
    borderWidth: 1,
    borderColor: COLORS.success + '55',
    marginTop: SPACING.md,
  },
  activePillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  activePillTitle: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '800',
  },
  activePillSubtitle: {
    fontSize: 11,
    color: COLORS.success + 'CC',
    marginTop: 2,
  },
});
