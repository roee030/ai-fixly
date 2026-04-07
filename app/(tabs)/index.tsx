import { View, Text } from 'react-native';
import { ScreenContainer } from '../../src/components/layout';
import { COLORS } from '../../src/constants';

export default function HubScreen() {
  return (
    <ScreenContainer>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            backgroundColor: COLORS.primary,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 32 }}>+</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: COLORS.text }}>
          יש תקלה?
        </Text>
        <Text style={{ fontSize: 14, textAlign: 'center', color: COLORS.textSecondary }}>
          לחץ לחיצה ארוכה על הכפתור כדי לצלם או להקליט את הבעיה
        </Text>
      </View>
    </ScreenContainer>
  );
}
