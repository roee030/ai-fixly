import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Keyboard } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { Button, Input, FadeInView } from '../../src/components/ui';
import { FeedbackModal } from '../../src/components/ui/FeedbackModal';
import { authService } from '../../src/services/auth';
import { normalizePhoneNumber, isValidPhoneNumber } from '../../src/utils/phone';
import { COLORS } from '../../src/constants';

export default function PhoneScreen() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleSendOtp = async () => {
    setError('');
    Keyboard.dismiss();

    if (!isValidPhoneNumber(phone)) {
      setError(t('auth.invalidPhone'));
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phone);

    setIsLoading(true);
    try {
      const { verificationId } = await authService.signInWithPhone(normalizedPhone);
      router.push({
        pathname: '/(auth)/verify',
        params: { verificationId, phone: normalizedPhone },
      });
    } catch (err: any) {
      console.error('Phone auth error:', err);
      setError(t('auth.sendCodeFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = phone.replace(/[^\d]/g, '').length >= 9;

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <FadeInView>
          <Text style={styles.title}>{t('auth.phoneTitle')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.phoneSubtitle')}
          </Text>

          <Input
            label={t('auth.phonePlaceholder')}
            placeholder="050-123-4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            error={error}
          />

          <View style={{ marginTop: 24 }}>
            <Button
              title={t('auth.sendCode')}
              onPress={handleSendOtp}
              isLoading={isLoading}
              disabled={!canSubmit}
            />
          </View>

          {error !== '' && (
            <Pressable onPress={() => setShowFeedback(true)} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color={COLORS.textTertiary} />
              <Text style={{ color: COLORS.textTertiary, fontSize: 12 }}>{t('common.reportProblem')}</Text>
            </Pressable>
          )}
        </FadeInView>
      </KeyboardAvoidingView>

      <FeedbackModal
        visible={showFeedback}
        onClose={() => setShowFeedback(false)}
        screen="phone_auth"
        errorMessage="OTP send failed"
      />

      {/* reCAPTCHA container for web phone auth (invisible) */}
      {Platform.OS === 'web' && (
        // @ts-ignore — web-only HTML element
        <div
          id="recaptcha-container"
          style={{ position: 'fixed', bottom: 0, left: 0, opacity: 0, pointerEvents: 'none' }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
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
    lineHeight: 22,
  },
});
