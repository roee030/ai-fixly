import { useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
  Platform, useWindowDimensions, Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../../../src/constants';
import { CITY_LABELS_HE } from '../../../src/constants/cities';
import { useAdminQuery } from '../../../src/hooks/useAdminQuery';
import { fetchRequestDetail } from '../../../src/services/admin/requestDetailQuery';
import { ServiceTimeline } from '../../../src/components/admin/ServiceTimeline';

export default function RequestDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const fetcher = useCallback(
    () => (id ? fetchRequestDetail(id) : Promise.resolve(null)),
    [id],
  );
  const { data, isLoading, error, refresh } = useAdminQuery(`admin:request:${id || ''}`, fetcher);

  if (isLoading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: COLORS.error }}>שגיאה: {error.message}</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.missing}>הבקשה לא נמצאה</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{CITY_LABELS_HE[data.city] || data.city} · {data.status}</Text>
          <Text style={styles.subtitle}>
            {data.createdAt.toLocaleString('he-IL')}
          </Text>
        </View>
        <Pressable onPress={refresh} style={styles.iconBtn}>
          <Ionicons name="refresh" size={18} color={COLORS.text} />
        </Pressable>
      </View>

      {/* Customer text + media */}
      {data.textDescription ? (
        <Card title="תיאור לקוח">
          <Text style={styles.bodyText}>{data.textDescription}</Text>
          {data.mediaUrls.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {data.mediaUrls.map((u, i) => (
                <Image key={i} source={{ uri: u }} style={styles.thumb} />
              ))}
            </ScrollView>
          )}
        </Card>
      ) : null}

      {/* AI analysis */}
      <Card title="ניתוח AI">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {data.aiProfessions.map((p) => (
            <View key={p} style={styles.chip}>
              <Text style={styles.chipText}>{p}</Text>
            </View>
          ))}
          {data.aiProfessions.length === 0 && (
            <Text style={styles.muted}>אין נתוני ניתוח</Text>
          )}
        </View>
        {data.serviceSummary && (
          <Text style={styles.muted}>
            Gemini: {data.serviceSummary.geminiMs}ms · העלאות: {data.serviceSummary.uploadMs}ms · סה"כ: {data.serviceSummary.totalMs}ms
          </Text>
        )}
      </Card>

      {/* Broadcast summary */}
      {data.broadcastSummary && (
        <Card title="שידור">
          <View style={styles.kvRow}>
            <KV label="נשלח" value={String(data.broadcastSummary.sentCount)} color="#22C55E" />
            <KV label="נכשל" value={String(data.broadcastSummary.failedCount)} color="#EF4444" />
            <KV label="נמצאו" value={String(data.broadcastSummary.providersFound)} />
            {typeof data.timeToFirstResponse === 'number' && (
              <KV label="לתגובה" value={`${data.timeToFirstResponse}'`} color="#6366F1" />
            )}
          </View>
        </Card>
      )}

      {/* Service timeline */}
      <Card title={`אירועי שירות (${data.events.length})`}>
        <ServiceTimeline events={data.events} />
      </Card>

      {/* Bids */}
      <Card title={`הצעות שהתקבלו (${data.bids.length})`}>
        {data.bids.length === 0 ? (
          <Text style={styles.muted}>אין עדיין הצעות</Text>
        ) : (
          <View style={{ gap: 6 }}>
            {data.bids.map((b) => (
              <View key={b.id} style={styles.bidRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bidName}>{b.providerName}</Text>
                  <Text style={styles.bidMeta}>
                    {b.providerPhone} · {b.receivedAt ? b.receivedAt.toLocaleTimeString('he-IL') : '—'}
                  </Text>
                </View>
                <Text style={styles.bidPrice}>{b.price ? `₪${b.price}` : '—'}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Review */}
      <Card title="דירוג לקוח">
        {data.review ? (
          <>
            <Text style={styles.bodyText}>
              {'⭐'.repeat(Math.round(data.review.rating))} · ₪{data.review.pricePaid}
            </Text>
            {data.review.comment && (
              <Text style={[styles.bodyText, { marginTop: 4 }]}>"{data.review.comment}"</Text>
            )}
            <Text style={styles.muted}>
              נשלח {data.review.submittedAt.toLocaleString('he-IL')}
            </Text>
          </>
        ) : (
          <Text style={styles.muted}>ממתין לתגובת לקוח</Text>
        )}
      </Card>
    </ScrollView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function KV({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[styles.kvValue, { color: color || COLORS.text }]}>{value}</Text>
      <Text style={styles.kvLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: 60, gap: SPACING.sm },
  contentDesktop: { maxWidth: 900, alignSelf: 'center', width: '100%' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  missing: { color: COLORS.textTertiary, fontSize: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.xs },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
  },
  iconBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: RADII.sm, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },
  card: {
    backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.md,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  bodyText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  muted: { fontSize: 11, color: COLORS.textTertiary, marginTop: 4 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.primary + '20',
  },
  chipText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  thumb: { width: 72, height: 72, borderRadius: 8, marginRight: 6 },
  kvRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  kvValue: { fontSize: 20, fontWeight: '700' },
  kvLabel: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },
  bidRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 10,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.sm,
    gap: 8,
  },
  bidName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  bidMeta: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },
  bidPrice: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
});
