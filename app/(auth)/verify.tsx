import { useState, useCallback } from 'react';
import { Text, View, Pressable, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { OtpBoxInput } from '../../src/components/ui/OtpBoxInput';
import { FeedbackModal } from '../../src/components/ui/FeedbackModal';
import { otpSchema } from '../../src/validators';
import { authService } from '../../src/services/auth';
import { captureException } from '../../src/services/errorReporting';
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

  const handleVerify = useCallback(
    async (finalCode: string) => {
      setError('');
      const result = otpSchema.safeParse(finalCode);
      if (!result.success) {
        setError(result.error.issues[0].message);
        return;
      }
      Keyboard.dismiss();
      setIsLoading(true);
      try {
        await authService.confirmOtp(verificationId, finalCode);
        // Auth state change handled by useAuth hook → AuthGate redirects.
      } catch (err) {
        // "Wrong code" is the expected case — only report if it's not a
        // user-facing error so we can spot transport failures (Firebase down,
        // network, malformed verificationId).
        const code = (err as any)?.code;
        if (code !== 'auth/invalid-verification-code' && code !== 'auth/code-expired') {
          captureException(err, {
            tags: { screen: 'verify_otp', action: 'confirm_otp' },
            extra: { errorCode: code },
          });
        }
        setError(t('auth.wrongCode'));
      } finally {
        setIsLoading(false);
      }
    },
    [verificationId, t],
  );

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 8 }}
      >
        <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 8, color: COLORS.text }}>
          {t('auth.verifyTitle')}
        </Text>
        <Text style={{ fontSize: 16, marginBottom: 32, color: COLORS.textSecondary }}>
          {t('auth.verifySubtitle', { phone })}
        </Text>

        <OtpBoxInput
          length={LIMITS.OTP_LENGTH}
          value={code}
          onChange={(next) => {
            setCode(next);
            if (error) setError('');
          }}
          onComplete={(final) => { void handleVerify(final); }}
          error={!!error}
        />

        {error !== '' && (
          <Text style={{ color: COLORS.error, fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
            {error}
          </Text>
        )}

        <Button
          title={t('auth.verify')}
          onPress={() => void handleVerify(code)}
          isLoading={isLoading}
          disabled={code.length !== LIMITS.OTP_LENGTH}
        />

        {error !== '' && (
          <Pressable
            onPress={() => setShowFeedback(true)}
            style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}
          >
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
