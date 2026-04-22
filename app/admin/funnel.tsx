import { useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Platform, useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, RADII } from '../../src/constants';
import { useAdminQuery } from '../../src/hooks/useAdminQuery';
import { queryDailyStats } from '../../src/services/admin/dailyStatsQuery';

/**
 * Funnel screen. V1 shows headline conversion metrics derivable from
 * adminStats rollups: requests → reviews. Deeper funnel steps
 * (app_opened → capture_started → submitted) need session_logs
 * aggregation which isn't in the daily rollup yet — flagged as TBD.
 */
export default function FunnelPage() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const fetcher = useCallback(() => queryDailyStats(30), []);
  const { data, isLoading } = useAdminQuery('admin:funnel:30d', fetcher);

  const totals = useMemo(() => {
    if (!data) return null;
    const requests = data.reduce((s, r) => s + r.requestsCreated, 0);
    const reviews = data.reduce((s, r) => s + r.reviewsSubmitted, 0);
    const gross = data.reduce((s, r) => s + r.grossValue, 0);
    const ratings = data.filter((r) => r.avgRating > 0);
    const avgRating = ratings.length > 0
      ? ratings.reduce((s, r) => s + r.avgRating, 0) / ratings.length
      : 0;
    const respDays = data.filter((r) => r.avgTimeToFirstResponseMin > 0);
    const avgTtfr = respDays.length > 0
      ? respDays.reduce((s, r) => s + r.avgTimeToFirstResponseMin, 0) / respDays.length
      : 0;
    return { requests, reviews, gross, avgRating, avgTtfr };
  }, [data]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      {isLoading && !totals && (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      )}

      {totals && (
        <>
          <View style={styles.cardsRow}>
            <Card label='בקשות (30 יום)' value={String(totals.requests)} />
            <Card label='ביקורות שהוגשו' value={String(totals.reviews)} />
            <Card
              label='שיעור המרה לביקורת'
              value={totals.requests > 0 ? `${Math.round((totals.reviews / totals.requests) * 100)}%` : '—'}
              warn={totals.requests > 0 && totals.reviews / totals.requests < 0.2}
            />
            <Card
              label='זמן לתגובה ראשונה'
              value={totals.avgTtfr > 0 ? `${Math.round(totals.avgTtfr)}'` : '—'}
            />
          </View>

          <SectionTitle text="שלבי המשפך" />
          <View style={styles.table}>
            <FunnelRow step='בקשה נוצרה' count={totals.requests} pct={100} />
            <FunnelRow
              step='ביקורת הוגשה'
              count={totals.reviews}
              pct={totals.requests > 0 ? Math.round((totals.reviews / totals.requests) * 100) : 0}
            />
          </View>
          <Text style={styles.tbd}>
            שלבי משפך מעמיקים (פתיחת אפליקציה → צילום → הגשה) יתווספו
            כשנצבור session_logs במסמכי הrollup.
          </Text>

          <SectionTitle text='הכנסות ברוטו (30 יום)' />
          <View style={styles.bigStat}>
            <Text style={styles.bigValue}>₪{totals.gross.toLocaleString('he-IL')}</Text>
            <Text style={styles.bigLabel}>סך ההכנסות מחושבות מהדירוגים שהושלמו</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function SectionTitle({ text }: { text: string }) {
  return <Text style={styles.sectionTitle}>{text}</Text>;
}

function Card({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={styles.card}>
      <Text style={[styles.cardValue, warn && styles.cardValueWarn]}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

function FunnelRow({ step, count, pct }: { step: string; count: number; pct: number }) {
  return (
    <View style={styles.funnelRow}>
      <Text style={styles.funnelStep}>{step}</Text>
      <Text style={styles.funnelCount}>{count}</Text>
      <Text style={styles.funnelPct}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: 40 },
  contentDesktop: { maxWidth: 900, alignSelf: 'center', width: '100%' },

  centered: { padding: SPACING.lg, alignItems: 'center' },

  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.text,
    marginTop: SPACING.md, marginBottom: SPACING.sm,
  },

  cardsRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.md, flexWrap: 'wrap' },
  card: {
    flex: 1, minWidth: 140, backgroundColor: COLORS.surface,
    borderRadius: RADII.md, padding: SPACING.md, alignItems: 'center',
  },
  cardValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  cardValueWarn: { color: '#F59E0B' },
  cardLabel: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },

  table: { backgroundColor: COLORS.surface, borderRadius: RADII.md, overflow: 'hidden' },
  funnelRow: {
    flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  funnelStep: { flex: 2, fontSize: 13, color: COLORS.text },
  funnelCount: { flex: 1, textAlign: 'center', fontSize: 13, color: COLORS.text, fontWeight: '600' },
  funnelPct: { flex: 1, textAlign: 'center', fontSize: 13, color: COLORS.primary, fontWeight: '700' },

  tbd: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    borderRadius: RADII.sm,
    fontSize: 11,
    color: COLORS.textTertiary,
    lineHeight: 17,
  },

  bigStat: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    alignItems: 'center',
  },
  bigValue: { fontSize: 32, fontWeight: '700', color: '#22C55E' },
  bigLabel: { fontSize: 12, color: COLORS.textTertiary, marginTop: 4, textAlign: 'center' },
});
