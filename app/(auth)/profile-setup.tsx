import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { Button, Input, FadeInView } from '../../src/components/ui';
import { FeedbackModal } from '../../src/components/ui/FeedbackModal';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { getFirestore, doc, setDoc, serverTimestamp } from '../../src/services/firestore/imports';
// Only import expo-location on native — web uses the browser Geolocation API
const Location = Platform.OS !== 'web' ? require('expo-location') : null;
import { COLORS } from '../../src/constants';
import { logger } from '../../src/services/logger';
import { isInServiceZone } from '../../src/utils/geoFence';

interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

export default function ProfileSetupScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setHasCompletedProfile = useAuthStore((s) => s.setHasCompletedProfile);

  const [name, setName] = useState('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleGetLocation = async () => {
    setIsLoadingLocation(true);

    // Web: use the browser's built-in Geolocation API
    if (Platform.OS === 'web') {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
          })
        );
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocation({
          lat,
          lng,
          address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        });
        if (!isInServiceZone(lat, lng)) {
          router.replace('/(auth)/out-of-area' as any);
          return;
        }
      } catch (err) {
        Alert.alert(t('common.error'), t('auth.locationHint'));
      } finally {
        setIsLoadingLocation(false);
      }
      return;
    }

    // Native: use expo-location
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('auth.locationLabel'),
          t('auth.locationHint'),
          [{ text: t('common.ok') }]
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [addr] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const addressStr = addr
        ? [addr.city, addr.street].filter(Boolean).join(', ') || t('auth.myLocation')
        : t('auth.myLocation');

      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setLocation({ lat, lng, address: addressStr });
      if (!isInServiceZone(lat, lng)) {
        router.replace('/(auth)/out-of-area' as any);
        return;
      }
    } catch (err) {
      logger.error('Location fetch failed', err as Error);
      Alert.alert(t('common.error'), t('auth.locationHint'));
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setError('');

    if (name.trim().length < 2) {
      setError(t('auth.nameTooShort'));
      return;
    }

    if (!location) {
      setError(t('auth.locationRequired'));
      return;
    }

    setIsLoading(true);
    try {
      await setDoc(doc(getFirestore(), 'users', user.uid), {
        phone: user.phoneNumber,
        displayName: name.trim(),
        location,
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      });
      setHasCompletedProfile(true);
      router.replace('/(tabs)');
    } catch (err) {
      logger.error('Save profile failed', err as Error);
      setError(t('auth.saveProfileFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = name.trim().length >= 2 && location !== null;

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <FadeInView>
            <Text style={styles.title}>{t('auth.profileTitle')}</Text>
            <Text style={styles.subtitle}>
              {t('auth.profileSubtitle')}
            </Text>

            {/* Name field */}
            <View style={styles.fieldGroup}>
              <Input
                label={t('auth.nameLabel')}
                placeholder={t('auth.namePlaceholder')}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
              />
            </View>

            {/* Location field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('auth.locationLabel')}</Text>
              {location ? (
                <Pressable onPress={handleGetLocation} style={styles.locationCardActive}>
                  <View style={styles.locationIconActive}>
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationAddress}>{location.address}</Text>
                    <Text style={styles.locationHint}>לחץ לעדכון</Text>
                  </View>
                </Pressable>
              ) : (
                <Pressable onPress={handleGetLocation} style={styles.locationCard} disabled={isLoadingLocation}>
                  <View style={styles.locationIcon}>
                    <Ionicons
                      name={isLoadingLocation ? 'sync' : 'location-outline'}
                      size={24}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationTitle}>
                      {isLoadingLocation ? t('auth.detectingLocation') : t('auth.shareLocation')}
                    </Text>
                    <Text style={styles.locationHint}>
                      {t('auth.locationHint')}
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>

            {error !== '' && (
              <>
                <Text style={styles.error}>{error}</Text>
                <Pressable onPress={() => setShowFeedback(true)} style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color={COLORS.textTertiary} />
                  <Text style={{ color: COLORS.textTertiary, fontSize: 12 }}>{t('common.reportProblem')}</Text>
                </Pressable>
              </>
            )}
          </FadeInView>
        </ScrollView>

        <View style={styles.bottomBar}>
          <Button
            title={t('auth.letsGo')}
            onPress={handleSave}
            isLoading={isLoading}
            disabled={!canSubmit}
          />
        </View>
      </KeyboardAvoidingView>
      <FeedbackModal
        visible={showFeedback}
        onClose={() => setShowFeedback(false)}
        screen="profile_setup"
        errorMessage="Profile save failed"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    color: COLORS.textSecondary,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  locationCardActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
    gap: 12,
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationIconActive: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  locationAddress: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  locationHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  error: {
    color: COLORS.error,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  bottomBar: {
    paddingVertical: 16,
  },
});
