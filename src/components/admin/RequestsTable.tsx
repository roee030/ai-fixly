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
    <View>
      {/* Urgency color legend — makes the colored rows below self-explanatory. */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>התראות:</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(239, 68, 68, 0.5)' }]} />
          <Text style={styles.legendLabel}>תקוע ללא הצעות מעל 4 שעות</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(245, 158, 11, 0.5)' }]} />
          <Text style={styles.legendLabel}>פתוח ללא הצעות מעל שעה</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(34, 197, 94, 0.5)' }]} />
          <Text style={styles.legendLabel}>נסגר עם דירוג גבוה</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.headerRow}>
          <Text style={[styles.th, styles.colDate]}>תאריך</Text>
          <Text style={[styles.th, styles.colCity]}>עיר</Text>
          <Text style={[styles.th, styles.colProf]}>מקצוע</Text>
          <Text style={[styles.th, styles.colStatus]}>סטטוס</Text>
          <Text style={[styles.th, styles.colNum]}>TTFR</Text>
          <Text style={[styles.th, styles.colNum]}>שולם</Text>
          <Text style={[styles.th, styles.colNum]}>⭐</Text>
        </View>

        {rows.map((row) => {
          const urgency = urgencyTint(row);
          return (
            <Pressable
              key={row.id}
              onPress={() => router.push({ pathname: '/admin/requests/[id]', params: { id: row.id } } as never)}
              style={[styles.row, urgency.style]}
            >
              <View style={styles.colDate}>
                <Text style={styles.dateMain}>{formatShortDate(row.createdAt)}</Text>
                <Text style={styles.dateRelative}>{formatRelative(row.createdAt)}</Text>
              </View>
              <Text style={[styles.td, styles.colCity]} numberOfLines={1}>
                {CITY_LABELS_HE[row.city] || row.city}
              </Text>
              <Text style={[styles.td, styles.colProf]} numberOfLines={1}>
                {row.professions.join(', ') || '—'}
              </Text>
              <View style={styles.colStatus}>
                <StatusBadge status={row.status} />
                {urgency.label && (
                  <Text style={[styles.urgencyLabel, { color: urgency.color }]}>
                    {urgency.label}
                  </Text>
                )}
              </View>
              <Text style={[styles.td, styles.colNum]}>
                {row.timeToFirstResponse !== undefined ? `${row.timeToFirstResponse}'` : '—'}
              </Text>
              <Text style={[styles.td, styles.colNum]}>
                {row.pricePaid ?? '—'}
              </Text>
              <Text style={[styles.td, styles.colNum]}>
                {row.rating ? '⭐'.repeat(Math.round(row.rating)) : '—'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function formatShortDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month} ${hh}:${mm}`;
}

function formatRelative(d: Date): string {
  const diffMin = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (diffMin < 60) return `לפני ${diffMin}'`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `לפני ${diffH} שע`;
  const diffD = Math.floor(diffH / 24);
  return `לפני ${diffD} ימים`;
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

interface UrgencyResult {
  style: ViewStyle;
  label: string;
  color: string;
}

function urgencyTint(row: AdminRequestRow): UrgencyResult {
  const ageMin = (Date.now() - row.createdAt.getTime()) / 60_000;
  const noBids = row.sentCount === 0 || row.timeToFirstResponse === undefined;

  if (row.status === 'open' && noBids && ageMin > 240) {
    return {
      style: { backgroundColor: 'rgba(239, 68, 68, 0.08)' },
      label: '🚨 תקוע',
      color: '#EF4444',
    };
  }
  if (row.status === 'open' && noBids && ageMin > 60) {
    return {
      style: { backgroundColor: 'rgba(245, 158, 11, 0.08)' },
      label: '⏰ איטי',
      color: '#F59E0B',
    };
  }
  if (row.status === 'closed' && (row.rating ?? 0) >= 4) {
    return {
      style: { backgroundColor: 'rgba(34, 197, 94, 0.06)' },
      label: '',
      color: '#22C55E',
    };
  }
  return { style: {}, label: '', color: '' };
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
  colDate:   { flex: 1.4 },
  colCity:   { flex: 1 },
  colProf:   { flex: 1.5 },
  colStatus: { flex: 1.3, alignItems: 'flex-start', justifyContent: 'center' },
  colNum:    { flex: 0.8, textAlign: 'center' },
  dateMain:  { fontSize: 11, color: COLORS.text, fontWeight: '600' },
  dateRelative: { fontSize: 10, color: COLORS.textTertiary, marginTop: 1 },
  urgencyLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  legend: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: 4,
  },
  legendTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { fontSize: 11, color: COLORS.textSecondary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { padding: SPACING.lg, alignItems: 'center' },
  emptyText: { color: COLORS.textTertiary, fontSize: 14 },
});
