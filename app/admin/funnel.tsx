import { View, Text, ScrollView, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { COLORS, SPACING, RADII } from '../../src/constants';
import { MOCK_FUNNEL } from '../../src/services/admin/mockData';

export default function FunnelPage() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      <KeyMetrics />
      <SectionTitle text="משפך המרה" />
      <FunnelTable />
      <ReturnCustomers />
    </ScrollView>
  );
}

function SectionTitle({ text }: { text: string }) {
  return <Text style={styles.sectionTitle}>{text}</Text>;
}

function KeyMetrics() {
  const d = MOCK_FUNNEL;
  const cards = [
    { label: 'אחוז המרה', value: `${d.conversionRate}%` },
    { label: 'זמן לתגובה', value: d.avgTimeToFirstBid != null ? `${d.avgTimeToFirstBid} דק'` : '-' },
    { label: 'הצעות/בקשה', value: d.avgBidsPerRequest != null ? String(d.avgBidsPerRequest) : '-' },
    { label: 'בקשות ללא הצעה', value: String(d.requestsWithZeroBids), warn: d.requestsWithZeroBids > 10 },
  ];

  return (
    <View style={styles.cardsRow}>
      {cards.map((c) => (
        <View key={c.label} style={styles.card}>
          <Text style={[styles.cardValue, c.warn && styles.cardValueWarn]}>{c.value}</Text>
          <Text style={styles.cardLabel}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

function FunnelTable() {
  const { steps } = MOCK_FUNNEL;
  const maxDropOff = Math.max(...steps.map((s) => s.dropOff));

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.thStep]}>שלב</Text>
        <Text style={[styles.th, styles.thNum]}>משתמשים</Text>
        <Text style={[styles.th, styles.thNum]}>נטישה</Text>
        <Text style={[styles.th, styles.thNum]}>המרה</Text>
        <Text style={[styles.th, styles.thIssue]}>תובנה</Text>
      </View>
      {steps.map((step) => {
        const isWorstDrop = step.dropOff > 0 && step.dropOff === maxDropOff;
        return (
          <View key={step.name} style={[styles.tableRow, isWorstDrop && styles.tableRowBad]}>
            <Text style={[styles.td, styles.thStep]}>{step.nameHe}</Text>
            <Text style={[styles.td, styles.thNum]}>{step.count}</Text>
            <Text style={[styles.td, styles.thNum, isWorstDrop && styles.tdBad]}>
              {step.dropOff > 0 ? `-${step.dropOff}` : ''}
            </Text>
            <Text style={[styles.td, styles.thNum]}>{step.conversionPercent}%</Text>
            <Text style={[styles.td, styles.thIssue, styles.issueText]} numberOfLines={2}>
              {step.issue || ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ReturnCustomers() {
  const returning = MOCK_FUNNEL.returningCustomers ?? 0;
  const total = MOCK_FUNNEL.totalCustomers ?? MOCK_FUNNEL.totalRequests;
  const pct = total > 0 ? Math.round((returning / total) * 100) : 0;

  return (
    <View style={styles.retentionCard}>
      <Text style={styles.retentionLabel}>
        לקוחות חוזרים: {pct}% ({returning} מתוך {total}) השתמשו יותר מפעם אחת
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: 40 },
  contentDesktop: { maxWidth: 900, alignSelf: 'center', width: '100%' },

  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.text,
    marginTop: SPACING.md, marginBottom: SPACING.sm,
  },

  cardsRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  card: {
    flex: 1, minWidth: 140, backgroundColor: COLORS.surface,
    borderRadius: RADII.md, padding: SPACING.md, alignItems: 'center',
  },
  cardValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  cardValueWarn: { color: '#F59E0B' },
  cardLabel: { fontSize: 12, color: COLORS.textSecondary },

  table: { backgroundColor: COLORS.surface, borderRadius: RADII.md, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tableRow: {
    flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  tableRowBad: { backgroundColor: 'rgba(239, 68, 68, 0.10)' },
  th: { fontSize: 11, fontWeight: '700', color: COLORS.textTertiary },
  td: { fontSize: 13, color: COLORS.text },
  thStep: { flex: 2.5 },
  thNum: { flex: 1, textAlign: 'center' },
  thIssue: { flex: 3 },
  issueText: { fontSize: 11, color: '#F59E0B' },
  tdBad: { color: '#EF4444', fontWeight: '700' },

  retentionCard: {
    marginTop: SPACING.lg, backgroundColor: COLORS.surface,
    borderRadius: RADII.md, padding: SPACING.md,
  },
  retentionLabel: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
});
