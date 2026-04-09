import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '../../src/components/layout';
import { Button, Input, FadeInView } from '../../src/components/ui';
import { authService } from '../../src/services/auth';
import { normalizePhoneNumber, isValidPhoneNumber } from '../../src/utils/phone';
import { COLORS } from '../../src/constants';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async () => {
    setError('');

    if (!isValidPhoneNumber(phone)) {
      setError('מספר טלפון לא תקין');
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
      setError('שליחת קוד האימות נכשלה. נסה שוב.');
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
          <Text style={styles.title}>ברוכים הבאים</Text>
          <Text style={styles.subtitle}>
            הכנס את מספר הטלפון שלך{'\n'}ונשלח לך קוד אימות
          </Text>

          <Input
            label="מספר טלפון"
            placeholder="050-123-4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            error={error}
          />

          <Text style={styles.hint}>
            לא צריך להזין קידומת מדינה
          </Text>

          <View style={{ marginTop: 24 }}>
            <Button
              title="שלח קוד"
              onPress={handleSendOtp}
              isLoading={isLoading}
              disabled={!canSubmit}
            />
          </View>
        </FadeInView>
      </KeyboardAvoidingView>
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
  hint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: 4,
  },
});
