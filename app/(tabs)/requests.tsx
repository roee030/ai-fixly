import { useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../../src/components/layout';
import { RequestListSkeleton } from '../../src/components/ui';
import { useRequestsStore } from '../../src/stores/useRequestsStore';
import { REQUEST_STATUS } from '../../src/constants/status';
import { primaryProfessionLabel } from '../../src/utils/professionLabel';
import { COLORS, SPACING, RADII } from '../../src/constants';

import type { ServiceRequest } from '../../src/services/requests';

/**
 * My Requests screen. Enhanced with:
 *   - Date range filter (today / 7d / 30d / all)
 *   - Status filter (all / open / in-progress / closed)
 *   - Alert legend + row tinting explaining what needs the user's attention
 *   - Open-date display on each row
 *
 * Reads from the central requests store which maintains a persistent
 * Firestore listener — no refetch on every focus.
 */

type DateRange = 'today' | '7d' | '30d' | 'all';
type StatusFilter = 'all' | 'open' | 'in_progress' | 'closed';

const DATE_OPTIONS: Array<{ k: DateRange; l: string }> = [
  { k: 'today', l: 'היום' },
  { k: '7d', l: '7 ימים' },
  { k: '30d', l: '30 ימים' },
  { k: 'all', l: 'הכל' },
];

const STATUS_OPTIONS: Array<{ k: StatusFilter; l: string }> = [
  { k: 'all', l: 'הכל' },
  { k: 'open', l: 'פתוחה' },
  { k: 'in_progress', l: 'בתהליך' },
  { k: 'closed', l: 'נסגרה' },
];

export default function RequestsScreen() {
  const { t } = useTranslation();
  const requests = useRequestsStore((s) => s.requests);
  const isInitialized = useRequestsStore((s) => s.isInitialized);
  const bidCounts = useRequestsStore((s) => s.bidCounts);
  const unreadBaseline = useRequestsStore((s) => s.unreadBaseline);

  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    const cutoff = rangeCutoffMs(dateRange);
    return requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (cutoff != null) {
        const t = new Date(r.createdAt).getTime();
        if (Date.now() - t > cutoff) return false;
      }
      return true;
    });
  }, [requests, dateRange, statusFilter]);

  const openRequest = (id: string) => {
    router.push({ pathname: '/request/[id]', params: { id } });
  };

  // Summary counters for the alert header (only on the FILTERED set).
  const alertCounts = useMemo(() => {
    let stalled = 0; // open + >4h + 0 bids
    let slow = 0;    // open + >1h + 0 bids
    for (const r of filtered) {
      if (r.status !== REQUEST_STATUS.OPEN) continue;
      const bids = bidCounts[r.id] || 0;
      if (bids > 0) continue;
      const ageMs = Date.now() - new Date(r.createdAt).getTime();
      if (ageMs > 4 * 3600_000) stalled++;
      else if (ageMs > 3600_000) slow++;
    }
    return { stalled, slow };
  }, [filtered, bidCounts]);

  const renderRequest = ({ item }: { item: ServiceRequest }) => {
    const ai = item.aiAnalysis as any;
    const professionLabel = primaryProfessionLabel(ai, t);
    const shortSummary = ai?.shortSummary || ai?.summary || '';
    const bidCount = bidCounts[item.id] || 0;
    const lastSeen = unreadBaseline[item.id]?.lastSeenBidCount || 0;
    const unread = Math.max(0, bidCount - lastSeen);
    const showBadge =
      unread > 0 &&
      (item.status === REQUEST_STATUS.OPEN || item.status === REQUEST_STATUS.PAUSED);

    const urgency = getUrgency(item, bidCount);

    return (
      <Pressable onPress={() => openRequest(item.id)} style={[styles.requestCard, urgency.tintStyle]}>
        <View style={styles.requestIcon}>
          <Ionicons name="build" size={22} color={COLORS.primary} />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.titleRow}>
            <Text style={styles.requestTitle}>{professionLabel || t('requests.serviceRequest')}</Text>
            {urgency.label && (
              <Text style={[styles.urgencyTag, { color: urgency.color }]}>
                {urgency.label}
              </Text>
            )}
          </View>
          <Text style={styles.requestSummary} numberOfLines={1}>
            {showBadge
              ? t('requests.newOffers', { count: unread })
              : shortSummary || t('requests.serviceRequest')}
          </Text>
          <Text style={styles.requestDate}>
            {formatOpenDate(item.createdAt)} · {formatRelative(item.createdAt)}
          </Text>
        </View>

        {showBadge && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unread}</Text>
          </View>
        )}

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === 'open'
                  ? COLORS.success + '20'
                  : item.status === 'in_progress'
                  ? COLORS.warning + '20'
                  : COLORS.textTertiary + '20',
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  item.status === 'open'
                    ? COLORS.success
                    : item.status === 'in_progress'
                    ? COLORS.warning
                    : COLORS.textTertiary,
              },
            ]}
          >
            {t(`status.${item.status}`)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer>
      <Text style={styles.header}>{t('requests.title')}</Text>

      {/* Alert header — only renders when there's something urgent. */}
      {(alertCounts.stalled > 0 || alertCounts.slow > 0) && (
        <View style={styles.alertBanner}>
          <Ionicons name="alert-circle" size={18} color={COLORS.error} />
          <Text style={styles.alertText}>
            {alertCounts.stalled > 0 && (
              <Text style={{ color: COLORS.error, fontWeight: '700' }}>
                {alertCounts.stalled} תקועות
              </Text>
            )}
            {alertCounts.stalled > 0 && alertCounts.slow > 0 && <Text> · </Text>}
            {alertCounts.slow > 0 && (
              <Text style={{ color: COLORS.warning, fontWeight: '700' }}>
                {alertCounts.slow} איטיות
              </Text>
            )}
          </Text>
        </View>
      )}

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipStrip}
      >
        <Text style={styles.chipLabel}>תאריך:</Text>
        {DATE_OPTIONS.map((o) => (
          <Pressable
            key={o.k}
            onPress={() => setDateRange(o.k)}
            style={[styles.chip, dateRange === o.k && styles.chipActive]}
          >
            <Text style={[styles.chipText, dateRange === o.k && styles.chipTextActive]}>
              {o.l}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipStrip}
      >
        <Text style={styles.chipLabel}>סטטוס:</Text>
        {STATUS_OPTIONS.map((o) => (
          <Pressable
            key={o.k}
            onPress={() => setStatusFilter(o.k)}
            style={[styles.chip, statusFilter === o.k && styles.chipActive]}
          >
            <Text style={[styles.chipText, statusFilter === o.k && styles.chipTextActive]}>
              {o.l}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <LegendItem color={COLORS.error} label="תקועה — אין הצעות מעל 4 שעות" />
        <LegendItem color={COLORS.warning} label="איטית — אין הצעות מעל שעה" />
      </View>

      {!isInitialized ? (
        <View style={{ flex: 1, paddingTop: 8 }}>
          <RequestListSkeleton />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={COLORS.textTertiary} />
          <Text style={styles.emptyTitle}>
            {requests.length === 0 ? t('requests.empty') : 'אין תוצאות במסנן הזה'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {requests.length === 0 ? t('requests.emptyHint') : 'נסה לשנות את הפילטרים'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function rangeCutoffMs(range: DateRange): number | null {
  const DAY = 24 * 3600_000;
  switch (range) {
    case 'today': return DAY;
    case '7d': return 7 * DAY;
    case '30d': return 30 * DAY;
    case 'all': return null;
  }
}

function getUrgency(r: ServiceRequest, bidCount: number): {
  tintStyle: object;
  label: string;
  color: string;
} {
  if (r.status !== REQUEST_STATUS.OPEN || bidCount > 0) {
    return { tintStyle: {}, label: '', color: '' };
  }
  const ageMs = Date.now() - new Date(r.createdAt).getTime();
  if (ageMs > 4 * 3600_000) {
    return {
      tintStyle: { backgroundColor: COLORS.error + '12', borderColor: COLORS.error + '40' },
      label: '🚨 תקועה',
      color: COLORS.error,
    };
  }
  if (ageMs > 3600_000) {
    return {
      tintStyle: { backgroundColor: COLORS.warning + '12', borderColor: COLORS.warning + '40' },
      label: '⏰ איטית',
      color: COLORS.warning,
    };
  }
  return { tintStyle: {}, label: '', color: '' };
}

function formatOpenDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mi}`;
}

function formatRelative(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const min = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (min < 60) return `לפני ${min} דק'`;
  const h = Math.floor(min / 60);
  if (h < 24) return `לפני ${h} שע'`;
  const days = Math.floor(h / 24);
  return `לפני ${days} ימים`;
}

// ──────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 16,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.error + '14',
    borderRadius: RADII.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
    marginBottom: SPACING.sm,
  },
  alertText: { fontSize: 13, color: COLORS.text },
  chipStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  chipLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: '600',
    marginHorizontal: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  chipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  chipTextActive: { color: COLORS.primary, fontWeight: '700' },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS.textSecondary },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  requestIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  urgencyTag: {
    fontSize: 11,
    fontWeight: '700',
  },
  requestSummary: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  requestDate: {
    color: COLORS.textTertiary,
    fontSize: 11,
    marginTop: 3,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 14,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
