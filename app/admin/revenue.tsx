import { View, Text, ScrollView, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { COLORS, SPACING, RADII } from '../../src/constants';
import { MOCK_REVENUE, MOCK_ERRORS } from '../../src/services/admin/mockData';

function formatCurrency(value: number): string {
  return `${value.toLocaleString('he-IL')}₪`;
}

function severityColor(severity: string): string {
  if (severity === 'critical') return '#EF4444';
  if (severity === 'bug') return '#F59E0B';
  return '#6366F1';
}

function severityIcon(severity: string): string {
  if (severity === 'critical') return '\u{1F534}';
  if (severity === 'bug') return '\u{1F7E1}';
  return '\u{1F4A1}';
}

export default function RevenuePage() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      <FinancialSummary />
      <SectionTitle text="מחיר ממוצע לפי קטגוריה" />
      <PriceByCategoryTable />
      <SectionTitle text="דיווחים ומשוב" />
      <ErrorSummary />
      <RecentFeedback />
    </ScrollView>
  );
}

function SectionTitle({ text }: { text: string }) {
  return <Text style={styles.sectionTitle}>{text}</Text>;
}

function FinancialSummary() {
  const r = MOCK_REVENUE;
  const cards = [
    { label: 'שווי עבודה ממוצע', value: formatCurrency(r.avgJobValue) },
    { label: 'סה"כ עבודות שנסגרו', value: formatCurrency(r.totalJobValue) },
    { label: 'עמלה פוטנציאלית (10%)', value: formatCurrency(r.potentialCommission10) },
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

function PriceByCategoryTable() {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.thCat]}>קטגוריה</Text>
        <Text style={[styles.th, styles.thSmall]}>מחיר ממוצע</Text>
        <Text style={[styles.th, styles.thSmall]}>עבודות</Text>
      </View>
      {MOCK_REVENUE.categoryAvgPrices.map((cat) => (
        <View key={cat.category} style={styles.tableRow}>
          <Text style={[styles.td, styles.thCat]}>{cat.category}</Text>
          <Text style={[styles.td, styles.thSmall]}>{formatCurrency(cat.avgPrice)}</Text>
          <Text style={[styles.td, styles.thSmall]}>{cat.count}</Text>
        </View>
      ))}
    </View>
  );
}

function ErrorSummary() {
  const e = MOCK_ERRORS;

  return (
    <View style={styles.errorSummary}>
      <Text style={styles.errorSummaryTitle}>
        דיווחים: {e.totalFeedback} סה"כ
      </Text>
      <View style={styles.errorCountsRow}>
        <ErrorCount label="קריטי" count={e.criticalCount} color="#EF4444" />
        <ErrorCount label="באג" count={e.bugCount} color="#F59E0B" />
        <ErrorCount label="הצעות" count={e.suggestionCount} color="#6366F1" />
        <ErrorCount label="כישלונות AI" count={e.aiFailures} color="#EF4444" />
      </View>
    </View>
  );
}

function ErrorCount({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={styles.errorCountBadge}>
      <View style={[styles.errorDot, { backgroundColor: color }]} />
      <Text style={styles.errorCountText}>{count} {label}</Text>
    </View>
  );
}

function RecentFeedback() {
  return (
    <View style={styles.feedbackList}>
      <Text style={styles.feedbackTitle}>דיווחים אחרונים:</Text>
      {MOCK_ERRORS.recentFeedback.map((fb, i) => (
        <View key={i} style={styles.feedbackRow}>
          <Text style={styles.feedbackIcon}>{severityIcon(fb.severity)}</Text>
          <View style={styles.feedbackBody}>
            <Text style={styles.feedbackText}>
              {fb.text} <Text style={styles.feedbackScreen}>({fb.screen})</Text>
            </Text>
            <Text style={styles.feedbackTime}>{fb.time}</Text>
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

  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.text,
    marginTop: SPACING.lg, marginBottom: SPACING.sm,
  },

  cardsRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  card: {
    flex: 1, minWidth: 140, backgroundColor: COLORS.surface,
    borderRadius: RADII.md, padding: SPACING.md, alignItems: 'center',
  },
  cardValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  cardLabel: { fontSize: 12, color: COLORS.textSecondary },

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
  th: { fontSize: 11, fontWeight: '700', color: COLORS.textTertiary },
  td: { fontSize: 13, color: COLORS.text },
  thCat: { flex: 2, textAlign: 'right' },
  thSmall: { flex: 1, textAlign: 'center' },

  errorSummary: {
    backgroundColor: COLORS.surface, borderRadius: RADII.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  errorSummaryTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  errorCountsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  errorCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  errorDot: { width: 8, height: 8, borderRadius: 4 },
  errorCountText: { fontSize: 12, color: COLORS.text },

  feedbackList: {
    backgroundColor: COLORS.surface, borderRadius: RADII.md,
    padding: SPACING.md, marginTop: SPACING.sm,
  },
  feedbackTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  feedbackRow: {
    flexDirection: 'row', gap: 8, paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  feedbackIcon: { fontSize: 14, marginTop: 1 },
  feedbackBody: { flex: 1 },
  feedbackText: { fontSize: 13, color: COLORS.text, lineHeight: 18 },
  feedbackScreen: { color: COLORS.textTertiary },
  feedbackTime: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },
});
