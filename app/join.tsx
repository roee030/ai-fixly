import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/constants';
import { PROFESSIONS } from '../src/constants/problemMatrix';
import { SERVICE_ZONE } from '../src/constants/serviceZone';
import { sanitizeText, sanitizePhone } from '../src/utils/sanitize';

const FIRESTORE_PROJECT_ID = 'fixly-c4040';

export default function ProviderJoinScreen() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profession, setProfession] = useState('');
  const [experience, setExperience] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showProfessions, setShowProfessions] = useState(false);

  const selectedProfession = PROFESSIONS.find(p => p.key === profession);

  const canSubmit = name.trim().length >= 2 && phone.trim().length >= 9 && profession.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/provider_signups`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            name: { stringValue: sanitizeText(name.trim(), 200) },
            phone: { stringValue: sanitizePhone(phone.trim()) },
            profession: { stringValue: profession },
            professionLabel: { stringValue: selectedProfession?.labelHe || profession },
            area: { stringValue: SERVICE_ZONE.nameHe },
            experience: { stringValue: sanitizeText(experience.trim(), 100) },
            status: { stringValue: 'pending' },
            createdAt: { timestampValue: new Date().toISOString() },
          },
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        notifyWorker();
      } else {
        Alert.alert(t('common.error'), t('join.submitError'));
      }
    } catch {
      Alert.alert(t('common.error'), t('join.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const notifyWorker = () => {
    const workerUrl = process.env.EXPO_PUBLIC_BROKER_URL;
    if (!workerUrl) return;
    fetch(`${workerUrl}/feedback/critical`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `Provider signed up: ${name.trim()} (${selectedProfession?.labelHe || profession}) — ${phone.trim()}`,
        screen: 'provider_signup',
        error: '',
      }),
    }).catch(() => {});
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>{t('join.thankYou')}</Text>
          <Text style={styles.successSubtitle}>{t('join.thankYouSubtitle')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 8 }}>
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="Home"
          >
            <Ionicons name="home-outline" size={22} color={COLORS.text} />
          </Pressable>
        </View>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="construct" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>{t('join.title')}</Text>
          <Text style={styles.heroSubtitle}>
            {t('join.subtitle')}{'\n'}{t('join.subtitleLine2')}
          </Text>
        </View>

        <View style={styles.benefits}>
          {[
            { icon: 'phone-portrait-outline' as const, key: 'benefit1' },
            { icon: 'cash-outline' as const, key: 'benefit2' },
            { icon: 'people-outline' as const, key: 'benefit3' },
          ].map((b, i) => (
            <View key={i} style={styles.benefitRow}>
              <Ionicons name={b.icon} size={18} color={COLORS.success} />
              <Text style={styles.benefitText}>{t(`join.${b.key}`)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t('join.nameLabel')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('join.namePlaceholder')}
            placeholderTextColor={COLORS.textTertiary}
            style={styles.input}
          />

          <Text style={styles.label}>{t('join.phoneLabel')}</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder={t('join.phonePlaceholder')}
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="phone-pad"
            style={styles.input}
          />

          <Text style={styles.label}>{t('join.professionLabel')}</Text>
          <Pressable
            style={styles.dropdown}
            onPress={() => setShowProfessions(!showProfessions)}
          >
            <Text style={selectedProfession ? styles.dropdownText : styles.dropdownPlaceholder}>
              {selectedProfession?.labelHe || t('join.professionPlaceholder')}
            </Text>
            <Ionicons name={showProfessions ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textTertiary} />
          </Pressable>

          {showProfessions && (
            <View style={styles.dropdownList}>
              <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled>
                {PROFESSIONS.map((p) => (
                  <Pressable
                    key={p.key}
                    style={[styles.dropdownItem, profession === p.key && styles.dropdownItemSelected]}
                    onPress={() => { setProfession(p.key); setShowProfessions(false); }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      profession === p.key && styles.dropdownItemTextSelected,
                    ]}>
                      {p.labelHe}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          <Text style={styles.label}>{t('join.experienceLabel')}</Text>
          <TextInput
            value={experience}
            onChangeText={setExperience}
            placeholder={t('join.experiencePlaceholder')}
            placeholderTextColor={COLORS.textTertiary}
            style={styles.input}
          />
        </View>

        <Pressable
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? (
            <Text style={styles.submitText}>{t('join.submitting')}</Text>
          ) : (
            <>
              <Text style={styles.submitText}>{t('join.submit')}</Text>
              <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            </>
          )}
        </Pressable>

        <Text style={styles.footer}>{t('join.footer')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: 24, paddingBottom: 60, maxWidth: 500, alignSelf: 'center', width: '100%' },
  hero: { alignItems: 'center', paddingTop: 20, paddingBottom: 24 },
  heroIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  heroTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  heroSubtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 },
  benefits: { gap: 10, marginBottom: 28 },
  benefitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.success + '10', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  benefitText: { color: COLORS.text, fontSize: 14, flex: 1 },
  form: { gap: 4, marginBottom: 24 },
  label: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surface, color: COLORS.text, borderRadius: 12,
    padding: 14, fontSize: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  dropdown: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dropdownText: { color: COLORS.text, fontSize: 16 },
  dropdownPlaceholder: { color: COLORS.textTertiary, fontSize: 16 },
  dropdownList: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, marginTop: 4, overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border + '40' },
  dropdownItemSelected: { backgroundColor: COLORS.primary + '15' },
  dropdownItemText: { color: COLORS.text, fontSize: 15 },
  dropdownItemTextSelected: { color: COLORS.primary, fontWeight: '600' },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold' },
  footer: { textAlign: 'center', color: COLORS.textTertiary, fontSize: 12, marginTop: 24 },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  successIcon: { marginBottom: 20 },
  successTitle: { fontSize: 26, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },
  successSubtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 },
});
