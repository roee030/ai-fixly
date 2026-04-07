import { useState } from 'react';
import { Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '../../src/components/layout';
import { Button, Input } from '../../src/components/ui';
import { otpSchema } from '../../src/validators';
import { authService } from '../../src/services/auth';
import { COLORS, LIMITS } from '../../src/constants';

export default function VerifyScreen() {
  const { verificationId, phone } = useLocalSearchParams<{
    verificationId: string;
    phone: string;
  }>();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    setError('');

    const result = otpSchema.safeParse(code);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      await authService.confirmOtp(verificationId, code);
      // Auth state change handled by useAuth hook -> redirects automatically
    } catch (err) {
      setError('קוד שגוי. נסה שוב.');
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
          קוד אימות
        </Text>
        <Text style={{ fontSize: 16, marginBottom: 32, color: COLORS.textSecondary }}>
          הקוד נשלח ל-{phone}
        </Text>

        <Input
          label="קוד אימות"
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
          title="אמת"
          onPress={handleVerify}
          isLoading={isLoading}
          disabled={code.length !== LIMITS.OTP_LENGTH}
        />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
