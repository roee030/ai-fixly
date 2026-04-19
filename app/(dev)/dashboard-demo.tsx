import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ScreenContainer } from '../../src/components/layout';
import { VacationToggle } from '../../src/components/provider/VacationToggle';
import { StatsCards } from '../../src/components/provider/StatsCards';
import { BidHistoryCard } from '../../src/components/provider/BidHistoryCard';
import { computeMonthlyStats } from '../../src/services/providers/providerStats';
import type { ProviderBidHistoryItem } from '../../src/types/providerProfile';
import { COLORS } from '../../src/constants';

/**
 * Gallery-only preview of the Provider Dashboard. Renders the same
 * header + stats + history components as the real dashboard, but with
 * hard-coded mock data so design can be reviewed without the user
 * actually being a registered provider.
 *
 * DO NOT link to this from production screens — it's under /(dev)/.
 */
export default function DashboardDemoScreen() {
  const { t } = useTranslation();
  const [isOnVacation, setIsOnVacation] = useState(false);

  const now = new Date();
  const stats = computeMonthlyStats(MOCK_HISTORY, now);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.demoBanner}>
          <Ionicons name="flask" size={14} color={COLORS.warning} />
          <Text style={styles.demoBannerText}>
            תצוגה מקדימה (מסך דמו — נתונים לדוגמה, לא מחוברים ל-Firestore)
          </Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>{t('providerDashboard.title')}</Text>
          <Text style={styles.greeting}>
            {t('providerDashboard.greeting', { name: 'יוסי' })}
          </Text>
          <View style={styles.badgeRow}>
            <Ionicons name="briefcase" size={14} color={COLORS.primary} />
            <Text style={styles.badge}>
              {t('providerDashboard.badge', { profession: 'אינסטלטור' })}
            </Text>
          </View>
        </View>

        <VacationToggle value={isOnVacation} onChange={setIsOnVacation} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('providerDashboard.statsTitle')}</Text>
          <StatsCards stats={stats} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('providerDashboard.historyTitle')}</Text>
          <View style={{ gap: 10 }}>
            {MOCK_HISTORY.map((item) => (
              <BidHistoryCard key={item.bidId} item={item} />
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// Mock data — spread across statuses so designer can see all the
// visual states in one pass. Dates relative to "now" minus N days.
const today = () => new Date();
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const inHours = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000);

const MOCK_HISTORY: ProviderBidHistoryItem[] = [
  {
    bidId: 'demo-1',
    requestId: 'req-1',
    problemSummary: 'דליפת מים מתחת לכיור',
    city: 'נתניה',
    price: 350,
    availabilityStartAt: inHours(20).toISOString(),
    availabilityEndAt: inHours(22).toISOString(),
    status: 'sent',
    createdAt: today(),
  },
  {
    bidId: 'demo-2',
    requestId: 'req-2',
    problemSummary: 'דוד שמש לא מתחמם',
    city: 'חדרה',
    price: 480,
    availabilityStartAt: inHours(30).toISOString(),
    availabilityEndAt: inHours(32).toISOString(),
    status: 'selected',
    createdAt: daysAgo(1),
  },
  {
    bidId: 'demo-3',
    requestId: 'req-3',
    problemSummary: 'החלפת ברז במטבח',
    city: 'פרדס חנה',
    price: 250,
    availabilityStartAt: daysAgo(3).toISOString(),
    availabilityEndAt: new Date(daysAgo(3).getTime() + 2 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    createdAt: daysAgo(4),
  },
  {
    bidId: 'demo-4',
    requestId: 'req-4',
    problemSummary: 'סתימה בשירותים',
    city: 'קיסריה',
    price: 280,
    availabilityStartAt: daysAgo(6).toISOString(),
    availabilityEndAt: new Date(daysAgo(6).getTime() + 2 * 60 * 60 * 1000).toISOString(),
    status: 'lost',
    createdAt: daysAgo(8),
  },
  {
    bidId: 'demo-5',
    requestId: 'req-5',
    problemSummary: 'טפטוף בברז גינה',
    city: 'אור עקיבא',
    price: 180,
    availabilityStartAt: daysAgo(1).toISOString(),
    availabilityEndAt: new Date(daysAgo(1).getTime() + 2 * 60 * 60 * 1000).toISOString(),
    status: 'expired',
    createdAt: daysAgo(2),
  },
];

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60, gap: 16 },
  demoBanner: {
    flexDirection: 'row' as any,
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: COLORS.warning + '22',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.warning + '55',
  },
  demoBannerText: { color: COLORS.warning, fontSize: 12, fontWeight: '600' as any, flex: 1 },
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
});
