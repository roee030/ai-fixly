import { useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADII } from '../../constants';
import { seedAdminMocks } from '../../services/admin/mockSeeder';

/**
 * Dev-mode-only button that seeds the admin collections with 14 days of
 * adminStats, 6 provider aggregates, and 8 mock serviceRequests so the
 * dashboard renders real-looking graphs + tables even on a fresh project.
 *
 * Hidden in production — returns null when __DEV__ is false.
 */
export function SeedMocksButton() {
  const [busy, setBusy] = useState(false);

  if (!__DEV__) return null;

  const handlePress = async () => {
    Alert.alert(
      'להזריק נתונים לדוגמה?',
      'זה יוסיף 14 ימים של stats, 6 בעלי מקצוע, ו-8 בקשות לדוגמה לבסיס הנתונים. בטוח לחזור על הפעולה.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'הזרק',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const counts = await seedAdminMocks();
              Alert.alert(
                'הושלם',
                `נוצרו:\n${counts.days} ימי stats\n${counts.providers} בעלי מקצוע\n${counts.requests} בקשות\n${counts.events} אירועי שירות\n${counts.jobs} היסטוריות עבודה\n${counts.alerts} התראות`,
              );
            } catch (err) {
              Alert.alert('שגיאה', String((err as Error).message || err));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Pressable onPress={handlePress} disabled={busy} style={styles.btn}>
      {busy ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <>
          <Ionicons name="flask-outline" size={14} color="#FFFFFF" />
          <Text style={styles.text}>הזרק נתוני דמו</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADII.sm,
    backgroundColor: '#8B5CF6',
  },
  text: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
