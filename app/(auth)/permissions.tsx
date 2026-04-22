import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, AppState } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { notificationService } from '../../src/services/notifications';
import { useAppStore } from '../../src/stores/useAppStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { COLORS } from '../../src/constants';
import { resolveCity } from '../../src/utils/resolveCity';
import {
  getFirestore, doc, setDoc,
} from '../../src/services/firestore/imports';
import { logger } from '../../src/services/logger';

/**
 * Hard permission gate. The user cannot leave this screen until they've
 * granted both location and notification permissions. If they deny and
 * navigate back (or to system settings), AppState listener re-checks
 * when they return so the UI updates without a manual refresh.
 */
export default function PermissionsScreen() {
  const { t } = useTranslation();
  const setHasCompletedPermissions = useAppStore((s) => s.setHasCompletedPermissions);
  const [locationGranted, setLocationGranted] = useState(false);
  const [notificationGranted, setNotificationGranted] = useState(false);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [isCheckingNotif, setIsCheckingNotif] = useState(false);

  const refreshPermissions = useCallback(async () => {
    try {
      const loc = await Location.getForegroundPermissionsAsync();
      setLocationGranted(loc.status === 'granted');
    } catch {
      // ignore
    }
    // Firebase messaging doesn't expose a "check current status" that's
    // free of side effects. Instead we assume not granted until the user
    // explicitly taps the button (which requests and updates the flag).
  }, []);

  // Re-check location on screen mount and whenever the app returns from
  // being backgrounded (e.g. after the user opened Settings to grant).
  useEffect(() => {
    refreshPermissions();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshPermissions();
    });
    return () => sub.remove();
  }, [refreshPermissions]);

  const user = useAuthStore((s) => s.user);

  const handleRequestLocation = async () => {
    setIsCheckingLocation(true);
    try {
      const result = await Location.requestForegroundPermissionsAsync();
      const granted = result.status === 'granted';
      setLocationGranted(granted);
      if (granted) {
        // Fetch a real coordinate right now + persist to Firestore so the
        // capture flow never has to re-request GPS or fall back silently.
        await persistUserLocation();
      }
    } finally {
      setIsCheckingLocation(false);
    }
  };

  const persistUserLocation = useCallback(async () => {
    if (!user) return;
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lng } = pos.coords;
      let address = '';
      try {
        const reverse = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        const first = reverse[0];
        if (first) {
          address = [first.city, first.region, first.country].filter(Boolean).join(', ');
        }
      } catch {
        // reverse geocode is best-effort; empty address is acceptable.
      }

      const db = getFirestore();
      await setDoc(
        doc(db, 'users', user.uid),
        {
          location: { lat, lng, address },
          locationSummary: resolveCity(lat, lng),
        },
        { merge: true },
      );
    } catch (err) {
      logger.warn('[permissions] persistUserLocation failed', { err: String(err) });
    }
  }, [user]);

  const handleRequestNotifications = async () => {
    setIsCheckingNotif(true);
    try {
      const granted = await notificationService.requestPermission();
      setNotificationGranted(granted);
    } finally {
      setIsCheckingNotif(false);
    }
  };

  const canContinue = locationGranted && notificationGranted;

  const handleContinue = async () => {
    if (!canContinue) return;
    await setHasCompletedPermissions(true);
    router.replace('/(tabs)');
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={40} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>{t('auth.permissionsTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.permissionsSubtitle')}
        </Text>
      </View>

      <View style={styles.cards}>
        <PermissionCard
          icon="location"
          title={t('auth.locationPermission')}
          description={t('auth.locationPermissionDesc')}
          granted={locationGranted}
          isLoading={isCheckingLocation}
          onRequest={handleRequestLocation}
        />

        <PermissionCard
          icon="notifications"
          title={t('auth.notificationPermission')}
          description={t('auth.notificationPermissionDesc')}
          granted={notificationGranted}
          isLoading={isCheckingNotif}
          onRequest={handleRequestNotifications}
        />
      </View>

      <View style={styles.bottomBar}>
        <Button
          title={t('auth.continue')}
          onPress={handleContinue}
          disabled={!canContinue}
        />
        {!canContinue && (
          <Text style={styles.footnote}>
            {t('auth.permissionsRequired')}
          </Text>
        )}
      </View>
    </ScreenContainer>
  );
}

interface PermissionCardProps {
  icon: 'location' | 'notifications';
  title: string;
  description: string;
  granted: boolean;
  isLoading: boolean;
  onRequest: () => void;
}

function PermissionCard({
  icon,
  title,
  description,
  granted,
  isLoading,
  onRequest,
}: PermissionCardProps) {
  const { t } = useTranslation();
  return (
    <View style={[styles.card, granted && styles.cardGranted]}>
      <View style={[styles.cardIcon, granted && styles.cardIconGranted]}>
        <Ionicons
          name={granted ? 'checkmark-circle' : icon}
          size={26}
          color={granted ? COLORS.success : COLORS.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      {!granted && (
        <Pressable
          style={styles.grantButton}
          onPress={onRequest}
          disabled={isLoading}
        >
          <Text style={styles.grantButtonText}>
            {isLoading ? '...' : t('auth.approve')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 22,
  },
  cards: {
    flex: 1,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  cardGranted: {
    backgroundColor: COLORS.success + '10',
    borderColor: COLORS.success + '40',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconGranted: {
    backgroundColor: 'transparent',
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardDescription: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  grantButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  grantButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  bottomBar: {
    paddingVertical: 16,
    gap: 12,
  },
  footnote: {
    textAlign: 'center',
    color: COLORS.textTertiary,
    fontSize: 12,
  },
});
