import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Platform, Pressable,
  useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../../src/constants';
import { CITY_BOXES, CITY_LABELS_HE } from '../../src/constants/cities';
import { useAdminQuery } from '../../src/hooks/useAdminQuery';
import { queryDailyStats } from '../../src/services/admin/dailyStatsQuery';
import { SimpleLineChart } from '../../src/components/admin/charts/SimpleLineChart';
import { SimpleBarChart } from '../../src/components/admin/charts/SimpleBarChart';

/**
 * Admin overview. Five charts + filters, all powered by adminStats/daily-*
 * pre-rolled docs written every 5 minutes by the worker cron. Manual
 * refresh; no realtime listeners.
 */
export default function OverviewPage() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [days, setDays] = useState<30 | 90>(30);
  const [city, setCity] = useState<string | 'all'>('all');
  const [cityPickerOpen, setCityPickerOpen] = useState(false);

  const fetcher = useCallback(() => queryDailyStats(days), [days]);
  const { data, isLoading, refresh } = useAdminQuery(`admin:stats:${days}`, fetcher);

  const series = useMemo(() => {
    if (!data) return null;

    const pickValue = (
      row: typeof data[number],
      key: 'requestsCreated' | 'reviewsSubmitted' | 'avgTimeToFirstResponseMin' | 'grossValue' | 'avgRating',
    ): number => {
      if (city === 'all') return row[key] ?? 0;
      const bucket = row.byCity?.[city];
      return (bucket as any)?.[key] ?? 0;
    };

    return {
      requests: data.map((r) => ({ x: r.date.slice(5), y: pickValue(r, 'requestsCreated') })),
      timeToFirstBid: data.map((r) => ({ x: r.date.slice(5), y: pickValue(r, 'avgTimeToFirstResponseMin') })),
      revenue: data.map((r) => ({ x: r.date.slice(5), y: pickValue(r, 'grossValue') })),
      rating: data.map((r) => ({ x: r.date.slice(5), y: pickValue(r, 'avgRating') })),
      reviews: data.map((r) => ({ x: r.date.slice(5), y: pickValue(r, 'reviewsSubmitted') })),
    };
  }, [data, city]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      {/* Global filters */}
      <View style={styles.filterRow}>
        <View style={styles.toggleGroup}>
          <Pressable
            onPress={() => setDays(30)}
            style={[styles.toggleBtn, days === 30 && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleText, days === 30 && styles.toggleTextActive]}>30 ימים</Text>
          </Pressable>
          <Pressable
            onPress={() => setDays(90)}
            style={[styles.toggleBtn, days === 90 && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleText, days === 90 && styles.toggleTextActive]}>90 ימים</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => setCityPickerOpen((o) => !o)} style={styles.cityBtn}>
          <Ionicons name="location-outline" size={14} color={COLORS.text} />
          <Text style={styles.cityBtnText}>
            {city === 'all' ? 'כל הערים' : CITY_LABELS_HE[city] || city}
          </Text>
        </Pressable>

        <Pressable onPress={refresh} style={styles.iconBtn}>
          <Ionicons name="refresh" size={16} color={COLORS.text} />
        </Pressable>
      </View>

      {cityPickerOpen && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityStrip}>
          <Pressable onPress={() => { setCity('all'); setCityPickerOpen(false); }} style={[styles.chip, city === 'all' && styles.chipActive]}>
            <Text style={[styles.chipText, city === 'all' && styles.chipTextActive]}>כל הערים</Text>
          </Pressable>
          {CITY_BOXES.map((b) => (
            <Pressable
              key={b.city}
              onPress={() => { setCity(b.city); setCityPickerOpen(false); }}
              style={[styles.chip, city === b.city && styles.chipActive]}
            >
              <Text style={[styles.chipText, city === b.city && styles.chipTextActive]}>
                {CITY_LABELS_HE[b.city] || b.city}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {isLoading && !data && (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      )}

      {series && (
        <View style={styles.grid}>
          <SimpleLineChart
            title="בקשות ליום"
            data={series.requests}
            color="#6366F1"
          />
          <SimpleLineChart
            title="זמן לתגובה (דק)"
            data={series.timeToFirstBid}
            color="#F59E0B"
            formatValue={(v) => `${Math.round(v)}'`}
          />
          <SimpleBarChart
            title="הכנסות ברוטו"
            data={series.revenue}
            color="#22C55E"
            formatValue={(v) => `₪${v.toLocaleString('he-IL')}`}
          />
          <SimpleLineChart
            title="דירוג ממוצע"
            data={series.rating}
            color="#EC4899"
            formatValue={(v) => v.toFixed(1)}
          />
          <SimpleBarChart
            title="ביקורות שהוגשו"
            data={series.reviews}
            color="#8B5CF6"
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: 40, gap: SPACING.sm },
  contentDesktop: { maxWidth: 900, alignSelf: 'center', width: '100%' },

  filterRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    flexWrap: 'wrap', marginBottom: SPACING.xs,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.sm,
    padding: 2,
    gap: 2,
  },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADII.sm - 2 },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  toggleTextActive: { color: '#FFFFFF' },
  cityBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cityBtnText: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  iconBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cityStrip: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  chipText: { fontSize: 12, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary, fontWeight: '700' },
  grid: { gap: SPACING.sm },
  centered: { padding: SPACING.lg, alignItems: 'center' },
});
