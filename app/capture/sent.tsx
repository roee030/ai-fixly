import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { COLORS } from '../../src/constants';

export default function SentScreen() {
  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
        </View>

        <Text style={styles.title}>הבקשה נשלחה!</Text>
        <Text style={styles.subtitle}>
          אנחנו מחפשים בעלי מקצוע באזור שלך.{'\n'}
          נעדכן אותך ברגע שיגיעו הצעות.
        </Text>

        <View style={styles.buttons}>
          <Button
            title="צפה בבקשה"
            onPress={() => router.replace('/(tabs)/requests')}
          />
          <Button
            title="חזור לבית"
            onPress={() => router.replace('/(tabs)')}
            variant="ghost"
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
});
