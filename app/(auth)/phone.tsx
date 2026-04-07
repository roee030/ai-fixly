import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '../../src/components/layout';
import { Button, Input } from '../../src/components/ui';
import { phoneNumberSchema } from '../../src/validators';
import { authService } from '../../src/services/auth';
import { COLORS } from '../../src/constants';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async () => {
    setError('');

    const result = phoneNumberSchema.safeParse(phone);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const { verificationId } = await authService.signInWithPhone(phone);
      router.push({
        pathname: '/(auth)/verify',
        params: { verificationId, phone },
      });
    } catch (err) {
      setError('שליחת קוד האימות נכשלה. נסה שוב.');
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
          ברוכים הבאים
        </Text>
        <Text style={{ fontSize: 16, marginBottom: 32, color: COLORS.textSecondary }}>
          הכנס מספר טלפון לקבלת קוד אימות
        </Text>

        <Input
          label="מספר טלפון"
          placeholder="+972501234567"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          error={error}
        />

        <Button
          title="שלח קוד"
          onPress={handleSendOtp}
          isLoading={isLoading}
          disabled={phone.length < 10}
        />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
