import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { COLORS } from '../src/constants';
import { useAppStore } from '../src/stores/useAppStore';

interface Example {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  examples: Example[];
  color: string;
}

const slides: Slide[] = [
  {
    icon: 'camera-outline',
    title: 'צלם את הבעיה',
    subtitle: 'פתח את המצלמה, צלם את התקלה\nוכתוב כמה מילים על מה קרה',
    examples: [
      { icon: 'water-outline', label: 'נזילות' },
      { icon: 'flash-outline', label: 'חשמל' },
      { icon: 'snow-outline', label: 'מיזוג' },
    ],
    color: COLORS.primary,
  },
  {
    icon: 'sparkles-outline',
    title: 'ה-AI מזהה הכל',
    subtitle: 'הבינה המלאכותית שלנו מנתחת את התמונה\nומבינה איזה בעל מקצוע אתה צריך',
    examples: [
      { icon: 'scan-outline', label: 'ניתוח מיידי' },
      { icon: 'list-outline', label: 'סיווג מדויק' },
      { icon: 'checkmark-done-outline', label: 'דיוק גבוה' },
    ],
    color: COLORS.warning,
  },
  {
    icon: 'people-outline',
    title: 'בחר את הטוב ביותר',
    subtitle: 'בעלי מקצוע באזור שלך ישלחו הצעות\nהשווה מחירים, בחר ודבר ישירות',
    examples: [
      { icon: 'pricetag-outline', label: 'מחירים' },
      { icon: 'time-outline', label: 'זמינות' },
      { icon: 'star-outline', label: 'דירוג' },
    ],
    color: COLORS.success,
  },
];

export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const setHasSeenOnboarding = useAppStore((s) => s.setHasSeenOnboarding);

  const goNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      finish();
    }
  };

  const goBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const finish = async () => {
    await setHasSeenOnboarding(true);
    router.replace('/(auth)/phone');
  };

  const slide = slides[currentSlide];
  const isLast = currentSlide === slides.length - 1;
  const isFirst = currentSlide === 0;

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        {!isFirst ? (
          <Pressable onPress={goBack} style={styles.backBtn} hitSlop={20}>
            <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
        <View style={{ flex: 1 }} />
        <Pressable onPress={finish} hitSlop={20}>
          <Text style={styles.skipText}>דלג</Text>
        </Pressable>
      </View>

      {/* Slide content */}
      <Animated.View
        key={currentSlide}
        entering={FadeIn.duration(400)}
        exiting={FadeOut.duration(150)}
        style={styles.content}
      >
        <View style={[styles.iconWrap, { backgroundColor: slide.color + '20' }]}>
          <Ionicons name={slide.icon} size={80} color={slide.color} />
        </View>

        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>

        {/* Example chips */}
        <View style={styles.examples}>
          {slide.examples.map((ex, i) => (
            <Animated.View
              key={`${currentSlide}-${i}`}
              entering={FadeIn.delay(200 + i * 100).duration(400)}
              style={[styles.exampleChip, { borderColor: slide.color + '50' }]}
            >
              <Ionicons name={ex.icon} size={18} color={slide.color} />
              <Text style={styles.exampleText}>{ex.label}</Text>
            </Animated.View>
          ))}
        </View>
      </Animated.View>

      {/* Dots */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentSlide && { backgroundColor: slide.color, width: 28 },
            ]}
          />
        ))}
      </View>

      {/* Next button */}
      <Pressable onPress={goNext} style={[styles.nextBtn, { backgroundColor: slide.color }]}>
        <Text style={styles.nextText}>{isLast ? 'בוא נתחיל' : 'הבא'}</Text>
        <Ionicons name={isLast ? 'checkmark' : 'arrow-back'} size={22} color="#FFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  iconWrap: {
    width: 170,
    height: 170,
    borderRadius: 85,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  examples: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  exampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  exampleText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textTertiary,
  },
  nextBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 40,
  },
  nextText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
