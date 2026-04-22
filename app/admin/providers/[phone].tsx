import { useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
  Platform, useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../../../src/constants';
import { CITY_LABELS_HE } from '../../../src/constants/cities';
import { useAdminQuery } from '../../../src/hooks/useAdminQuery';
import { fetchProviderDetail } from '../../../src/services/admin/providerDetailQuery';
import type { AdminProviderDetail } from '../../../src/services/admin/providerDetailQuery';
import { toCsv, downloadCsv } from '../../../src/utils/csvExport';

export default function ProviderDetailPage() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const fetcher = useCallback(
    () => (phone ? fetchProviderDetail(phone) : Promise.resolve(null)),
    [phone],
  );
  const { data, isLoading, error, refresh } = useAdminQuery(
    `admin:provider:${phone || ''}`,
    fetcher,
  );

  const handleExport = async () => {
    if (!data) return;
    const csv = toCsv(data.jobs, [
      { key: 'requestId', header: 'ID בקשה' },
      { key: 'completedAt', header: 'הושלם' },
      { key: 'bidPrice', header: 'הצעה' },
      { key: 'pricePaid', header: 'שולם' },
      { key: 'rating', header: 'דירוג' },
      { key: 'comment', header: 'הערה' },
      { key: 'status', header: 'סטטוס' },
    ]);
    await downloadCsv(`provider-${phone}-jobs.csv`, csv);
  };

  if (isLoading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: COLORS.error }}>שגיאה: {error.message}</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.missing}>אין עדיין נתוני aggregate לבעל מקצוע זה</Text>
        <Text style={styles.subMissing}>(יישלח אחרי עבודה ראשונה עם דירוג)</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{data.displayName}</Text>
          <Text style={styles.subtitle}>
            {data.phone} · {data.profession || '—'} · {CITY_LABELS_HE[data.city] || data.city}
          </Text>
        </View>
        <Pressable onPress={refresh} style={styles.iconBtn}>
          <Ionicons name="refresh" size={18} color={COLORS.text} />
        </Pressable>
      </View>

      {/* Lifetime stats */}
      <View style={styles.statsGrid}>
        <Stat label="נשלחו" value={String(data.stats.offersSent)} />
        <Stat label="התקבלו" value={String(data.stats.accepted)} />
        <Stat label="הושלמו" value={String(data.stats.completed)} color="#22C55E" />
        <Stat label="דירוג" value={data.stats.avgRating > 0 ? data.stats.avgRating.toFixed(1) : '—'} color="#F59E0B" />
        <Stat label="מחיר ממוצע" value={data.stats.avgPricePaid > 0 ? `₪${Math.round(data.stats.avgPricePaid)}` : '—'} />
        <Stat label='סה"כ' value={data.stats.totalGrossValue > 0 ? `₪${data.stats.totalGrossValue.toLocaleString('he-IL')}` : '—'} color="#22C55E" />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>היסטוריית עבודות ({data.jobs.length})</Text>
        <Pressable onPress={handleExport} style={styles.csvBtn}>
          <Ionicons name="download-outline" size={14} color="#FFFFFF" />
          <Text style={styles.csvBtnText}>CSV</Text>
        </Pressable>
      </View>

      {data.jobs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>אין עדיין עבודות עם ביקורת</Text>
        </View>
      ) : (
        <View style={styles.jobsTable}>
          {data.jobs.map((j) => (
            <Pressable
              key={j.requestId}
              onPress={() => router.push({ pathname: '/admin/requests/[id]', params: { id: j.requestId } } as never)}
              style={styles.jobRow}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.jobId}>{j.requestId.slice(0, 8)}…</Text>
                <Text style={styles.jobMeta}>
                  {j.completedAt ? j.completedAt.toLocaleDateString('he-IL') : '—'}
                  {j.rating ? `  ·  ${'⭐'.repeat(Math.round(j.rating))}` : ''}
                </Text>
                {j.comment && (
                  <Text style={styles.jobComment} numberOfLines={2}>"{j.comment}"</Text>
                )}
              </View>
              <View style={styles.jobPrices}>
                <Text style={styles.jobBid}>הצעה: ₪{j.bidPrice}</Text>
                {j.pricePaid !== undefined && (
                  <Text style={styles.jobPaid}>שולם: ₪{j.pricePaid}</Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, color ? { color } : undefined]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: 60, gap: SPACING.sm },
  contentDesktop: { maxWidth: 900, alignSelf: 'center', width: '100%' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: 8 },
  missing: { color: COLORS.text, fontSize: 16, textAlign: 'center' },
  subMissing: { color: COLORS.textTertiary, fontSize: 12, textAlign: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.xs },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
  },
  iconBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: RADII.sm, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: {
    flex: 1, minWidth: 110,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textTertiary, marginTop: 4 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: SPACING.md, marginBottom: SPACING.xs,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  csvBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.primary,
  },
  csvBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  jobsTable: { gap: 6 },
  jobRow: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    gap: SPACING.sm,
  },
  jobId: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  jobMeta: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },
  jobComment: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 4 },
  jobPrices: { alignItems: 'flex-end' },
  jobBid: { fontSize: 12, color: COLORS.textSecondary },
  jobPaid: { fontSize: 13, color: COLORS.primary, fontWeight: '700', marginTop: 2 },
  empty: {
    padding: SPACING.lg,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
  },
  emptyText: { color: COLORS.textTertiary, fontSize: 13 },
});
