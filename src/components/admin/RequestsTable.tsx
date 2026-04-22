import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { COLORS, SPACING, RADII } from '../../constants';
import { CITY_LABELS_HE } from '../../constants/cities';
import type { AdminRequestRow } from '../../services/admin/requestsQuery';

interface Props {
  rows: AdminRequestRow[];
}

/**
 * Admin requests list. One row per serviceRequests doc. Row tint encodes
 * urgency so the admin's eye lands on stalled requests first (red),
 * not-yet-triaged ones next (yellow), and closed-happy last (green).
 */
export function RequestsTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>אין בקשות במסנן הזה</Text>
      </View>
    );
  }

  return (
    <View style={styles.table}>
      <View style={styles.headerRow}>
        <Text style={[styles.th, styles.colCity]}>עיר</Text>
        <Text style={[styles.th, styles.colProf]}>מקצוע</Text>
        <Text style={[styles.th, styles.colStatus]}>סטטוס</Text>
        <Text style={[styles.th, styles.colNum]}>TTFR</Text>
        <Text style={[styles.th, styles.colNum]}>הצעה</Text>
        <Text style={[styles.th, styles.colNum]}>שולם</Text>
        <Text style={[styles.th, styles.colNum]}>⭐</Text>
      </View>

      {rows.map((row) => (
        <Pressable
          key={row.id}
          onPress={() => router.push({ pathname: '/admin/requests/[id]', params: { id: row.id } } as never)}
          style={[styles.row, urgencyTint(row)]}
        >
          <Text style={[styles.td, styles.colCity]} numberOfLines={1}>
            {CITY_LABELS_HE[row.city] || row.city}
          </Text>
          <Text style={[styles.td, styles.colProf]} numberOfLines={1}>
            {row.professions.join(', ') || '—'}
          </Text>
          <View style={styles.colStatus}>
            <StatusBadge status={row.status} />
          </View>
          <Text style={[styles.td, styles.colNum]}>
            {row.timeToFirstResponse !== undefined ? `${row.timeToFirstResponse}'` : '—'}
          </Text>
          <Text style={[styles.td, styles.colNum]}>
            {row.selectedBidPrice ?? '—'}
          </Text>
          <Text style={[styles.td, styles.colNum]}>
            {row.pricePaid ?? '—'}
          </Text>
          <Text style={[styles.td, styles.colNum]}>
            {row.rating ? '⭐'.repeat(Math.round(row.rating)) : '—'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || COLORS.textTertiary;
  const label = STATUS_LABELS_HE[status] || status;
  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function urgencyTint(row: AdminRequestRow): ViewStyle {
  const ageMin = (Date.now() - row.createdAt.getTime()) / 60_000;
  const noBids = row.sentCount === 0 || row.timeToFirstResponse === undefined;

  if (row.status === 'open' && noBids && ageMin > 240) {
    return { backgroundColor: 'rgba(239, 68, 68, 0.08)' };  // red — stalled
  }
  if (row.status === 'open' && noBids && ageMin > 60) {
    return { backgroundColor: 'rgba(245, 158, 11, 0.08)' };  // yellow — slow
  }
  if (row.status === 'closed' && (row.rating ?? 0) >= 4) {
    return { backgroundColor: 'rgba(34, 197, 94, 0.06)' };   // green — happy
  }
  return {};
}

const STATUS_COLORS: Record<string, string> = {
  open: '#F59E0B',
  in_progress: '#6366F1',
  closed: '#22C55E',
  paused: '#94A3B8',
  draft: '#94A3B8',
};

const STATUS_LABELS_HE: Record<string, string> = {
  open: 'פתוחה',
  in_progress: 'בתהליך',
  closed: 'נסגרה',
  paused: 'בהמתנה',
  draft: 'טיוטה',
};

const styles = StyleSheet.create({
  table: { backgroundColor: COLORS.surface, borderRadius: RADII.md, overflow: 'hidden' },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  th: { fontSize: 11, fontWeight: '700', color: COLORS.textTertiary },
  td: { fontSize: 13, color: COLORS.text },
  colCity:   { flex: 1.3 },
  colProf:   { flex: 1.8 },
  colStatus: { flex: 1.3, alignItems: 'flex-start', justifyContent: 'center' },
  colNum:    { flex: 0.9, textAlign: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { padding: SPACING.lg, alignItems: 'center' },
  emptyText: { color: COLORS.textTertiary, fontSize: 14 },
});
