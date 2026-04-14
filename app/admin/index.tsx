import { View, Text, ScrollView, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { COLORS, SPACING, RADII } from '../../src/constants';
import {
  MOCK_HEADLINE, MOCK_ACTIVE_REQUESTS, MOCK_LOW_RATED, MOCK_ALERTS,
} from '../../src/services/admin/mockData';

function formatWaitTime(minutes: number): string {
  if (minutes < 60) return `${minutes} דק'`;
  const hours = Math.floor(minutes / 60);
  return `${hours} שע'`;
}

function waitTimeColor(minutes: number): string {
  if (minutes < 30) return '#22C55E';
  if (minutes <= 120) return '#F59E0B';
  return '#EF4444';
}

function waveIndicator(wave: number): string {
  if (wave === 1) return '1';
  if (wave === 2) return '2';
  return '3';
}

function waveColor(wave: number): string {
  if (wave === 1) return '#22C55E';
  if (wave === 2) return '#F59E0B';
  return '#EF4444';
}

function severityColor(severity: string): string {
  if (severity === 'critical') return '#EF4444';
  if (severity === 'warning') return '#F59E0B';
  return '#6366F1';
}

function severityIcon(severity: string): string {
  if (severity === 'critical') return '\u{1F534}';
  if (severity === 'warning') return '\u{1F7E1}';
  return '\u{1F535}';
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `לפני ${mins} דקות`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  const days = Math.floor(hours / 24);
  return `לפני ${days} ימים`;
}

export default function OverviewPage() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      <HeadlineStats />
      <SectionTitle text="בקשות פעילות" />
      <ActiveRequestsTable />
      <LowRatedAlerts />
      <SectionTitle text="התראות אחרונות" />
      <RecentAlerts />
    </ScrollView>
  );
}

