import { View, Text } from 'react-native';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { authService } from '../../src/services/auth';
import { COLORS } from '../../src/constants';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);

  const handleSignOut = async () => {
    await authService.signOut();
  };

  return (
    <ScreenContainer>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginTop: 16, marginBottom: 24, color: COLORS.text }}>
        פרופיל
      </Text>
      <View style={{ flex: 1 }}>
        <View
          style={{
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
            backgroundColor: COLORS.surface,
          }}
        >
          <Text style={{ fontSize: 14, marginBottom: 4, color: COLORS.textSecondary }}>
            טלפון
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.text }}>
            {user?.phoneNumber || '-'}
          </Text>
        </View>
      </View>
      <Button title="התנתק" onPress={handleSignOut} variant="secondary" />
    </ScreenContainer>
  );
}
