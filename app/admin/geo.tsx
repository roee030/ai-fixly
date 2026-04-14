import { View, Text, ScrollView, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { COLORS, SPACING, RADII } from '../../src/constants';
import { MOCK_WAITLIST_BY_CITY, MOCK_DEMAND } from '../../src/services/admin/mockData';

function demandStatus(avgBids: number): { label: string; color: string } {
  if (avgBids >= 3) return { label: 'תקין', color: '#22C55E' };
  if (avgBids >= 1) return { label: 'מעט הצעות', color: '#F59E0B' };
  return { label: 'חסרים ספקים!', color: '#EF4444' };
}

function demandIcon(avgBids: number): string {
  if (avgBids >= 3) return '\u{1F7E2}';
  if (avgBids >= 1) return '\u{1F7E1}';
  return '\u{1F534}';
}

function makeBar(count: number, max: number): string {
  const blocks = Math.max(1, Math.round((count / max) * 16));
  return '\u2588'.repeat(blocks);
}

export default function GeoPage() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      <SectionTitle text="ניסיונות מחוץ לאזור — איפה הביקוש הבא?" />
      <WaitlistTable />
      <SectionTitle text="ביקוש לפי מקצוע ועיר" />
      <DemandHeatmap />
    </ScrollView>
  );
}

function SectionTitle({ text }: { text: string }) {
  return <Text style={styles.sectionTitle}>{text}</Text>;
}

function WaitlistTable() {
  const total = MOCK_WAITLIST_BY_CITY.reduce((s, c) => s + c.count, 0);
  const maxCount = Math.max(...MOCK_WAITLIST_BY_CITY.map((c) => c.count));

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.thCity]}>עיר</Text>
        <Text style={[styles.th, styles.thSmall]}>נרשמו</Text>
        <Text style={[styles.th, styles.thBar]}>אחוז</Text>
      </View>
      {MOCK_WAITLIST_BY_CITY.map((entry) => {
        const pct = total > 0 ? Math.round((entry.count / total) * 100) : 0;
        return (
          <View key={entry.city} style={styles.tableRow}>
            <Text style={[styles.td, styles.thCity]}>{entry.city}</Text>
            <Text style={[styles.td, styles.thSmall]}>{entry.count}</Text>
            <View style={[styles.thBar, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
              <Text style={styles.barText}>{makeBar(entry.count, maxCount)}</Text>
              <Text style={styles.pctText}>{pct}%</Text>
            </View>
          </View>
        );
      })}
      <View style={styles.totalRow}>
        <Text style={styles.totalText}>סה"כ: {total} אנשים מחכים שנגיע אליהם</Text>
      </View>
    </View>
  );
}

function DemandHeatmap() {
  const sorted = [...MOCK_DEMAND].sort((a, b) => b.requests - a.requests);

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.thDemandProf]}>מקצוע x עיר</Text>
        <Text style={[styles.th, styles.thSmall]}>בקשות</Text>
        <Text style={[styles.th, styles.thSmall]}>הצעות ממוצע</Text>
        <Text style={[styles.th, styles.thStatus]}>מצב</Text>
      </View>
      {sorted.map((entry, i) => {
        const status = demandStatus(entry.avgBids);
        return (
          <View key={`${entry.professionKey}-${entry.city}-${i}`} style={styles.tableRow}>
            <Text style={[styles.td, styles.thDemandProf]} numberOfLines={1}>
              {entry.profession} x {entry.city}
            </Text>
            <Text style={[styles.td, styles.thSmall]}>{entry.requests}</Text>
            <Text style={[styles.td, styles.thSmall]}>{entry.avgBids}</Text>
            <View style={[styles.thStatus, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
              <Text>{demandIcon(entry.avgBids)}</Text>
              <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
        );
      })}
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

  table: { backgroundColor: COLORS.surface, borderRadius: RADII.md, overflow: 'hidden', marginBottom: SPACING.md },
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
  thCity: { flex: 1.5 },
  thSmall: { flex: 1, textAlign: 'center' },
  thBar: { flex: 2.5 },
  thDemandProf: { flex: 2.5 },
  thStatus: { flex: 2 },

  barText: { color: COLORS.primary, fontSize: 12, letterSpacing: -1 },
  pctText: { fontSize: 12, color: COLORS.textSecondary },

  totalRow: { padding: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  totalText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },

  statusLabel: { fontSize: 12, fontWeight: '600' },
});
