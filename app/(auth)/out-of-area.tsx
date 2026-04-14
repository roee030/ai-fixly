import { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { COLORS } from '../../src/constants';
import { SERVICE_ZONE } from '../../src/constants/serviceZone';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from '../../src/services/firestore/imports';
import { logAction } from '../../src/services/analytics/sessionLogger';
import { sanitizeEmail } from '../../src/utils/sanitize';

export default function OutOfAreaScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    logAction('geo_blocked', 'out_of_area');
  }, []);

  const handleSubmit = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('', t('outOfArea.invalidEmail'));
      return;
    }
    setIsSubmitting(true);
    try {
      const db = getFirestore();
      const docRef = doc(collection(db, 'waitlist'));
      await setDoc(docRef, {
        email: sanitizeEmail(email),
        createdAt: serverTimestamp(),
        notified: false,
      });
      setSubmitted(true);
      logAction('waitlist_signup', 'out_of_area');
    } catch (err) {
      console.error('Waitlist signup failed:', err);
      Alert.alert(t('common.error'), t('common.retry'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration area */}
        <View style={styles.illustrationContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="location-outline" size={48} color={COLORS.primary} />
          </View>
          <View style={styles.mapLines}>
            <View style={[styles.mapLine, { width: '60%' }]} />
            <View style={[styles.mapLine, { width: '80%' }]} />
            <View style={[styles.mapLine, { width: '40%' }]} />
          </View>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>
          {t('outOfArea.title')}
        </Text>

        {/* Explanation */}
        <Text style={styles.explanation}>
          {t('outOfArea.explanation', { areas: SERVICE_ZONE.nameHe })}
        </Text>

        {/* Waitlist signup */}
        {!submitted ? (
          <View style={styles.waitlistCard}>
            <Text style={styles.waitlistTitle}>
              {t('outOfArea.wantUpdate')}
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('outOfArea.emailPlaceholder')}
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.emailInput}
            />
            <Button
              title={t('outOfArea.notifyMe')}
              onPress={handleSubmit}
              isLoading={isSubmitting}
              disabled={!email.includes('@')}
            />
          </View>
        ) : (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={40} color={COLORS.success} />
            <Text style={styles.successText}>
              {t('outOfArea.thankYou')}
            </Text>
          </View>
        )}

        {/* Active areas */}
        <View style={styles.areasSection}>
          <View style={styles.areasDivider} />
          <Text style={styles.areasTitle}>
            {t('outOfArea.activeAreas')}
          </Text>
          <View style={styles.areasGrid}>
            {SERVICE_ZONE.activeAreas.map((area) => (
              <View key={area} style={styles.areaChip}>
                <Text style={styles.areaText}>{area}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  mapLines: {
    alignItems: 'center',
    gap: 6,
    opacity: 0.3,
  },
  mapLine: {
    height: 4,
    backgroundColor: COLORS.textTertiary,
    borderRadius: 2,
  },
  headline: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  explanation: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  waitlistCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 32,
  },
  waitlistTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  emailInput: {
    backgroundColor: COLORS.background,
    color: COLORS.text,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'left',
  },
  successCard: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
    marginBottom: 32,
  },
  successText: {
    fontSize: 16,
    color: COLORS.success,
    fontWeight: '600',
    textAlign: 'center',
  },
  areasSection: {
    alignItems: 'center',
  },
  areasDivider: {
    width: '80%',
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 20,
  },
  areasTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 12,
  },
  areasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  areaChip: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  areaText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
