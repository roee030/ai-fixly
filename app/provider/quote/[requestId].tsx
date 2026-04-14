import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  ActivityIndicator, Image, Switch,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../../../src/components/layout';
import { Button } from '../../../src/components/ui';
import { AvailabilityPicker } from '../../../src/components/provider/AvailabilityPicker';
import {
  fetchPublicRequestSummary,
  submitProviderQuote,
} from '../../../src/services/providerForm';
import type { PublicRequestSummary } from '../../../src/services/providerForm';
import { COLORS } from '../../../src/constants';
import { sanitizeText, sanitizeNumeric } from '../../../src/utils/sanitize';

/**
 * Public quote-submission form for a single service request.
 * Reached by service providers via a personalized link in the WhatsApp
 * notification we send. The link carries the request ID in the path and
 * the provider's phone (and optional name) in query params:
 *   /provider/quote/<requestId>?phone=+972...&n=Provider%20Name
 */
export default function ProviderQuoteScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    requestId: string;
    phone?: string;
    n?: string;
  }>();
  const requestId = params.requestId;
  const providerPhone = (params.phone || '').trim();
  const providerName = (params.n || '').trim();

  const [summary, setSummary] = useState<PublicRequestSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [isVisitFee, setIsVisitFee] = useState(false);
  const [availability, setAvailability] = useState<{ iso: string; label: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) return;
    fetchPublicRequestSummary(requestId)
      .then(setSummary)
      .catch((err) => setLoadError(err?.message || 'load_failed'));
  }, [requestId]);

  const canSubmit =
    !isSubmitting &&
    !submitted &&
    price.trim().length > 0 &&
    availability !== null &&
    providerPhone.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !summary) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await submitProviderQuote({
        requestId: summary.requestId,
        providerPhone,
        providerName: providerName || undefined,
        price: sanitizeNumeric(price.trim()),
        isVisitFee,
        availabilityStartAt: availability!.iso,
        availabilityText: availability!.label,
        notes: notes.trim() ? sanitizeText(notes.trim(), 500) : undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err?.message || 'submit_failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{t('providerForm.requestNotFound')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!summary) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (submitted) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
          <Text style={styles.thankTitle}>{t('providerForm.submittedTitle')}</Text>
          <Text style={styles.thankSubtitle}>{t('providerForm.submittedSubtitle')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.brandTitle}>ai-fixly</Text>
        <Text style={styles.title}>{t('providerForm.title')}</Text>

        {/* Problem context — read-only summary the provider needs */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('providerForm.location')}</Text>
          <Text style={styles.cardValue}>{summary.city}</Text>

          <Text style={[styles.cardLabel, { marginTop: 12 }]}>{t('providerForm.problem')}</Text>
          <Text style={styles.cardValue}>{summary.textDescription || '—'}</Text>

          {summary.mediaUrls && summary.mediaUrls.length > 0 && (
            <View style={styles.thumbRow}>
              {summary.mediaUrls.slice(0, 5).map((url, i) => (
                <Image key={i} source={{ uri: url }} style={styles.thumb} />
              ))}
            </View>
          )}
        </View>

        {/* Price */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('providerForm.priceLabel')}</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder={t('providerForm.pricePlaceholder')}
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="numeric"
            style={styles.input}
          />

          <View style={styles.switchRow}>
            <Switch
              value={isVisitFee}
              onValueChange={setIsVisitFee}
              trackColor={{ true: COLORS.primary, false: COLORS.border }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>{t('providerForm.isVisitFee')}</Text>
              <Text style={styles.switchHint}>{t('providerForm.isVisitFeeHint')}</Text>
            </View>
          </View>
        </View>

        {/* Availability */}
        <View style={styles.section}>
          <AvailabilityPicker onChange={setAvailability} />
          {availability && (
            <Text style={styles.availabilityPreview}>
              {t('providerForm.youSelected')}: {availability.label}
            </Text>
          )}
        </View>

        {/* Optional notes */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('providerForm.notesLabel')}</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t('providerForm.notesPlaceholder')}
            placeholderTextColor={COLORS.textTertiary}
            multiline
            style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
          />
        </View>

        {submitError && (
          <Text style={styles.errorText}>{t('providerForm.submitError')}</Text>
        )}

        <Button
          title={t('providerForm.submit')}
          onPress={handleSubmit}
          disabled={!canSubmit}
          isLoading={isSubmitting}
        />

        <Text style={styles.footer}>{t('providerForm.footer')}</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  brandTitle: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  title: { color: COLORS.text, fontSize: 22, fontWeight: 'bold' as any, marginBottom: 4 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardLabel: { color: COLORS.textTertiary, fontSize: 12, fontWeight: '600' as any },
  cardValue: { color: COLORS.text, fontSize: 15, marginTop: 4 },
  thumbRow: { flexDirection: 'row' as any, flexWrap: 'wrap' as any, gap: 8, marginTop: 12 },
  thumb: { width: 72, height: 72, borderRadius: 8 },

  section: { gap: 8 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: '600' as any },
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  switchRow: { flexDirection: 'row' as any, alignItems: 'center', gap: 12, marginTop: 4 },
  switchLabel: { color: COLORS.text, fontSize: 13, fontWeight: '600' as any },
  switchHint: { color: COLORS.textTertiary, fontSize: 12, marginTop: 2 },
  availabilityPreview: { color: COLORS.success, fontSize: 13, fontWeight: '600' as any, marginTop: 8 },

  errorText: { color: COLORS.error, fontSize: 13, textAlign: 'center' as any },
  thankTitle: { color: COLORS.text, fontSize: 22, fontWeight: 'bold' as any, marginTop: 12 },
  thankSubtitle: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' as any, marginTop: 4 },
  footer: { color: COLORS.textTertiary, fontSize: 11, textAlign: 'center' as any, marginTop: 8 },
});
