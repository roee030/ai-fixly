import { useState, useEffect } from 'react';
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
import { COLORS, SPACING } from '../../src/constants';
import { getFirestore, doc, getDoc } from '../../src/services/firestore/imports';

const RECENT_REQUESTS_LIMIT = 5;
// Show ~85% of the available width per card so the next one peeks in.
const CARD_WIDTH_RATIO = 0.85;
const CARD_GAP = 10;

export default function HomeScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const requests = useRequestsStore((s) => s.requests);
  const [displayName, setDisplayName] = useState('');
  const { width: windowWidth } = useWindowDimensions();

  // Account for ScreenContainer's horizontal padding (SPACING.md on each side).
  const innerWidth = Math.min(windowWidth, 480) - SPACING.md * 2;
  const cardWidth = Math.floor(innerWidth * CARD_WIDTH_RATIO);

  const activeRequests = requests.filter(
    (r) => r.status === REQUEST_STATUS.OPEN || r.status === REQUEST_STATUS.IN_PROGRESS,
  );
  const recentRequests = requests.slice(0, RECENT_REQUESTS_LIMIT);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(getFirestore(), 'users', user.uid))
      .then((snap: any) => {
        const exists = typeof snap.exists === 'function' ? snap.exists() : snap.exists;
        if (exists) setDisplayName(snap.data()?.displayName || '');
      })
      .catch(() => {});
  }, [user]);

  const greeting = displayName ? t('home.greeting', { name: displayName }) : t('home.greetingNoName');

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Greeting */}
        <FadeInView>
          <Text style={styles.greeting}>{greeting}</Text>
          {activeRequests.length > 0 && (
            <Text style={styles.statsText}>
              {t('home.activeRequests', { count: activeRequests.length })}
            </Text>
          )}
        </FadeInView>

        {/* Hero CTA Card */}
        <FadeInView delay={100}>
          <Pressable onPress={() => router.push('/capture')} style={styles.heroCard}>
            <View style={styles.heroCardContent}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="camera" size={26} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroCardTitle}>{t('home.heroTitle')}</Text>
                <Text style={styles.heroCardSubtitle} numberOfLines={2}>
                  {t('home.heroSubtitle')}
                </Text>
              </View>
              <View style={styles.heroCtaBtn}>
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </View>
            </View>
          </Pressable>
        </FadeInView>

        {/* Recent requests carousel — flex:1 so it absorbs leftover height
            without forcing the page to scroll. The horizontal ScrollView is
            extended to the screen edges via negative horizontal margin so
            cards don't visually crash into the container border. */}
        {recentRequests.length > 0 && (
          <FadeInView delay={200} style={styles.carouselSection}>
            <View style={styles.recentHeader}>
              <Ionicons name="document-text-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.recentLabel}>
                {t(recentRequests.length > 1 ? 'home.yourRequests' : 'home.latestRequest')}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={cardWidth + CARD_GAP}
              decelerationRate="fast"
              contentContainerStyle={{
                paddingHorizontal: SPACING.md,
                gap: CARD_GAP,
              }}
              style={{ marginHorizontal: -SPACING.md }}
            >
              {recentRequests.map((req) => (
                <RequestMiniCard
                  key={req.id}
                  request={req}
                  width={cardWidth}
                  onPress={() =>
                    router.push({ pathname: '/request/[id]', params: { id: req.id } })
                  }
                  t={t}
                />
              ))}
            </ScrollView>
          </FadeInView>
        )}

        {/* Quick info cards — pinned to the bottom of the visible area */}
        <FadeInView delay={300}>
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Ionicons name="flash-outline" size={20} color={COLORS.warning} />
              <Text style={styles.infoTitle}>{t('home.fast')}</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.success} />
              <Text style={styles.infoTitle}>{t('home.reliable')}</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="pricetag-outline" size={20} color={COLORS.info} />
              <Text style={styles.infoTitle}>{t('home.fair')}</Text>
            </View>
          </View>
        </FadeInView>
      </View>
    </ScreenContainer>
  );
}

function RequestMiniCard({
  request,
  width,
  onPress,
  t,
}: {
  request: any;
  width: number;
  onPress: () => void;
  t: (k: string, o?: any) => string;
}) {
  const statusColor =
    request.status === 'open'
      ? COLORS.success
      : request.status === 'in_progress'
      ? COLORS.warning
      : COLORS.textTertiary;
  const title =
    (request.aiAnalysis as any)?.shortSummary ||
    request.textDescription ||
    t('home.requestFallback');

  return (
    <Pressable onPress={onPress} style={[styles.miniCard, { width }]}>
      <Text style={styles.miniTitle} numberOfLines={2}>
        {title}
      </Text>
      <View style={styles.miniStatus}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={styles.miniStatusText}>
          {t(`status.${request.status}`, { defaultValue: request.status })}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  statsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  heroCardContent: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  heroCardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  heroCtaBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselSection: {
    flex: 1,
    minHeight: 100,
    marginBottom: 12,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  recentLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  miniCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
    height: 90,
    justifyContent: 'space-between',
  },
  miniTitle: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  miniStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  miniStatusText: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
});
