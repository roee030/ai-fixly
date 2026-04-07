import { View, Text, Pressable } from 'react-native';
import { COLORS } from '../../constants';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        backgroundColor: COLORS.background,
      }}
    >
      <Text style={{ fontSize: 48, marginBottom: 16 }}>!</Text>
      <Text
        style={{
          fontSize: 20,
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: 8,
          color: COLORS.text,
        }}
      >
        משהו השתבש
      </Text>
      <Text
        style={{
          fontSize: 14,
          textAlign: 'center',
          marginBottom: 32,
          color: COLORS.textSecondary,
        }}
      >
        אנחנו מתנצלים על התקלה. נסה שוב.
      </Text>
      <Pressable
        onPress={resetError}
        style={{
          paddingHorizontal: 32,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: COLORS.primary,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>
          נסה שוב
        </Text>
      </Pressable>
    </View>
  );
}
