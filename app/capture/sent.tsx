import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { ScreenContainer } from '../../src/components/layout';
import { Button } from '../../src/components/ui';
import { COLORS } from '../../src/constants';

// No auto-redirect — user should see confirmation clearly and tap themselves.
// (Earlier we had auto-redirect but it felt jarring.)

export default function SentScreen() {
  const { t } = useTranslation();
  const scale = useSharedValue(0);
  const checkmarkScale = useSharedValue(0);

  useEffect(() => {
    // Animate icon bounce
    scale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 120 }),
      withSpring(1, { damping: 10 })
    );
    checkmarkScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 150 }));
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
  }));

  return (
    <ScreenContainer>
      <View style={{ paddingTop: 16, paddingHorizontal: 16 }}>
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' }}
          accessibilityLabel="Home"
        >
          <Ionicons name="home-outline" size={22} color={COLORS.text} />
        </Pressable>
      </View>
      <View style={styles.container}>
        <Animated.View style={[styles.iconWrap, iconStyle]}>
          <View style={styles.iconBg}>
            <Animated.View style={checkStyle}>
              <Ionicons name="checkmark" size={64} color="#FFFFFF" />
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(400).duration(500)}>
          <Text style={styles.title}>{t('sent.title')}</Text>
          <Text style={styles.subtitle}>
            {t('sent.subtitle')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(800).duration(400)} style={styles.buttons}>
          <Button
            title={t('sent.backToRequests')}
            onPress={() => router.replace('/(tabs)/requests')}
          />
        </Animated.View>
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
    marginBottom: 32,
  },
  iconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    fontSize: 28,
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
  },
});
