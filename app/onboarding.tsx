import { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Platform,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../src/constants';
import { useAppStore } from '../src/stores/useAppStore';

const DESKTOP_MAX_WIDTH = 480;

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

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const setHasSeenOnboarding = useAppStore((s) => s.setHasSeenOnboarding);
  const flatListRef = useRef<FlatList>(null);
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && windowWidth >= 768;
  // On desktop, constrain the slide width to phone-like dimensions
  const SCREEN_WIDTH = isDesktop ? Math.min(windowWidth, DESKTOP_MAX_WIDTH) : windowWidth;

  const slides: Slide[] = [
    {
      icon: 'camera-outline',
      title: t('onboarding.slide1Title'),
      subtitle: t('onboarding.slide1Subtitle'),
      examples: [
        { icon: 'camera-outline', label: t('onboarding.slide1Photo') },
        { icon: 'videocam-outline', label: t('onboarding.slide1Video') },
        { icon: 'text-outline', label: t('onboarding.slide1Description') },
      ],
      color: COLORS.primary,
    },
    {
      icon: 'sparkles-outline',
      title: t('onboarding.slide2Title'),
      subtitle: t('onboarding.slide2Subtitle'),
      examples: [
        { icon: 'star-outline', label: t('onboarding.slide2Rated') },
        { icon: 'pricetag-outline', label: t('onboarding.slide2Prices') },
        { icon: 'shield-checkmark-outline', label: t('onboarding.slide2Verified') },
      ],
      color: COLORS.warning,
    },
    {
      icon: 'people-outline',
      title: t('onboarding.slide3Title'),
      subtitle: t('onboarding.slide3Subtitle'),
      examples: [
        { icon: 'flash-outline', label: t('onboarding.slide3Fast') },
        { icon: 'chatbubbles-outline', label: t('onboarding.slide3Chat') },
        { icon: 'happy-outline', label: t('onboarding.slide3Simple') },
      ],
      color: COLORS.success,
    },
  ];

  const goToIndex = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentSlide(index);
  };

  const goNext = () => {
    if (currentSlide < slides.length - 1) {
      goToIndex(currentSlide + 1);
    } else {
      finish();
    }
  };

  const finish = async () => {
    await setHasSeenOnboarding(true);
    router.replace('/(auth)/phone');
  };

  // Track which slide is visible as the user swipes
  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== currentSlide) {
      setCurrentSlide(index);
    }
  };

  const slide = slides[currentSlide];
  const isLast = currentSlide === slides.length - 1;

  return (
    <View style={[styles.container, isDesktop && { alignItems: 'center' }]}>
    <View style={isDesktop ? { width: DESKTOP_MAX_WIDTH, flex: 1 } : { flex: 1 }}>
      {/* Top bar - skip button only. No back button \u2014 users swipe to go back. */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={finish} hitSlop={20}>
          <Text style={styles.skipText}>{t('common.skip')}</Text>
        </Pressable>
      </View>

      {/* Swipeable carousel */}
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(_, i) => `slide-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        renderItem={({ item }) => <SlideView slide={item} width={SCREEN_WIDTH} />}
        style={styles.carousel}
        // Skip scroll-to-index misses by providing an item size
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Dots - tappable */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <Pressable key={i} onPress={() => goToIndex(i)} hitSlop={8}>
            <View
              style={[
                styles.dot,
                i === currentSlide && {
                  backgroundColor: slide.color,
                  width: 28,
                  height: 8,
                  borderRadius: 4,
                },
              ]}
            />
          </Pressable>
        ))}
      </View>
      <Text style={{ color: COLORS.textTertiary, fontSize: 12, textAlign: 'center', marginBottom: 16 }}>
        {currentSlide + 1}/{slides.length}
      </Text>

      {/* Next button */}
      <Pressable
        onPress={goNext}
        style={[styles.nextBtn, { backgroundColor: slide.color }]}
      >
        <Text style={styles.nextText}>{isLast ? t('onboarding.letsStart') : t('common.next')}</Text>
        <Ionicons
          name={isLast ? 'checkmark' : 'arrow-back'}
          size={22}
          color="#FFF"
        />
      </Pressable>
    </View>{/* close inner desktop container */}
    </View>
  );
}

function SlideView({ slide, width }: { slide: Slide; width: number }) {
  return (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.iconWrap, { backgroundColor: slide.color + '20' }]}>
        <Ionicons name={slide.icon} size={56} color={slide.color} />
      </View>

      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.subtitle}>{slide.subtitle}</Text>

      <View style={styles.examples}>
        {slide.examples.map((ex, i) => (
          <View
            key={i}
            style={[styles.exampleChip, { borderColor: slide.color + '50' }]}
          >
            <Ionicons name={ex.icon} size={18} color={slide.color} />
            <Text style={styles.exampleText}>{ex.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  skipText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  carousel: {
    flex: 1,
  },
  slide: {
    // width is passed dynamically via style prop (responsive to desktop/mobile)
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  iconWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
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
    marginTop: 24,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
    marginHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