function HeadlineStats() {
  const h = MOCK_HEADLINE;
  const cards = [
    { label: 'בקשות היום', value: String(h.todayRequests) },
    { label: 'שידוכים היום', value: String(h.todayMatches) },
    { label: 'זמן תגובה ממוצע', value: `${h.avgResponseMinutes} דק'` },
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

function SectionTitle({ text }: { text: string }) {
  return <Text style={styles.sectionTitle}>{text}</Text>;
}

function ActiveRequestsTable() {
  const sorted = [...MOCK_ACTIVE_REQUESTS].sort((a, b) => b.minutesOpen - a.minutesOpen);

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.thPhone]}>לקוח</Text>
        <Text style={[styles.th, styles.thProf]}>מקצוע</Text>
        <Text style={[styles.th, styles.thArea]}>אזור</Text>
        <Text style={[styles.th, styles.thSmall]}>גל</Text>
        <Text style={[styles.th, styles.thSmall]}>הצעות</Text>
        <Text style={[styles.th, styles.thTime]}>ממתין</Text>
      </View>
      {sorted.map((req) => {
        const isUrgent = req.bidCount === 0 && req.minutesOpen > 60;
        return (
          <View
            key={req.id}
            style={[styles.tableRow, isUrgent && styles.tableRowUrgent]}
          >
            <Text style={[styles.td, styles.thPhone]} numberOfLines={1}>
              {req.customerPhone}
            </Text>
            <Text style={[styles.td, styles.thProf]} numberOfLines={1}>
              {req.profession}
            </Text>
            <Text style={[styles.td, styles.thArea]} numberOfLines={1}>
              {req.area}
            </Text>
            <View style={[styles.thSmall, { alignItems: 'center' }]}>
              <View style={[styles.waveBadge, { backgroundColor: waveColor(req.wave) + '20' }]}>
                <Text style={[styles.waveText, { color: waveColor(req.wave) }]}>
                  {waveIndicator(req.wave)}
                </Text>
              </View>
            </View>
            <Text style={[styles.td, styles.thSmall, { textAlign: 'center' }]}>
              {req.bidCount}
            </Text>
            <Text
              style={[
                styles.td, styles.thTime,
                { color: waitTimeColor(req.minutesOpen), fontWeight: '700' },
              ]}
            >
              {formatWaitTime(req.minutesOpen)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function LowRatedAlerts() {
  if (MOCK_LOW_RATED.length === 0) return null;

  return (
    <View style={styles.lowRatedSection}>
      <Text style={styles.lowRatedTitle}>ספקים עם דירוג נמוך</Text>
      {MOCK_LOW_RATED.map((p, i) => (
        <View key={i} style={styles.lowRatedCard}>
          <View style={styles.lowRatedHeader}>
            <Text style={styles.lowRatedName}>{p.name}</Text>
            <Text style={styles.lowRatedProf}>{p.profession}</Text>
            <Text style={styles.lowRatedRating}>{p.rating}</Text>
            <Text style={styles.lowRatedReviews}>{p.reviews} ביקורות</Text>
          </View>
          <Text style={styles.lowRatedReview}>"{p.lastReview}"</Text>
        </View>
      ))}
    </View>
  );
}

function RecentAlerts() {
  const recent = MOCK_ALERTS.slice(0, 5);

  return (
    <View style={styles.alertsList}>
      {recent.map((alert) => (
        <View
          key={alert.id}
          style={[styles.alertRow, !alert.read && styles.alertUnread]}
        >
          <Text style={styles.alertIcon}>{severityIcon(alert.severity)}</Text>
          <View style={styles.alertBody}>
            <Text style={styles.alertMessage}>{alert.message}</Text>
            <Text style={styles.alertTime}>{timeAgo(alert.createdAt)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: 40 },
  contentDesktop: { maxWidth: 900, alignSelf: 'center', width: '100%' },

  cardsRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  card: {
    flex: 1, minWidth: 140, backgroundColor: COLORS.surface,
    borderRadius: RADII.md, padding: SPACING.md, alignItems: 'center',
  },
  cardValue: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  cardLabel: { fontSize: 12, color: COLORS.textSecondary },

  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.text,
    marginTop: SPACING.md, marginBottom: SPACING.sm,
  },

  table: { backgroundColor: COLORS.surface, borderRadius: RADII.md, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  tableRowUrgent: { backgroundColor: 'rgba(239, 68, 68, 0.08)' },
  th: { fontSize: 11, fontWeight: '700', color: COLORS.textTertiary },
  td: { fontSize: 13, color: COLORS.text },
  thPhone: { flex: 2 },
  thProf: { flex: 2 },
  thArea: { flex: 1.5 },
  thSmall: { flex: 1, textAlign: 'center' },
  thTime: { flex: 1.2, textAlign: 'center' },

  waveBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADII.sm },
  waveText: { fontSize: 11, fontWeight: '700' },

  lowRatedSection: {
    marginTop: SPACING.lg, backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: RADII.md, padding: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  lowRatedTitle: { fontSize: 14, fontWeight: '700', color: '#EF4444', marginBottom: SPACING.sm },
  lowRatedCard: { backgroundColor: COLORS.surface, borderRadius: RADII.sm, padding: SPACING.sm },
  lowRatedHeader: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 4 },
  lowRatedName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  lowRatedProf: { fontSize: 12, color: COLORS.textSecondary },
  lowRatedRating: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  lowRatedReviews: { fontSize: 11, color: COLORS.textTertiary },
  lowRatedReview: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic' },

  alertsList: {
    backgroundColor: COLORS.surface, borderRadius: RADII.md, overflow: 'hidden',
  },
  alertRow: {
    flexDirection: 'row', gap: 10, padding: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  alertUnread: { backgroundColor: 'rgba(99, 102, 241, 0.06)' },
  alertIcon: { fontSize: 14, marginTop: 2 },
  alertBody: { flex: 1 },
  alertMessage: { fontSize: 13, color: COLORS.text, lineHeight: 18 },
  alertTime: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },
});
