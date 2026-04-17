import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import * as Location from 'expo-location';
import { PermissionsAndroid, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  getMessaging,
  hasPermission,
  AuthorizationStatus,
  getToken,
} from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { getFirestore, doc, getDoc } from '../../src/services/firestore/imports';
import { COLORS } from '../../src/constants';

/**
 * Dev-only diagnostic screen for push notifications.
 *
 * Goes row-by-row through the three places the push loop can break:
 *   1. Android runtime notification permission.
 *   2. FCM token obtained on this device.
 *   3. FCM token actually saved to Firestore under the signed-in user.
 *
 * If any row is red, that's the thing to fix before wondering why the
 * worker's `sendPush` doesn't land on the phone.
 */
export default function PushTestScreen() {
  const uid = useAuthStore((s) => s.user?.uid || null);
  const [perm, setPerm] = useState<'loading' | 'ok' | 'denied'>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [savedToken, setSavedToken] = useState<string | null | 'missing-user'>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void runChecks();
  }, [uid]);

  const runChecks = async () => {
    setError(null);
    setPerm('loading');
    try {
      if (
        Platform.OS === 'android' &&
        typeof Platform.Version === 'number' &&
        Platform.Version >= 33
      ) {
        const runtimeOk = await PermissionsAndroid.check(
          'android.permission.POST_NOTIFICATIONS' as any,
        );
        if (!runtimeOk) {
          setPerm('denied');
        } else {
          setPerm('ok');
        }
      }
      const messaging = getMessaging(getApp());
      const status = await hasPermission(messaging);
      setPerm(
        status === AuthorizationStatus.AUTHORIZED ||
          status === AuthorizationStatus.PROVISIONAL
          ? 'ok'
          : 'denied',
      );

      const t = await getToken(messaging).catch(() => null);
      setToken(t || null);

      if (!uid) {
        setSavedToken('missing-user');
      } else {
        const snap = await getDoc(doc(getFirestore(), 'users', uid));
        const exists = typeof (snap as any).exists === 'function' ? (snap as any).exists() : (snap as any).exists;
        const fcm: string | undefined = exists ? (snap.data()?.fcmToken as string | undefined) : undefined;
        setSavedToken(fcm || null);
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    }
  };

  const permColor = perm === 'ok' ? COLORS.success : perm === 'denied' ? COLORS.error : COLORS.textTertiary;
  const tokenColor = token ? COLORS.success : COLORS.error;
  const savedTokenOk = typeof savedToken === 'string' && savedToken.length > 0;
  const savedTokenMatches = savedTokenOk && token && savedToken === token;
  const savedColor = savedTokenMatches
    ? COLORS.success
    : savedTokenOk
      ? COLORS.warning
      : COLORS.error;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </Pressable>
          <Text style={styles.title}>Push notifications — diagnostic</Text>
        </View>

        <DiagRow
          label="Notification permission"
          status={perm === 'loading' ? '...' : perm === 'ok' ? 'granted' : 'denied'}
          hint={
            perm === 'denied'
              ? 'Go to Android Settings → Apps → ai-fixly → Notifications → enable, then tap Re-check.'
              : undefined
          }
          color={permColor}
        />
        <DiagRow
          label="FCM token on device"
          status={token ? `present (…${token.slice(-10)})` : 'missing'}
          hint={
            !token
              ? 'Device did not receive a token. Check Google Play Services, reinstall the app, or confirm google-services.json matches your Firebase project.'
              : undefined
          }
          color={tokenColor}
        />
        <DiagRow
          label="FCM token saved to Firestore"
          status={
            savedToken === 'missing-user'
              ? 'user not signed in'
              : !savedTokenOk
                ? 'missing'
                : savedTokenMatches
                  ? 'match ✓'
                  : 'stale (device has a newer token)'
          }
          hint={
            savedToken === null
              ? 'No fcmToken on your user doc. Sign out + sign in, or tap Re-check. The useNotifications hook writes the token on mount.'
              : savedTokenOk && !savedTokenMatches
                ? 'Your Firestore token is different from the current device token. The worker will push to the OLD device. Sign out + sign in to refresh.'
                : undefined
          }
          color={savedColor}
        />

        {uid && (
          <Text style={styles.uidLine} selectable>
            uid: {uid}
          </Text>
        )}
        {error && (
          <Text style={styles.error}>{error}</Text>
        )}

        <View style={{ marginTop: 24 }}>
          <Button title="Re-check" onPress={runChecks} />
        </View>

        <View style={styles.hint}>
          <Text style={styles.hintTitle}>If all three rows are green</Text>
          <Text style={styles.hintText}>
            The device is ready. Run `wrangler tail` on the worker, trigger a bid, and look for:
          </Text>
          <Text style={styles.code}>[fcm] push sent title=…</Text>
          <Text style={styles.hintText}>
            If that line appears but nothing shows up on the phone, the issue is at the OS layer
            (doze mode, battery optimisation, manufacturer push whitelist).
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function DiagRow({
  label,
  status,
  hint,
  color,
}: {
  label: string;
  status: string;
  hint?: string;
  color: string;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowStatus, { color }]}>{status}</Text>
        {hint && <Text style={styles.rowHint}>{hint}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: 16 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', flex: 1 },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
  rowLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  rowStatus: { fontSize: 13, marginTop: 2 },
  rowHint: { color: COLORS.textSecondary, fontSize: 12, marginTop: 6, lineHeight: 18 },
  uidLine: { color: COLORS.textTertiary, fontSize: 11, marginTop: 8, fontFamily: 'monospace' },
  error: { color: COLORS.error, fontSize: 13, marginTop: 12 },
  hint: {
    marginTop: 24,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hintTitle: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  hintText: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
  code: {
    fontFamily: 'monospace',
    color: COLORS.primary,
    fontSize: 12,
    marginVertical: 4,
  },
});
