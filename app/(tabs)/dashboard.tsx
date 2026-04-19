import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, ToastAndroid, Platform, Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { VacationToggle } from '../../src/components/provider/VacationToggle';
import { StatsCards } from '../../src/components/provider/StatsCards';
import { BidHistoryCard } from '../../src/components/provider/BidHistoryCard';
import { useProviderProfile } from '../../src/hooks/useProviderProfile';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { subscribeToProviderBidHistory } from '../../src/services/providers/providerHistoryService';
import { computeMonthlyStats } from '../../src/services/providers/providerStats';
import { setVacationMode } from '../../src/services/providers/providerVacationService';
import type { ProviderBidHistoryItem } from '../../src/types/providerProfile';
import { COLORS } from '../../src/constants';

/**
 * Provider Dashboard. Shown only to users with `providerProfile` set
 * (the tab itself is gated in `_layout.tsx`). Three sections:
 *   1. Header with greeting + profession badge.
 *   2. Vacation toggle + this-month stats.
 *   3. Live bid history list (sent / selected / completed / lost / expired).
 *
 * The history is a Firestore live subscription — when a customer picks
 * the provider's bid, the row flips to "selected" without a manual refresh.
 */
export default function DashboardScreen() {
  const { t } = useTranslation();
  const userName = useAuthStore((s) => s.user?.uid || '');
  const { profile, isLoading: isProfileLoading } = useProviderProfile();
  const [history, setHistory] = useState<ProviderBidHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<Error | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // Optimistic vacation state — mirrored from `profile.isOnVacation` but
  // updated immediately on tap so the switch feels responsive even though
  // the broker round-trip + Firestore snapshot take ~500ms.
  const [optimisticVacation, setOptimisticVacation] = useState<boolean | null>(null);
  const [isUpdatingVacation, setIsUpdatingVacation] = useState(false);

  useEffect(() => {
    if (!profile?.phone) {
      setHistory([]);
      setIsHistoryLoading(false);
      return;
    }
    setIsHistoryLoading(true);
    const unsub = subscribeToProviderBidHistory(profile.phone, (items, err) => {
      setHistory(items);
      setHistoryError(err);
      setIsHistoryLoading(false);
    });
    return unsub;
  }, [profile?.phone]);

  // Reset optimistic value once the real value catches up.
  useEffect(() => {
    if (
      optimisticVacation !== null &&
      profile?.isOnVacation === optimisticVacation
    ) {
      setOptimisticVacation(null);
    }
  }, [profile?.isOnVacation, optimisticVacation]);

  const stats = useMemo(
    () => computeMonthlyStats(history, new Date()),
    [history],
  );

  const handleVacationToggle = useCallback(
    async (next: boolean) => {
      setOptimisticVacation(next);
      setIsUpdatingVacation(true);
      try {
        await setVacationMode(next);
        // Real value will arrive via the live snapshot.
      } catch (err) {
        // Roll back optimistic state and tell the user.
        setOptimisticVacation(null);
        const msg = t('providerDashboard.vacationToggleError');
        if (Platform.OS === 'android') {
          ToastAndroid.show(msg, ToastAndroid.LONG);
        } else {
          Alert.alert(msg);
        }
      } finally {
        setIsUpdatingVacation(false);
      }
    },
    [t],
  );

  const refresh = useCallback(() => {
    // The Firestore subscription is live so a manual refresh isn't strictly
    // necessary, but Pull-to-Refresh is a strong "give me the freshest now"
    // signal — we briefly drop the cached history so the UI shows a spinner
    // while the next snapshot arrives.
    setIsHistoryLoading(true);
    setHistoryError(null);
  }, []);

  if (isProfileLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </ScreenContainer>
    );
  }

  // Should never happen — the tab is gated in _layout.tsx — but defensive.
  if (!profile) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Text style={styles.muted}>—</Text>
        </View>
      </ScreenContainer>
    );
  }

  const vacationDisplayed =
    optimisticVacation !== null ? optimisticVacation : profile.isOnVacation;

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isHistoryLoading} onRefresh={refresh} tintColor={COLORS.primary} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('providerDashboard.title')}</Text>
          <Text style={styles.greeting}>
            {t('providerDashboard.greeting', { name: userName.slice(0, 6) })}
          </Text>
          <View style={styles.badgeRow}>
            <Ionicons name="briefcase" size={14} color={COLORS.primary} />
            <Text style={styles.badge}>
              {t('providerDashboard.badge', { profession: profile.professionLabelHe })}
            </Text>
          </View>
        </View>

        <VacationToggle
          value={vacationDisplayed}
          onChange={handleVacationToggle}
          isUpdating={isUpdatingVacation}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('providerDashboard.statsTitle')}</Text>
          <StatsCards stats={stats} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('providerDashboard.historyTitle')}</Text>
          {historyError ? (
            <Text style={styles.error}>{t('providerDashboard.historyLoadError')}</Text>
          ) : history.length === 0 ? (
            <Text style={styles.empty}>{t('providerDashboard.historyEmpty')}</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {history.map((item) => (
                <BidHistoryCard key={item.bidId} item={item} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { gap: 6 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '800' as any },
  greeting: { color: COLORS.textSecondary, fontSize: 14 },
  badgeRow: {
    flexDirection: 'row' as any,
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.primary + '22',
    marginTop: 4,
  },
  badge: { color: COLORS.primary, fontSize: 12, fontWeight: '700' as any },
  section: { gap: 10 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' as any },
  empty: { color: COLORS.textTertiary, fontSize: 13, textAlign: 'center' as any, padding: 20 },
  error: { color: COLORS.error, fontSize: 13, textAlign: 'center' as any },
  muted: { color: COLORS.textTertiary },
});
