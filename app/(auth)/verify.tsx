import { useState } from 'react';
import { Text, View, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { Button, Input } from '../../src/components/ui';
import { FeedbackModal } from '../../src/components/ui/FeedbackModal';
import { otpSchema } from '../../src/validators';
import { authService } from '../../src/services/auth';
import { COLORS, LIMITS } from '../../src/constants';

export default function VerifyScreen() {
  const { t } = useTranslation();
  const { verificationId, phone } = useLocalSearchParams<{
    verificationId: string;
    phone: string;
  }>();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleVerify = async () => {
    setError('');

    const result = otpSchema.safeParse(code);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    try {
      await authService.confirmOtp(verificationId, code);
      // Auth state change handled by useAuth hook -> redirects automatically
    } catch (err) {
      setError(t('auth.wrongCode'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 8, color: COLORS.text }}>
          {t('auth.verifyTitle')}
        </Text>
        <Text style={{ fontSize: 16, marginBottom: 32, color: COLORS.textSecondary }}>
          {t('auth.verifySubtitle', { phone })}
        </Text>

        <Input
          label={t('auth.verifyTitle')}
          placeholder="000000"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={LIMITS.OTP_LENGTH}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          error={error}
        />

        <Button
          title={t('auth.verify')}
          onPress={handleVerify}
          isLoading={isLoading}
          disabled={code.length !== LIMITS.OTP_LENGTH}
        />

        {error !== '' && (
          <Pressable onPress={() => setShowFeedback(true)} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={COLORS.textTertiary} />
            <Text style={{ color: COLORS.textTertiary, fontSize: 12 }}>{t('common.reportProblem')}</Text>
          </Pressable>
        )}
      </KeyboardAvoidingView>
      <FeedbackModal
        visible={showFeedback}
        onClose={() => setShowFeedback(false)}
        screen="verify"
        errorMessage="OTP verification failed"
      />
    </ScreenContainer>
  );
}
