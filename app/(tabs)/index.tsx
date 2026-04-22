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
import { COLORS, SPACING } from '../../src/constants';
import { getFirestore, doc, getDoc } from '../../src/services/firestore/imports';

/**
 * Home — minimal, action-first.
 *
 * Top bar: avatar (→ profile), centred app name, bell (→ notifications,
 * future-ready). Middle: a concentric-ring gradient hero button that
 * dominates the screen — camera inside the ring, title + subtitle below.
 * Bottom: a bright-green pill appearing only when active requests exist,
 * routing to the requests tab.
 *
 * Inspired by a reference design supplied by the product owner; adapted
 * to the existing color palette + i18n conventions.
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
  const initial = firstName ? firstName.charAt(0).toUpperCase() : '?';

  return (
    <ScreenContainer>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          style={styles.avatarBtn}
          accessibilityLabel="פרופיל"
        >
          <Text style={styles.avatarText}>{initial}</Text>
        </Pressable>
        <Text style={styles.brandText}>ai-fixly</Text>
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

        {/* Hero ring — the one action. */}
        <FadeInView delay={100} style={styles.centerSpace}>
          <Pressable
            onPress={() => router.push('/capture')}
            style={({ pressed }) => [styles.heroWrap, pressed && { transform: [{ scale: 0.97 }] }]}
            accessibilityRole="button"
            accessibilityLabel="דווח על בעיה"
          >
            {/* Outer glow ring */}
            <View style={styles.ringOuter}>
              {/* Inner gradient ring */}
              <View style={styles.ringInner}>
                <View style={styles.coreCircle}>
                  <Ionicons name="camera" size={48} color="#FFFFFF" />
                </View>
              </View>
            </View>
            <Text style={styles.heroTitle}>דווח על בעיה</Text>
            <View style={styles.heroSubPill}>
              <Text style={styles.heroSubText}>צלם + תאר · הצעות מגיעות מיד</Text>
            </View>
          </Pressable>
        </FadeInView>

        {/* Active pill (green) — only when there's work in progress */}
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
  brandText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
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
  },
  wave: { fontSize: 24 },
  prompt: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 22,
  },

  centerSpace: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Three concentric circles create a glow/ring effect similar to the
  // reference design, without a gradient library dependency.
  heroWrap: {
    alignItems: 'center',
    gap: 14,
  },
  ringOuter: {
    width: 248,
    height: 248,
    borderRadius: 124,
    backgroundColor: COLORS.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: 204,
    height: 204,
    borderRadius: 102,
    backgroundColor: COLORS.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  coreCircle: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 6,
  },
  heroSubPill: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroSubText: {
    color: COLORS.textSecondary,
    fontSize: 13,
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
