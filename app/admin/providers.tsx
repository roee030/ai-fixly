import { useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { COLORS, SPACING, RADII } from '../../src/constants';
import { CITY_LABELS_HE } from '../../src/constants/cities';
import { useAdminQuery } from '../../src/hooks/useAdminQuery';
import { queryProvidersList } from '../../src/services/admin/providersListQuery';
import type { AdminProviderRow } from '../../src/services/admin/providersListQuery';

function ratingColor(rating: number | null): string {
  if (rating == null) return COLORS.textTertiary;
  if (rating >= 4.0) return '#22C55E';
  if (rating >= 3.0) return '#F59E0B';
  return '#EF4444';
}

function formatTime(minutes: number | null): string {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes}'`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export default function ProvidersPage() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const fetcher = useCallback(() => queryProvidersList(200), []);
  const { data, isLoading, refresh } = useAdminQuery('admin:providers:all', fetcher);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      <SummaryCards providers={data ?? []} />

      {isLoading && !data && (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>יחס הצעה-זכייה</Text>
        <Pressable onPress={refresh} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>רענן</Text>
        </Pressable>
      </View>

      {(!data || data.length === 0) && !isLoading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            אין עדיין aggregate-ים של בעלי מקצוע. הם נוצרים אוטומטית אחרי עבודה ראשונה עם ביקורת.
          </Text>
        </View>
      ) : (
        <BidWinTable rows={data ?? []} />
      )}
    </ScrollView>
  );
}

function SummaryCards({ providers }: { providers: AdminProviderRow[] }) {
  const active = providers.filter((p) => p.accepted > 0).length;
  const totalOffers = providers.reduce((s, p) => s + p.offersSent, 0);
  const totalReplied = providers.reduce((s, p) => s + p.accepted, 0);
  const avgReply = totalOffers > 0 ? Math.round((totalReplied / totalOffers) * 100) : 0;

  const rated = providers.filter((p) => p.avgRating != null);
  const avgRating = rated.length > 0
    ? Math.round((rated.reduce((s, p) => s + (p.avgRating ?? 0), 0) / rated.length) * 10) / 10
    : null;

  const cards = [
    { label: 'ספקים פעילים', value: String(active) },
    { label: 'אחוז מענה', value: `${avgReply}%` },
    { label: 'דירוג ממוצע', value: avgRating != null ? String(avgRating) : '—' },
  ];

  return (
    <View style={styles.cardsRow}>
      {cards.map((c) => (
        <View key={c.label} style={styles.card}>
          <Text style={styles.cardValue}>{c.value}</Text>
          <Text style={styles.cardLabel}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

function BidWinTable({ rows }: { rows: AdminProviderRow[] }) {
  const sorted = [...rows].sort((a, b) => {
    const rA = a.offersSent > 0 ? a.completed / a.offersSent : 0;
    const rB = b.offersSent > 0 ? b.completed / b.offersSent : 0;
    return rB - rA;
  });

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.thName]}>ספק</Text>
        <Text style={[styles.th, styles.thCity]}>עיר</Text>
        <Text style={[styles.th, styles.thSmall]}>הושלמו</Text>
        <Text style={[styles.th, styles.thSmall]}>זכייה</Text>
        <Text style={[styles.th, styles.thSmall]}>דירוג</Text>
        <Text style={[styles.th, styles.thSmall]}>תגובה</Text>
      </View>

      {sorted.map((p) => {
        const winRate = p.offersSent > 0 ? Math.round((p.completed / p.offersSent) * 100) : 0;
        const isLow = (p.avgResponseMinutes ?? 0) > 120 || winRate === 0;
        return (
          <Pressable
            key={p.phone}
            onPress={() => router.push({
              pathname: '/admin/providers/[phone]',
              params: { phone: p.phone },
            } as never)}
            style={[styles.tableRow, isLow && styles.tableRowBad]}
          >
            <Text style={[styles.td, styles.thName]} numberOfLines={1}>{p.displayName}</Text>
            <Text style={[styles.td, styles.thCity]} numberOfLines={1}>
              {CITY_LABELS_HE[p.city] || p.city}
            </Text>
            <Text style={[styles.td, styles.thSmall]}>{p.completed}</Text>
            <Text style={[styles.td, styles.thSmall, { fontWeight: '700' }]}>{winRate}%</Text>
            <Text style={[styles.td, styles.thSmall, { color: ratingColor(p.avgRating) }]}>
              {p.avgRating != null ? p.avgRating.toFixed(1) : '—'}
            </Text>
            <Text style={[styles.td, styles.thSmall, {
              color: (p.avgResponseMinutes ?? 0) > 120 ? '#EF4444' : COLORS.text,
            }]}>
              {formatTime(p.avgResponseMinutes)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: 40 },
  contentDesktop: { maxWidth: 900, alignSelf: 'center', width: '100%' },

  centered: { padding: SPACING.lg, alignItems: 'center' },
  empty: {
    padding: SPACING.lg,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
  },
  emptyText: {
    color: COLORS.textTertiary, fontSize: 13, textAlign: 'center', lineHeight: 20,
  },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: SPACING.md, marginBottom: SPACING.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  refreshBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: COLORS.surface, borderRadius: RADII.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  refreshText: { fontSize: 11, color: COLORS.text, fontWeight: '600' },

  cardsRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  card: {
    flex: 1, minWidth: 120, backgroundColor: COLORS.surface,
    borderRadius: RADII.md, padding: SPACING.md, alignItems: 'center',
  },
  cardValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  cardLabel: { fontSize: 12, color: COLORS.textSecondary },

  table: { backgroundColor: COLORS.surface, borderRadius: RADII.md, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  tableRowBad: { backgroundColor: 'rgba(239, 68, 68, 0.06)' },
  th: { fontSize: 11, fontWeight: '700', color: COLORS.textTertiary },
  td: { fontSize: 13, color: COLORS.text },
  thName: { flex: 2 },
  thCity: { flex: 1.2 },
  thSmall: { flex: 1, textAlign: 'center' },
});
