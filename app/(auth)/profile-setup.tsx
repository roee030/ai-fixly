import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { Button, Input, FadeInView } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { getFirestore, doc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';
import * as Location from 'expo-location';
import { COLORS } from '../../src/constants';
import { logger } from '../../src/services/logger';

interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

export default function ProfileSetupScreen() {
  const user = useAuthStore((s) => s.user);
  const setHasCompletedProfile = useAuthStore((s) => s.setHasCompletedProfile);

  const [name, setName] = useState('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGetLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'הרשאה נדרשת',
          'כדי למצוא בעלי מקצוע קרובים, אנחנו צריכים גישה למיקום שלך',
          [{ text: 'בסדר' }]
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [addr] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const addressStr = addr
        ? [addr.city, addr.street].filter(Boolean).join(', ') || 'המיקום שלי'
        : 'המיקום שלי';

      setLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        address: addressStr,
      });
    } catch (err) {
      logger.error('Location fetch failed', err as Error);
      Alert.alert('שגיאה', 'לא הצלחנו לקבל את המיקום. נסה שוב.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setError('');

    if (name.trim().length < 2) {
      setError('השם צריך להכיל לפחות 2 תווים');
      return;
    }

    if (!location) {
      setError('אנא אפשר גישה למיקום');
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
      setError('שגיאה בשמירת הפרופיל. נסה שוב.');
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
            <Text style={styles.title}>בוא נכיר</Text>
            <Text style={styles.subtitle}>
              עוד כמה פרטים ואתה מוכן
            </Text>

            {/* Name field */}
            <View style={styles.fieldGroup}>
              <Input
                label="איך נקרא לך?"
                placeholder="השם שלך"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
              />
            </View>

            {/* Location field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>המיקום שלך</Text>
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
                      {isLoadingLocation ? 'מזהה מיקום...' : 'שתף את המיקום שלי'}
                    </Text>
                    <Text style={styles.locationHint}>
                      כדי שנוכל למצוא בעלי מקצוע קרובים
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>

            {error && <Text style={styles.error}>{error}</Text>}
          </FadeInView>
        </ScrollView>

        <View style={styles.bottomBar}>
          <Button
            title="בוא נתחיל"
            onPress={handleSave}
            isLoading={isLoading}
            disabled={!canSubmit}
          />
        </View>
      </KeyboardAvoidingView>
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
