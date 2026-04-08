import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../src/constants';
import { useAppStore } from '../src/stores/useAppStore';

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: 'camera-outline' as const,
    title: 'צלם את הבעיה',
    subtitle: 'צלם תמונה והAI שלנו יזהה\nאת סוג התקלה אוטומטית',
    color: COLORS.primary,
  },
  {
    icon: 'people-outline' as const,
    title: 'קבל הצעות מחיר',
    subtitle: 'בעלי מקצוע באזור שלך ישלחו\nהצעות מחיר תוך דקות',
    color: COLORS.success,
  },
  {
    icon: 'checkmark-circle-outline' as const,
    title: 'בחר ותתחיל',
    subtitle: 'השוווה מחירים, בחר את הטוב ביותר\nוהתחל לתקשר ישירות',
    color: COLORS.warning,
  },
];

export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const setHasSeenOnboarding = useAppStore((s) => s.setHasSeenOnboarding);
  const translateX = useSharedValue(0);

  const goNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
      translateX.value = withTiming(-(currentSlide + 1) * width, { duration: 300 });
    } else {
      finish();
    }
  };

  const finish = async () => {
    await setHasSeenOnboarding(true);
    router.replace('/(auth)/phone');
  };

  const slide = slides[currentSlide];
  const isLast = currentSlide === slides.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <Pressable onPress={finish} style={styles.skipBtn}>
        <Text style={styles.skipText}>דלג</Text>
      </Pressable>

      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: slide.color + '20' }]}>
          <Ionicons name={slide.icon} size={64} color={slide.color} />
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === currentSlide ? COLORS.primary : COLORS.textTertiary },
              i === currentSlide && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Button */}
      <Pressable onPress={goNext} style={styles.nextBtn}>
        <Text style={styles.nextText}>{isLast ? 'בוא נתחיל' : 'הבא'}</Text>
        <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={20} color="#FFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  skipBtn: { position: 'absolute', top: 60, left: 24, zIndex: 10 },
  skipText: { color: COLORS.textSecondary, fontSize: 16 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  iconWrap: {
    width: 140, height: 140, borderRadius: 70,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24 },
  nextBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16,
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    marginBottom: 40,
  },
  nextText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});
