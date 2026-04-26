import { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../../../src/components/layout';
import { Button } from '../../../src/components/ui';
import {
  submitProviderReport,
  parseRequestToken,
} from '../../../src/services/providerForm';
import { COLORS } from '../../../src/constants';
import { sanitizeText } from '../../../src/utils/sanitize';

/**
 * Public "report a problem" form for service providers. Used when the
 * request was clearly the wrong fit (wrong profession, spam, fake) and
 * the provider does not want to be paired with similar requests.
 */
export default function ProviderReportScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ requestId: string; phone?: string }>();
  // The Twilio CTA template packs both requestId + provider phone into the
  // single-variable URL as "<requestId>.<phone>". parseRequestToken splits
  // them back and also handles the legacy `?phone=` form.
  const { requestId, providerPhone } = parseRequestToken(
    params.requestId,
    (params.phone || '').trim(),
  );

  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !isSubmitting && !submitted && reason.trim().length >= 5 && providerPhone.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !requestId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await submitProviderReport({
        requestId,
        providerPhone,
        reason: sanitizeText(reason.trim(), 1000),
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'submit_failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
          <Text style={styles.thankTitle}>{t('providerReport.thankTitle')}</Text>
          <Text style={styles.thankSubtitle}>{t('providerReport.thankSubtitle')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.brandTitle}>Fixly</Text>
        <Text style={styles.title}>{t('providerReport.title')}</Text>
        <Text style={styles.subtitle}>{t('providerReport.subtitle')}</Text>

        <Text style={styles.label}>{t('providerReport.reasonLabel')}</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder={t('providerReport.reasonPlaceholder')}
          placeholderTextColor={COLORS.textTertiary}
          multiline
          style={styles.input}
        />

        {error && <Text style={styles.errorText}>{t('providerReport.submitError')}</Text>}

        <Button
          title={t('providerReport.submit')}
          onPress={handleSubmit}
          disabled={!canSubmit}
          isLoading={isSubmitting}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  brandTitle: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  title: { color: COLORS.text, fontSize: 22, fontWeight: 'bold' as any },
  subtitle: { color: COLORS.textSecondary, fontSize: 14 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: '600' as any, marginTop: 8 },
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  errorText: { color: COLORS.error, fontSize: 13, textAlign: 'center' as any },
  thankTitle: { color: COLORS.text, fontSize: 22, fontWeight: 'bold' as any, marginTop: 12 },
  thankSubtitle: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' as any, marginTop: 4 },
});
