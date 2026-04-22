import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  useWindowDimensions,
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
 * Home tab — "Living Dashboard" design.
 *
 * The screen morphs based on whether the user has an active request:
 *   - Active request exists → prominent status card at top showing live
 *     progress (bids arriving, time elapsed) + the capture CTA below.
 *   - No active request → soft greeting + oversized capture CTA as the
 *     primary action + seasonal hint + closed-this-month counter.
 *
 * Intentionally NOT a static grid of features ("fast/reliable/fair" etc).
 * That was generic marketing content; this is a workspace the user returns
 * to mid-problem to check status.
 */

export default function HomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const requests = useRequestsStore((s) => s.requests);
  const [displayName, setDisplayName] = useState('');
  const { width: windowWidth } = useWindowDimensions();

  useEffect(() => {
    if (!user) return;
    getDoc(doc(getFirestore(), 'users', user.uid))
      .then((snap: any) => {
        const exists = typeof snap.exists === 'function' ? snap.exists() : snap.exists;
        if (exists) setDisplayName(snap.data()?.displayName || '');
      })
      .catch(() => {});
  }, [user]);

  const activeRequests = useMemo(
    () => requests.filter(
      (r) => r.status === REQUEST_STATUS.OPEN || r.status === REQUEST_STATUS.IN_PROGRESS,
    ),
    [requests],
  );
  const primaryActive = activeRequests[0];

  const closedThisMonth = useMemo(() => {
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    return requests.filter((r) => {
      if (r.status !== REQUEST_STATUS.CLOSED) return false;
      const d = r.completedAt || r.updatedAt || r.createdAt;
      if (!d) return false;
      const dt = new Date(d);
      return dt.getMonth() === thisMonth && dt.getFullYear() === thisYear;
    }).length;
  }, [requests]);

  const firstName = (displayName || '').split(' ')[0] || '';
  const greeting = firstName
    ? t('home.greeting', { name: firstName })
    : t('home.greetingNoName');

  return (
    <ScreenContainer>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Greeting */}
        <FadeInView>
          <Text style={styles.greeting}>
            {greeting} <Text style={styles.wave}>👋</Text>
          </Text>
          <Text style={styles.subgreeting}>
            {primaryActive ? t('home.activeHint', 'יש לך בעיה בטיפול') : t('home.idleHint', 'איך אוכל לעזור היום?')}
          </Text>
        </FadeInView>

        {/* Active-request live status pill — only when there's something active.
            Click takes you to the request detail. */}
        {primaryActive && (
          <FadeInView delay={80}>
            <ActiveRequestCard request={primaryActive} t={t} />
          </FadeInView>
        )}

        {/* Oversized capture CTA — the heart of the app. */}
        <FadeInView delay={120}>
          <Pressable
            onPress={() => router.push('/capture')}
            style={({ pressed }) => [styles.captureCard, pressed && { opacity: 0.92 }]}
            accessibilityRole="button"
            accessibilityLabel={t('home.captureCta', 'דווח על בעיה חדשה')}
          >
            <View style={styles.captureIconCircle}>
              <Ionicons name="camera" size={34} color="#FFFFFF" />
            </View>
            <Text style={styles.captureTitle}>
              {primaryActive
                ? t('home.captureAnotherTitle', 'דווח על בעיה נוספת')
                : t('home.captureTitle', 'צלם את הבעיה')}
            </Text>
            <Text style={styles.captureSubtitle}>
              {t('home.captureSubtitle', 'צלם או תאר — הצעות מגיעות תוך דקות')}
            </Text>
          </Pressable>
        </FadeInView>

        {/* Seasonal tip (only when idle — avoid cluttering the focus on an
            active problem). */}
        {!primaryActive && (
          <FadeInView delay={180}>
            <SeasonalTip t={t} />
          </FadeInView>
        )}

        {/* This-month stat — warm, quiet affirmation that the app is useful. */}
        {closedThisMonth > 0 && (
          <FadeInView delay={240}>
            <View style={styles.statRow}>
              <View style={styles.statIconWrap}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              </View>
              <Text style={styles.statText}>
                {t('home.closedThisMonth', { count: closedThisMonth, defaultValue: `{{count}} בעיות נסגרו החודש` })}
              </Text>
            </View>
          </FadeInView>
        )}

        {/* Historical requests strip — flattened to horizontal scroll
            only when there are past (non-active) ones. */}
        {(() => {
          const past = requests.filter((r) => r.id !== primaryActive?.id).slice(0, 5);
          if (past.length === 0) return null;
          return (
            <FadeInView delay={300} style={{ marginTop: SPACING.md }}>
              <Text style={styles.sectionTitle}>
                {t('home.recentRequests', 'בקשות אחרונות')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingRight: SPACING.md }}
              >
                {past.map((req) => (
                  <Pressable
                    key={req.id}
                    onPress={() => router.push({ pathname: '/request/[id]', params: { id: req.id } })}
                    style={styles.pastCard}
                  >
                    <View style={[styles.pastDot, { backgroundColor: statusColor(req.status) }]} />
                    <Text style={styles.pastText} numberOfLines={2}>
                      {(req.aiAnalysis as any)?.shortSummary ||
                       (req as any).textDescription ||
                       t('home.requestFallback', 'בקשה')}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </FadeInView>
          );
        })()}
      </ScrollView>
    </ScreenContainer>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Active-request live status card
// ══════════════════════════════════════════════════════════════════════════

function ActiveRequestCard({ request, t }: { request: any; t: (k: string, o?: any) => string }) {
  const bids = (request as any).broadcastedProviders?.length ?? 0;
  const minutesOpen = Math.max(0, Math.round(
    (Date.now() - new Date(request.createdAt).getTime()) / 60000,
  ));
  const elapsedText = minutesOpen < 60
    ? t('home.minutesAgo', { count: minutesOpen, defaultValue: `לפני {{count}} דקות` })
    : t('home.hoursAgo', {
        count: Math.floor(minutesOpen / 60),
        defaultValue: `לפני {{count}} שעות`,
      });

  const title =
    (request.aiAnalysis as any)?.shortSummary ||
    (request as any).textDescription ||
    t('home.activeRequestFallback', 'בעיה פעילה');

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/request/[id]', params: { id: request.id } })}
      style={styles.activeCard}
    >
      <View style={styles.activeHeader}>
        <View style={styles.livePulse} />
        <Text style={styles.activeBadge}>{t('home.activeBadge', 'בעיה פעילה')}</Text>
      </View>
      <Text style={styles.activeTitle} numberOfLines={2}>{title}</Text>
      <View style={styles.activeMeta}>
        <View style={styles.activeMetaItem}>
          <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.activeMetaText}>{elapsedText}</Text>
        </View>
        <View style={styles.activeMetaDivider} />
        <View style={styles.activeMetaItem}>
          <Ionicons name="chatbubbles-outline" size={14} color={COLORS.primary} />
          <Text style={[styles.activeMetaText, { color: COLORS.primary, fontWeight: '700' }]}>
            {t('home.bidsCount', { count: bids, defaultValue: `{{count}} הצעות` })}
          </Text>
        </View>
      </View>
      <View style={styles.activeCta}>
        <Text style={styles.activeCtaText}>{t('home.viewOffers', 'צפה בהצעות')}</Text>
        <Ionicons name="arrow-back" size={14} color={COLORS.primary} />
      </View>
    </Pressable>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Seasonal hint — a small, light suggestion based on the current month
// ══════════════════════════════════════════════════════════════════════════

function SeasonalTip({ t }: { t: (k: string, o?: any) => string }) {
  const tip = useMemo(() => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return { icon: 'sunny-outline' as const, text: t('home.tipSpring', 'האביב כאן — זמן טוב לבדוק מזגן לפני הקיץ') };
    if (month >= 5 && month <= 7) return { icon: 'flame-outline' as const, text: t('home.tipSummer', 'הקיץ בשיאו — מזגן מתקשה? אל תחכה שיישבר') };
    if (month >= 8 && month <= 10) return { icon: 'leaf-outline' as const, text: t('home.tipFall', 'לפני החורף — כדאי לבדוק איטום חלונות וגגות') };
    return { icon: 'snow-outline' as const, text: t('home.tipWinter', 'גשמים עלולים לחשוף נזילות — דווח מוקדם') };
  }, [t]);

  return (
    <View style={styles.tipCard}>
      <View style={styles.tipIconWrap}>
        <Ionicons name={tip.icon} size={18} color={COLORS.warning} />
      </View>
      <Text style={styles.tipText}>{tip.text}</Text>
    </View>
  );
}

function statusColor(status: string): string {
  if (status === REQUEST_STATUS.OPEN) return COLORS.warning;
  if (status === REQUEST_STATUS.IN_PROGRESS) return COLORS.primary;
  if (status === REQUEST_STATUS.CLOSED) return COLORS.success;
  return COLORS.textTertiary;
}

// ══════════════════════════════════════════════════════════════════════════
// Styles
// ══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  content: {
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },

  // Greeting
  greeting: { fontSize: 26, fontWeight: '800', color: COLORS.text, lineHeight: 32 },
  wave: { fontSize: 24 },
  subgreeting: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },

  // Active request card
  activeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    padding: SPACING.md,
    gap: 10,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  activeBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  activeTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, lineHeight: 22 },
  activeMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activeMetaDivider: { width: 1, height: 14, backgroundColor: COLORS.border },
  activeMetaText: { fontSize: 12, color: COLORS.textSecondary },
  activeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  activeCtaText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },

  // Capture card — the anchor action. Bigger than before so it dominates
  // when no active request competes for attention.
  captureCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADII.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  captureIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  captureTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  captureSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 19,
  },

  // Seasonal tip
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.warning + '14',
    borderRadius: RADII.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
  },
  tipIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.warning + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 19 },

  // Stat row
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.success + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },

  // Past requests strip
  sectionTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginBottom: 8,
  },
  pastCard: {
    width: 160,
    padding: SPACING.sm,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  pastDot: { width: 8, height: 8, borderRadius: 4 },
  pastText: { fontSize: 12, color: COLORS.text, lineHeight: 17 },
});
