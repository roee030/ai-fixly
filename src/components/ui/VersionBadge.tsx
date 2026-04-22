import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { COLORS, SPACING, RADII } from '../../constants';

/**
 * Compact version badge + "check for updates" button for the Profile tab.
 *
 * Why it matters: non-visual OTA updates (e.g. a backend refactor, a bug
 * fix in a service) leave the user with no way to tell whether the update
 * reached them. The badge shows the short git SHA baked into the build
 * plus the expo-updates update-id, so you can compare against the latest
 * commit on GitHub at a glance.
 */
export function VersionBadge() {
  const [busy, setBusy] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? '?';
  const runtimeVersion = (Constants.expoConfig as any)?.runtimeVersion ?? '?';
  const updateId = Updates.updateId ?? 'embedded';
  const shortUpdateId = updateId.slice(0, 8);
  const createdAt = Updates.createdAt ? new Date(Updates.createdAt).toLocaleString('he-IL') : 'embedded build';
  const channel = (Updates as any).channel ?? 'n/a';

  const handleCheck = async () => {
    if (__DEV__) {
      Alert.alert('מצב פיתוח', 'עדכוני OTA פועלים רק ב-build מ-EAS, לא במצב פיתוח.');
      return;
    }
    setBusy(true);
    try {
      const check = await Updates.checkForUpdateAsync();
      if (!check.isAvailable) {
        Alert.alert('מעודכן', 'זו הגרסה העדכנית ביותר.');
        return;
      }
      await Updates.fetchUpdateAsync();
      Alert.alert(
        'עדכון מוכן',
        'העדכון הורד בהצלחה. האפליקציה תיטען מחדש כעת.',
        [{ text: 'טען עכשיו', onPress: () => Updates.reloadAsync() }],
      );
    } catch (err) {
      Alert.alert('שגיאה', String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>גרסה:</Text>
        <Text style={styles.value}>
          {appVersion} · {shortUpdateId}
        </Text>
      </View>
      <Text style={styles.meta}>{createdAt}</Text>
      <Pressable
        onPress={handleCheck}
        disabled={busy}
        style={[styles.btn, busy && { opacity: 0.6 }]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Text style={styles.btnText}>בדוק עדכונים</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { fontSize: 12, color: COLORS.textSecondary },
  value: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.text,
  },
  meta: { fontSize: 10, color: COLORS.textTertiary },
  btn: {
    marginTop: 6,
    paddingVertical: 8,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
  },
  btnText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
});
