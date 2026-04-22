import { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  FlatList,
  useWindowDimensions,
  I18nManager,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ListRenderItemInfo,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING } from '../src/constants';
import { useAppStore } from '../src/stores/useAppStore';

/**
 * Onboarding — native-swipe carousel.
 *
 * Rebuilt from scratch with FlatList + pagingEnabled instead of a
 * hand-rolled Gesture.Pan + opacity fade. Two reasons:
 *   1. Native swipe feel — same as every stock iOS/Android pager.
 *   2. Rock-solid transitions. The previous opacity+translateX combo
 *      was racing with React state updates, producing the "slide 2 → 3
 *      doesn't work" bug.
 *
 * Slide 1: only a big primary "Next" button.
 * Slides 2+: "Back" (ghost) next to "Next" (primary).
 * The last slide's Next becomes "Start" and routes to the phone-auth flow.
 */

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
  const setHasSeenOnboarding = useAppStore((s) => s.setHasSeenOnboarding);
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && windowWidth >= 768;
  const SCREEN_WIDTH = isDesktop ? Math.min(windowWidth, DESKTOP_MAX_WIDTH) : windowWidth;
  const isRTL = I18nManager.isRTL;

  const listRef = useRef<FlatList<Slide>>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

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

  const scrollToIndex = (index: number) => {
    if (index < 0 || index >= slides.length) return;
    listRef.current?.scrollToIndex({ index, animated: true });
    setCurrentSlide(index);
  };

  const finish = async () => {
    await setHasSeenOnboarding(true);
    router.replace('/(auth)/phone');
  };

  const goNext = () => {
    if (currentSlide === slides.length - 1) void finish();
    else scrollToIndex(currentSlide + 1);
  };

  const goPrev = () => scrollToIndex(currentSlide - 1);

  // Track the active slide by scroll offset — this is what makes the
  // dots + buttons stay in sync with native swipe gestures.
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const index = Math.round(x / SCREEN_WIDTH);
      if (index !== currentSlide && index >= 0 && index < slides.length) {
        setCurrentSlide(index);
      }
    },
    [SCREEN_WIDTH, currentSlide, slides.length],
  );

  const renderSlide = useCallback(
    ({ item }: ListRenderItemInfo<Slide>) => (
      <SlideView slide={item} width={SCREEN_WIDTH} />
    ),
    [SCREEN_WIDTH],
  );

  const slide = slides[currentSlide];
  const isFirst = currentSlide === 0;
  const isLast = currentSlide === slides.length - 1;

  return (
    <View style={[styles.container, isDesktop && { alignItems: 'center' }]}>
      <View style={isDesktop ? { width: DESKTOP_MAX_WIDTH, flex: 1 } : { flex: 1 }}>
        {/* Top bar — skip only */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => void finish()} hitSlop={20}>
            <Text style={styles.skipText}>{t('common.skip')}</Text>
          </Pressable>
        </View>

        {/* Native-paging carousel */}
        <FlatList
          ref={listRef}
          data={slides}
          renderItem={renderSlide}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          // Required so scrollToIndex lands right even on wide devices.
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          // In RTL Android reverses the internal order automatically,
          // but on iOS + web we need the flag. inverted={isRTL} keeps
          // "next slide" feeling natural for Hebrew readers.
          inverted={isRTL && Platform.OS !== 'android'}
        />

        {/* Dots */}
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <Pressable key={i} onPress={() => scrollToIndex(i)} hitSlop={8}>
              <View
                style={[
                  styles.dot,
                  i === currentSlide && {
                    backgroundColor: slide.color,
                    width: 28,
                  },
                ]}
              />
            </Pressable>
          ))}
        </View>
        <Text style={styles.counter}>
          {currentSlide + 1}/{slides.length}
        </Text>

        {/* Button row — first slide has ONE big button; rest have Next + Back. */}
        {isFirst ? (
          <View style={styles.btnRowSingle}>
            <Pressable
              onPress={goNext}
              style={[styles.primaryBtn, { backgroundColor: slide.color }]}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>{t('common.next')}</Text>
              <Ionicons
                name={isRTL ? 'arrow-back' : 'arrow-forward'}
                size={22}
                color="#FFF"
              />
            </Pressable>
          </View>
        ) : (
          <View style={styles.btnRowDual}>
            <Pressable onPress={goPrev} style={styles.ghostBtn} accessibilityRole="button">
              <Ionicons
                name={isRTL ? 'arrow-forward' : 'arrow-back'}
                size={20}
                color={COLORS.textSecondary}
              />
              <Text style={styles.ghostBtnText}>{t('common.back', 'חזור')}</Text>
            </Pressable>
            <Pressable
              onPress={goNext}
              style={[styles.primaryBtn, { backgroundColor: slide.color, flex: 1 }]}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>
                {isLast ? t('onboarding.letsStart') : t('common.next')}
              </Text>
              <Ionicons
                name={isLast ? 'checkmark' : isRTL ? 'arrow-back' : 'arrow-forward'}
                size={22}
                color="#FFF"
              />
            </Pressable>
          </View>
        )}
      </View>
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
  container: { flex: 1, backgroundColor: COLORS.background },
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
  slide: {
    flex: 1,
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
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  exampleText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  counter: {
    color: COLORS.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  btnRowSingle: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  btnRowDual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ghostBtnText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
