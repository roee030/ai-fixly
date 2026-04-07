import { useState } from 'react';
import { Text, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '../../src/components/layout';
import { Button, Input } from '../../src/components/ui';
import { userCreateSchema } from '../../src/validators';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { getFirestore, doc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { COLORS } from '../../src/constants';

export default function ProfileSetupScreen() {
  const user = useAuthStore((s) => s.user);
  const setHasCompletedProfile = useAuthStore((s) => s.setHasCompletedProfile);

  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setError('');

    const result = userCreateSchema.safeParse({
      phone: user.phoneNumber || '',
      displayName: name,
    });

    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      await setDoc(doc(getFirestore(), 'users', user.uid), {
        phone: user.phoneNumber,
        displayName: result.data.displayName,
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      });
      setHasCompletedProfile(true);
      router.replace('/(tabs)');
    } catch (err) {
      setError('שגיאה בשמירת הפרופיל. נסה שוב.');
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
          מה השם שלך?
        </Text>
        <Text style={{ fontSize: 16, marginBottom: 32, color: COLORS.textSecondary }}>
          כך בעלי מקצוע יוכלו לפנות אליך
        </Text>

        <Input
          label="שם"
          placeholder="השם שלך"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          error={error}
        />

        <Button
          title="בוא נתחיל"
          onPress={handleSave}
          isLoading={isLoading}
          disabled={name.trim().length < 2}
        />
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
