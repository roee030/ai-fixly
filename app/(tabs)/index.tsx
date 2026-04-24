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
 * Home — zero header, single action.
 *
 * Layout:
 *   HERO_SIZE × HERO_SIZE Pressable captures taps anywhere in the area
 *   (so the expanded pulse rings are part of the hit target, not just
 *   the core circle). Inside:
 *     - Pulse rings: position: absolute, sized to CORE_SIZE, offset to
 *       center via calculated top/left (rings scale via transform so
 *       they extend OUTWARD past the core's bounds).
 *     - Core: a regular flex child that alignItems/justifyContent
 *       centers within the Pressable. The camera icon is its child,
 *       centered the same way.
 */

const HERO_SIZE = 260;
const CORE_SIZE = 156;

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

  // Pulse animation — two rings offset by 1.1s for a continuous heartbeat.
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0.45);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0.3);

  useEffect(() => {
    ring1Scale.value = withRepeat(
      withTiming(1.6, { duration: 2200, easing: Easing.out(Easing.ease) }),
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
        withTiming(1.6, { duration: 2200, easing: Easing.out(Easing.ease) }),
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
      <View style={styles.container}>
        {/* Greeting */}
        <FadeInView>
          <Text style={styles.greeting}>
            שלום, <Text style={{ color: COLORS.primary }}>{firstName || 'אורח'}</Text>
            <Text style={styles.wave}> 👋</Text>
          </Text>
          <Text style={styles.prompt}>יש לך בעיה? נפתור תוך דקות.</Text>
        </FadeInView>

        {/* Hero — the Pressable IS the 260×260 frame so taps anywhere
            (including on the pulsing rings) navigate to capture. A tight
            inner wrapper (heroStack) holds the rings + core and is
            flex-centered inside the Pressable. Every visual child uses
            position:absolute inset:0 against that wrapper, so they all
            share the exact same center — no hardcoded top/left offsets
            that can drift when RTL or device pixel density shifts things. */}
        <View style={styles.heroSection}>
          <Pressable
            onPress={() => router.push('/capture')}
            style={({ pressed }) => [
              styles.heroPressable,
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel="דווח על בעיה"
          >
            <View style={styles.heroStack} pointerEvents="none">
              <Animated.View style={[styles.pulseRing, ring1Style]} pointerEvents="none" />
              <Animated.View style={[styles.pulseRing, ring2Style]} pointerEvents="none" />
              <View style={styles.core}>
                <Ionicons name="camera" size={58} color="#FFFFFF" />
              </View>
            </View>
          </Pressable>

          {/* Title + subtitle below, centered. */}
          <FadeInView delay={100} style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>דווח על בעיה</Text>
            <Text style={styles.heroSubtitle}>צלם, תאר — והצעות מגיעות מיד</Text>
          </FadeInView>
        </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: SPACING.lg,
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

  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  heroPressable: {
    width: HERO_SIZE,
    height: HERO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  heroStack: {
    width: CORE_SIZE,
    height: CORE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: CORE_SIZE / 2,
    backgroundColor: COLORS.primary,
  },
  core: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
