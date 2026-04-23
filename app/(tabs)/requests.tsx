import { useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../../src/components/layout';
import { RequestListSkeleton } from '../../src/components/ui';
import { useRequestsStore } from '../../src/stores/useRequestsStore';
import { REQUEST_STATUS } from '../../src/constants/status';
import { localizeProfession } from '../../src/utils/professionLabel';
import { COLORS } from '../../src/constants';

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
type StatusFilter = 'all' | 'open' | 'in_progress' | 'closed' | 'has_offers';

const DATE_OPTIONS: Array<{ k: DateRange; l: string }> = [
  { k: 'today', l: 'היום' },
  { k: '7d', l: '7 ימים' },
  { k: '30d', l: '30 ימים' },
  { k: 'all', l: 'הכל' },
];

const STATUS_OPTIONS: Array<{ k: StatusFilter; l: string }> = [
  { k: 'all', l: 'הכל' },
  { k: 'has_offers', l: '✨ יש הצעות' },
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
      // 'has_offers' is a virtual status — requests that have at least
      // one bid AND aren't closed, so the user can surface active work
      // that deserves attention.
      if (statusFilter === 'has_offers') {
        if ((bidCounts[r.id] || 0) === 0) return false;
        if (r.status === REQUEST_STATUS.CLOSED) return false;
      } else if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }
      if (cutoff != null) {
        const t = new Date(r.createdAt).getTime();
        if (Date.now() - t > cutoff) return false;
      }
      return true;
    });
  }, [requests, dateRange, statusFilter, bidCounts]);

  const openRequest = (id: string) => {
    router.push({ pathname: '/request/[id]', params: { id } });
  };

  const renderRequest = ({ item }: { item: ServiceRequest }) => {
    const ai = item.aiAnalysis as any;
    // Show ALL professions, not just the first one. AI returns 1-3.
    const professionKeys: string[] =
      (Array.isArray(ai?.professions) ? ai.professions : ai?.professionLabelsHe) ?? [];
    const professionLabels = professionKeys
      .map((k) => localizeProfession(k, t))
      .filter(Boolean);
    const professionDisplay = professionLabels.join(' · ');

    const shortSummary = ai?.shortSummary || ai?.summary || '';
    const bidCount = bidCounts[item.id] || 0;
    const lastSeen = unreadBaseline[item.id]?.lastSeenBidCount || 0;
    const unread = Math.max(0, bidCount - lastSeen);
    const showBadge =
      unread > 0 &&
      (item.status === REQUEST_STATUS.OPEN || item.status === REQUEST_STATUS.PAUSED);

    // First image from the request's media, used as the thumbnail.
    const firstMedia = Array.isArray((item as any).media) ? (item as any).media[0] : null;
    const thumbUri =
      firstMedia?.thumbnailUrl ||
      (firstMedia?.type !== 'video' ? firstMedia?.downloadUrl || firstMedia?.url : null);

    return (
      <Pressable onPress={() => openRequest(item.id)} style={styles.requestCard}>
        {thumbUri ? (
          <Image source={{ uri: thumbUri }} style={styles.requestThumb} />
        ) : (
          <View style={styles.requestIcon}>
            <Ionicons name="build" size={22} color={COLORS.primary} />
          </View>
        )}

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.requestTitle}>
            {professionDisplay || t('requests.serviceRequest')}
          </Text>
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

      {/* Filters — wrap-to-new-line instead of horizontal scroll so the
          labels don't get clipped when the row is wider than the screen. */}
      <View style={styles.chipRow}>
        <Text style={styles.chipLabel}>תאריך</Text>
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
      </View>
      <View style={styles.chipRow}>
        <Text style={styles.chipLabel}>סטטוס</Text>
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

function rangeCutoffMs(range: DateRange): number | null {
  const DAY = 24 * 3600_000;
  switch (range) {
    case 'today': return DAY;
    case '7d': return 7 * DAY;
    case '30d': return 30 * DAY;
    case 'all': return null;
  }
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    marginBottom: 6,
  },
  chipLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '700',
    marginRight: 4,
  },
  chip: {
    paddingHorizontal: 10,
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
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  requestTitle: {
    color: COLORS.text,
    fontSize: 15,
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
