import { View, Text, ScrollView, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { COLORS, SPACING, RADII } from '../../src/constants';
import { MOCK_PROVIDERS } from '../../src/services/admin/mockData';

function ratingColor(rating: number | null): string {
  if (rating == null) return COLORS.textTertiary;
  if (rating >= 4.0) return '#22C55E';
  if (rating >= 3.0) return '#F59E0B';
  return '#EF4444';
}

function formatTime(minutes: number | null | undefined): string {
  if (minutes == null) return '-';
  if (minutes < 60) return `${minutes} דק'`;
  const hours = Math.floor(minutes / 60);
  return `${hours} שע'`;
}

export default function ProvidersPage() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      <SummaryCards />
      <SectionTitle text="דירוג לפי קטגוריה" />
      <CategoryRatingTable />
      <SectionTitle text="יחס הצעה-זכייה" />
      <BidWinTable />
    </ScrollView>
  );
}

function SectionTitle({ text }: { text: string }) {
  return <Text style={styles.sectionTitle}>{text}</Text>;
}

function SummaryCards() {
  const providers = MOCK_PROVIDERS;
  const active = providers.filter((p) => p.accepted > 0).length;

  const totalOffers = providers.reduce((s, p) => s + p.offersSent, 0);
  const totalReplied = providers.reduce((s, p) => s + p.accepted, 0);
  const avgReply = totalOffers > 0 ? Math.round((totalReplied / totalOffers) * 100) : 0;

  const rated = providers.filter((p) => p.avgRating != null);
  const avgRating = rated.length > 0
    ? Math.round((rated.reduce((s, p) => s + (p.avgRating ?? 0), 0) / rated.length) * 10) / 10
    : null;

  const priced = providers.filter((p) => p.avgPrice != null);
  const avgPrice = priced.length > 0
    ? Math.round(priced.reduce((s, p) => s + (p.avgPrice ?? 0), 0) / priced.length)
    : null;

  const cards = [
    { label: 'ספקים פעילים', value: String(active) },
    { label: 'אחוז מענה', value: `${avgReply}%` },
    { label: 'דירוג ממוצע', value: avgRating != null ? String(avgRating) : '-' },
    { label: 'מחיר ממוצע', value: avgPrice != null ? `${avgPrice.toLocaleString('he-IL')}₪` : '-' },
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

function CategoryRatingTable() {
  const catMap: Record<string, { ratings: number[]; count: number; offers: number }> = {};

  for (const p of MOCK_PROVIDERS) {
    const prof = p.profession ?? 'אחר';
    if (!catMap[prof]) catMap[prof] = { ratings: [], count: 0, offers: 0 };
    catMap[prof].count++;
    catMap[prof].offers += p.offersSent;
    if (p.avgRating != null) catMap[prof].ratings.push(p.avgRating);
  }

  const categories = Object.entries(catMap).map(([name, data]) => {
    const avgRating = data.ratings.length > 0
      ? Math.round((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length) * 10) / 10
      : null;
    return { name, avgRating, count: data.count, offers: data.offers };
  }).sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.thCat]}>קטגוריה</Text>
        <Text style={[styles.th, styles.thSmall]}>דירוג</Text>
        <Text style={[styles.th, styles.thSmall]}>ספקים</Text>
        <Text style={[styles.th, styles.thSmall]}>הצעות</Text>
      </View>
      {categories.map((cat) => (
        <View key={cat.name} style={styles.tableRow}>
          <Text style={[styles.td, styles.thCat]}>{cat.name}</Text>
          <Text style={[styles.td, styles.thSmall, { color: ratingColor(cat.avgRating), fontWeight: '700' }]}>
            {cat.avgRating != null ? cat.avgRating : '-'}
          </Text>
          <Text style={[styles.td, styles.thSmall]}>{cat.count}</Text>
          <Text style={[styles.td, styles.thSmall]}>{cat.offers}</Text>
        </View>
      ))}
    </View>
  );
}

function BidWinTable() {
  const sorted = [...MOCK_PROVIDERS].sort((a, b) => {
    const ratioA = a.offersSent > 0 ? a.completed / a.offersSent : 0;
    const ratioB = b.offersSent > 0 ? b.completed / b.offersSent : 0;
    return ratioB - ratioA;
  });

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.thName]}>ספק</Text>
        <Text style={[styles.th, styles.thSmall]}>הצעות</Text>
        <Text style={[styles.th, styles.thSmall]}>נבחר</Text>
        <Text style={[styles.th, styles.thSmall]}>יחס זכייה</Text>
        <Text style={[styles.th, styles.thSmall]}>דירוג</Text>
        <Text style={[styles.th, styles.thSmall]}>זמן תגובה</Text>
      </View>
      {sorted.map((p) => {
        const winRate = p.offersSent > 0 ? Math.round((p.completed / p.offersSent) * 100) : 0;
        const isLow = (p.avgResponseMinutes ?? 0) > 120 || winRate === 0;
        return (
          <View key={p.phone} style={[styles.tableRow, isLow && styles.tableRowBad]}>
            <Text style={[styles.td, styles.thName]} numberOfLines={1}>{p.displayName}</Text>
            <Text style={[styles.td, styles.thSmall]}>{p.accepted}</Text>
            <Text style={[styles.td, styles.thSmall]}>{p.completed}</Text>
            <Text style={[styles.td, styles.thSmall, { fontWeight: '700' }]}>{winRate}%</Text>
            <Text style={[styles.td, styles.thSmall, { color: ratingColor(p.avgRating) }]}>
              {p.avgRating != null ? p.avgRating : '\u2014'}
            </Text>
            <Text style={[styles.td, styles.thSmall, {
              color: (p.avgResponseMinutes ?? 0) > 120 ? '#EF4444' : COLORS.text,
            }]}>
              {formatTime(p.avgResponseMinutes)}
            </Text>
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

  cardsRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.lg, flexWrap: 'wrap' },
  card: {
    flex: 1, minWidth: 120, backgroundColor: COLORS.surface,
    borderRadius: RADII.md, padding: SPACING.md, alignItems: 'center',
  },
  cardValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  cardLabel: { fontSize: 12, color: COLORS.textSecondary },

  table: { backgroundColor: COLORS.surface, borderRadius: RADII.md, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  tableRowBad: { backgroundColor: 'rgba(239, 68, 68, 0.08)' },
  th: { fontSize: 11, fontWeight: '700', color: COLORS.textTertiary, textAlign: 'center' },
  td: { fontSize: 12, color: COLORS.text, textAlign: 'center' },
  thCat: { flex: 2, textAlign: 'right' },
  thName: { flex: 2, textAlign: 'right' },
  thSmall: { flex: 1, textAlign: 'center' },
});
