import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADII } from '../../constants';
import type { AdminRequestEvent } from '../../services/admin/requestDetailQuery';

interface Props {
  events: AdminRequestEvent[];
}

const EVENT_COLORS: Record<string, string> = {
  gemini: '#6366F1',
  upload_image: '#10B981',
  upload_video: '#10B981',
  firestore_write: '#64748B',
  places_search: '#F59E0B',
  twilio_send: '#22C55E',
  push_notify: '#EC4899',
  first_response: '#22C55E',
  review_submitted: '#8B5CF6',
  broadcast_failed: '#EF4444',
};

const EVENT_LABELS_HE: Record<string, string> = {
  gemini: 'ניתוח AI',
  upload_image: 'העלאת תמונה',
  upload_video: 'העלאת וידאו',
  firestore_write: 'כתיבת מסד נתונים',
  places_search: 'חיפוש Places',
  twilio_send: 'שליחת WhatsApp',
  push_notify: 'התראת push',
  first_response: 'תגובה ראשונה',
  review_submitted: 'הגשת ביקורת',
  broadcast_failed: 'שידור נכשל',
};

export function ServiceTimeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>אין אירועים שמורים</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {events.map((ev) => {
        const color = !ev.ok ? '#EF4444' : EVENT_COLORS[ev.type] || COLORS.textTertiary;
        const label = EVENT_LABELS_HE[ev.type] || ev.type;
        const timeStr = ev.startedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const durationStr = ev.durationMs > 0
          ? ev.durationMs >= 1000
            ? `${(ev.durationMs / 1000).toFixed(1)}s`
            : `${ev.durationMs}ms`
          : '';
        const metaBits = metaBitsFromEvent(ev);

        return (
          <View key={ev.id} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <View style={styles.body}>
              <Text style={styles.line}>
                <Text style={styles.time}>{timeStr} · </Text>
                <Text style={[styles.typeTag, { color }]}>{label}</Text>
                {durationStr ? <Text style={styles.duration}>  ·  {durationStr}</Text> : null}
                {metaBits ? <Text style={styles.meta}>  ·  {metaBits}</Text> : null}
              </Text>
              {ev.error && <Text style={styles.errorText}>{ev.error}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function metaBitsFromEvent(ev: AdminRequestEvent): string {
  if (!ev.metadata) return '';
  const m = ev.metadata;
  const parts: string[] = [];
  if (m.profession) parts.push(String(m.profession));
  if (typeof m.foundCount === 'number') parts.push(`${m.foundCount} נמצאו`);
  if (m.providerPhone) parts.push(String(m.providerPhone));
  if (m.providerName) parts.push(String(m.providerName));
  if (typeof m.imageCount === 'number') parts.push(`${m.imageCount} תמונות`);
  if (typeof m.sizeMB === 'number' && m.sizeMB > 0) parts.push(`${m.sizeMB.toFixed(1)}MB`);
  if (typeof m.minutesAfterBroadcast === 'number') parts.push(`${m.minutesAfterBroadcast}' אחרי שידור`);
  if (typeof m.rating === 'number') parts.push(`⭐ ${m.rating}`);
  return parts.join(' · ');
}

const styles = StyleSheet.create({
  container: { gap: SPACING.xs, padding: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADII.md },
  row: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start', paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  body: { flex: 1 },
  line: { fontSize: 12, lineHeight: 18, color: COLORS.text },
  time: { color: COLORS.textTertiary, fontSize: 11 },
  typeTag: { fontWeight: '700' },
  duration: { color: COLORS.textTertiary, fontSize: 11 },
  meta: { color: COLORS.textSecondary, fontSize: 11 },
  errorText: {
    color: COLORS.error,
    fontSize: 11,
    marginTop: 2,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  empty: { padding: SPACING.md, alignItems: 'center' },
  emptyText: { color: COLORS.textTertiary, fontSize: 12 },
});
