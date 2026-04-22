import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../../src/components/layout';
import { FadeInView } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useRequestsStore } from '../../src/stores/useRequestsStore';
import { REQUEST_STATUS } from '../../src/constants/status';
import { COLORS, SPACING, RADII } from '../../src/constants';
import { getFirestore, doc, getDoc } from '../../src/services/firestore/imports';

/**
 * Home — zero clutter. One purpose: "tap the big button, report a problem".
 *
 * Content hierarchy:
 *   1. Greeting + one-line prompt ("יש בעיה? נפתור תוך דקות")
 *   2. Giant capture button — fills most of the screen
 *   3. Tiny pill at the bottom linking to active requests, only when relevant
 *
 * Intentionally removed: seasonal tips, stats, info cards, carousels. They
 * were noise that made it unclear what the app does. A handyman service
 * app lives or dies by how fast you can get a photo in. Nothing else.
 */

export default function HomeScreen() {
  const { t } = useTranslation();
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

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Top — greeting + prompt */}
        <FadeInView>
          <Text style={styles.greeting}>
            {firstName ? `שלום, ${firstName} 👋` : 'שלום 👋'}
          </Text>
          <Text style={styles.prompt}>יש לך בעיה? נפתור תוך דקות.</Text>
        </FadeInView>

        {/* Center — the one action. Fills the visual hierarchy. */}
        <FadeInView delay={100} style={styles.centerSpace}>
          <Pressable
            onPress={() => router.push('/capture')}
            style={({ pressed }) => [styles.heroBtn, pressed && styles.heroBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="דווח על בעיה"
          >
            <View style={styles.heroIconCircle}>
              <Ionicons name="camera" size={56} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>דווח על בעיה</Text>
            <Text style={styles.heroSubtitle}>צלם + תאר · הצעות מגיעות מיד</Text>
          </Pressable>
        </FadeInView>

        {/* Bottom — a single, unobtrusive pill when there's active work */}
        {activeCount > 0 && (
          <FadeInView delay={200}>
            <Pressable
              onPress={() => router.push('/(tabs)/requests')}
              style={styles.activePill}
            >
              <View style={styles.pulseDot} />
              <Text style={styles.activePillText}>
                יש לך {activeCount === 1 ? 'בעיה אחת פעילה' : `${activeCount} בעיות פעילות`}
              </Text>
              <Ionicons name="chevron-back" size={16} color={COLORS.primary} />
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
  },
  prompt: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 22,
  },

  centerSpace: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroBtn: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 14,
  },
  heroBtnPressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.3,
  },
  heroIconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 20,
  },

  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    marginTop: SPACING.md,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.7,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  activePillText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
