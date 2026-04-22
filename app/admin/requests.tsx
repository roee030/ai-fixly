import { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Platform, useWindowDimensions,
  Pressable, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../../src/constants';
import { useAdminQuery } from '../../src/hooks/useAdminQuery';
import { queryAdminRequests } from '../../src/services/admin/requestsQuery';
import type { AdminRequestRow } from '../../src/services/admin/requestsQuery';
import { RequestsTable } from '../../src/components/admin/RequestsTable';
import { FiltersBar, type FilterState } from '../../src/components/admin/FiltersBar';
import { CITY_LABELS_HE } from '../../src/constants/cities';
import { toCsv, downloadCsv } from '../../src/utils/csvExport';

const DEFAULT_FILTERS: FilterState = { status: 'all', city: 'all', hasReview: 'all' };

export default function RequestsListPage() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const cacheKey = `admin:requests:${filters.status}:${filters.city}:${filters.hasReview}`;
  const fetcher = useCallback(() => queryAdminRequests({
    status: filters.status === 'all' ? undefined : filters.status,
    city:   filters.city === 'all' ? undefined : filters.city,
    hasReview: filters.hasReview === 'all' ? undefined : filters.hasReview === 'yes',
  }), [filters]);

  const { data, isLoading, error, refresh } = useAdminQuery(cacheKey, fetcher);

  const rows = useMemo(() => data ?? [], [data]);

  const handleExportCsv = async () => {
    const csv = toCsv(rows, [
      { key: 'id', header: 'ID' },
      { key: 'createdAt', header: 'נוצרה' },
      { key: 'city', header: 'עיר' },
      { key: 'status', header: 'סטטוס' },
      { key: 'timeToFirstResponse', header: 'זמן לתגובה ראשונה (דק)' },
      { key: 'selectedProviderName', header: 'בעל מקצוע נבחר' },
      { key: 'selectedBidPrice', header: 'הצעה' },
      { key: 'pricePaid', header: 'שולם' },
      { key: 'rating', header: 'דירוג' },
    ]);
    await downloadCsv(`requests-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>בקשות</Text>
        <View style={styles.actions}>
          <Pressable onPress={refresh} style={styles.iconBtn}>
            <Ionicons name="refresh" size={18} color={COLORS.text} />
          </Pressable>
          <Pressable onPress={handleExportCsv} style={[styles.iconBtn, styles.csvBtn]}>
            <Ionicons name="download-outline" size={16} color="#FFFFFF" />
            <Text style={styles.csvBtnText}>CSV</Text>
          </Pressable>
        </View>
      </View>

      <FiltersBar value={filters} onChange={setFilters} />

      {isLoading && !data && (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>שגיאה בטעינה: {error.message}</Text>
        </View>
      )}

      {data && (
        <>
          <Text style={styles.meta}>
            {rows.length} תוצאות
            {filters.city !== 'all' && ` · ${CITY_LABELS_HE[filters.city] || filters.city}`}
          </Text>
          <RequestsTable rows={rows as AdminRequestRow[]} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: 40 },
  contentDesktop: { maxWidth: 1100, alignSelf: 'center', width: '100%' },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  pageTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  actions: { flexDirection: 'row', gap: SPACING.sm },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  csvBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  csvBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 11, color: COLORS.textTertiary, marginBottom: 8 },
  centered: { padding: SPACING.lg, alignItems: 'center' },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: RADII.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  errorText: { color: COLORS.error, fontSize: 13 },
});
