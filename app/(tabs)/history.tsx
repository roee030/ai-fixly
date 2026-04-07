import { View, Text } from 'react-native';
import { ScreenContainer } from '../../src/components/layout';
import { COLORS } from '../../src/constants';

export default function HistoryScreen() {
  return (
    <ScreenContainer>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginTop: 16, marginBottom: 24, color: COLORS.text }}>
        היסטוריה
      </Text>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 16, color: COLORS.textSecondary }}>
          אין קריאות קודמות
        </Text>
      </View>
    </ScreenContainer>
  );
}
