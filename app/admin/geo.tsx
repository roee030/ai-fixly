import { useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Platform, useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, RADII } from '../../src/constants';
import { CITY_LABELS_HE } from '../../src/constants/cities';
import { useAdminQuery } from '../../src/hooks/useAdminQuery';
import { queryDailyStats } from '../../src/services/admin/dailyStatsQuery';

/**
 * Geo screen: aggregates adminStats.byCity counts over the last 30 days
 * to show which metros drive volume + revenue. No maps yet — the
 * bounding-box data is coarse enough that per-city totals carry
 * the same signal.
 */
export default function GeoPage() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const fetcher = useCallback(() => queryDailyStats(30), []);
  const { data, isLoading } = useAdminQuery('admin:geo:30d', fetcher);

  const cityRows = useMemo(() => {
    if (!data) return [];
    const byCity: Record<string, { requests: number; reviews: number; gross: number }> = {};
    for (const r of data) {
      for (const [city, bucket] of Object.entries(r.byCity || {})) {
        if (!byCity[city]) byCity[city] = { requests: 0, reviews: 0, gross: 0 };
        byCity[city].requests += (bucket as any).requestsCreated ?? 0;
        byCity[city].reviews += (bucket as any).reviewsSubmitted ?? 0;
        byCity[city].gross += (bucket as any).grossValue ?? 0;
      }
    }
    return Object.entries(byCity)
      .map(([city, agg]) => ({ city, ...agg }))
      .sort((a, b) => b.requests - a.requests);
  }, [data]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      {isLoading && cityRows.length === 0 && (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      )}

      <Text style={styles.sectionTitle}>פעילות לפי עיר (30 יום)</Text>

      {cityRows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>אין נתונים לפי עיר עדיין</Text>
        </View>
      ) : (
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.th, styles.colCity]}>עיר</Text>
            <Text style={[styles.th, styles.colNum]}>בקשות</Text>
            <Text style={[styles.th, styles.colNum]}>ביקורות</Text>
            <Text style={[styles.th, styles.colNum]}>הכנסות</Text>
          </View>
          {cityRows.map((row) => {
            const status = demandStatus(row);
            return (
              <View key={row.city} style={styles.row}>
                <View style={styles.colCity}>
                  <Text style={styles.cityName}>{CITY_LABELS_HE[row.city] || row.city}</Text>
                  <Text style={[styles.statusBadge, { color: status.color }]}>{status.label}</Text>
                </View>
                <Text style={[styles.td, styles.colNum]}>{row.requests}</Text>
                <Text style={[styles.td, styles.colNum]}>{row.reviews}</Text>
                <Text style={[styles.td, styles.colNum, styles.money]}>
                  ₪{row.gross.toLocaleString('he-IL')}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function demandStatus(row: { requests: number; reviews: number }) {
  if (row.requests === 0) return { label: 'אין פעילות', color: '#64748B' };
  const conv = row.reviews / row.requests;
  if (conv >= 0.3) return { label: 'תקין', color: '#22C55E' };
  if (conv >= 0.1) return { label: 'חלש', color: '#F59E0B' };
  return { label: 'חסר היצע', color: '#EF4444' };
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: 40 },
  contentDesktop: { maxWidth: 900, alignSelf: 'center', width: '100%' },

  centered: { padding: SPACING.lg, alignItems: 'center' },

  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.text,
    marginBottom: SPACING.sm,
  },

  table: { backgroundColor: COLORS.surface, borderRadius: RADII.md, overflow: 'hidden' },
  headerRow: {
    flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  th: { fontSize: 11, fontWeight: '700', color: COLORS.textTertiary },
  td: { fontSize: 13, color: COLORS.text },
  colCity: { flex: 2 },
  colNum: { flex: 1, textAlign: 'center' },
  cityName: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  statusBadge: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  money: { color: '#22C55E', fontWeight: '600' },
  empty: { padding: SPACING.lg, alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADII.md },
  emptyText: { color: COLORS.textTertiary, fontSize: 12 },
});
