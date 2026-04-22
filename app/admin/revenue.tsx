import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Platform, Pressable,
  useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, RADII } from '../../src/constants';
import { CITY_LABELS_HE } from '../../src/constants/cities';
import { useAdminQuery } from '../../src/hooks/useAdminQuery';
import { queryDailyStats } from '../../src/services/admin/dailyStatsQuery';
import { SimpleBarChart } from '../../src/components/admin/charts/SimpleBarChart';

/**
 * Revenue screen. Pulls from the adminStats daily rollup — one fetch
 * powers everything: period totals, bar chart, and per-city breakdown.
 */
export default function RevenuePage() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [days, setDays] = useState<30 | 90>(30);

  const fetcher = useCallback(() => queryDailyStats(days), [days]);
  const { data, isLoading } = useAdminQuery(`admin:revenue:${days}`, fetcher);

  const summary = useMemo(() => {
    if (!data) return null;
    const total = data.reduce((s, r) => s + r.grossValue, 0);
    const reviews = data.reduce((s, r) => s + r.reviewsSubmitted, 0);
    const avgTicket = reviews > 0 ? Math.round(total / reviews) : 0;
    const byCity: Record<string, number> = {};
    for (const r of data) {
      for (const [city, bucket] of Object.entries(r.byCity || {})) {
        byCity[city] = (byCity[city] || 0) + ((bucket as any).grossValue ?? 0);
      }
    }
    const cityRows = Object.entries(byCity)
      .map(([city, v]) => ({ city, value: v }))
      .sort((a, b) => b.value - a.value);
    return { total, reviews, avgTicket, cityRows };
  }, [data]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      <View style={styles.toggleRow}>
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

      {isLoading && !summary && (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      )}

      {summary && (
        <>
          <View style={styles.cardsRow}>
            <Card label='סה"כ ברוטו' value={`₪${summary.total.toLocaleString('he-IL')}`} color="#22C55E" />
            <Card label='ביקורות שהוגשו' value={String(summary.reviews)} />
            <Card label='מחיר ממוצע' value={summary.avgTicket > 0 ? `₪${summary.avgTicket.toLocaleString('he-IL')}` : '—'} />
          </View>

          <Text style={styles.sectionTitle}>התפתחות הכנסות</Text>
          <SimpleBarChart
            title={`₪ ברוטו ליום (${days} ימים)`}
            data={data!.map((r) => ({ x: r.date.slice(5), y: r.grossValue }))}
            color="#22C55E"
            formatValue={(v) => `₪${v.toLocaleString('he-IL')}`}
          />

          <Text style={styles.sectionTitle}>פילוח לפי עיר</Text>
          {summary.cityRows.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>אין נתוני הכנסות לפי עיר עדיין</Text>
            </View>
          ) : (
            <View style={styles.table}>
              {summary.cityRows.map((row) => (
                <View key={row.city} style={styles.cityRow}>
                  <Text style={styles.cityName}>{CITY_LABELS_HE[row.city] || row.city}</Text>
                  <Text style={styles.cityValue}>₪{row.value.toLocaleString('he-IL')}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function Card({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.card}>
      <Text style={[styles.cardValue, color ? { color } : undefined]}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: 40, gap: SPACING.sm },
  contentDesktop: { maxWidth: 900, alignSelf: 'center', width: '100%' },
  centered: { padding: SPACING.lg, alignItems: 'center' },
  toggleRow: {
    flexDirection: 'row', gap: 2, padding: 2,
    backgroundColor: COLORS.surface, borderRadius: RADII.sm,
    alignSelf: 'flex-start',
  },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADII.sm - 2 },
  toggleBtnActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  toggleTextActive: { color: '#FFFFFF' },

  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: COLORS.text,
    marginTop: SPACING.md,
  },

  cardsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  card: {
    flex: 1, minWidth: 120, backgroundColor: COLORS.surface,
    borderRadius: RADII.md, padding: SPACING.md, alignItems: 'center',
  },
  cardValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  cardLabel: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },

  table: { backgroundColor: COLORS.surface, borderRadius: RADII.md, overflow: 'hidden' },
  cityRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  cityName: { fontSize: 13, color: COLORS.text },
  cityValue: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  empty: { padding: SPACING.md, alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADII.md },
  emptyText: { color: COLORS.textTertiary, fontSize: 12 },
});
