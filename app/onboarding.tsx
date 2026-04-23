import { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
  I18nManager,
  Animated,
  PanResponder,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../src/constants';
import { useAppStore } from '../src/stores/useAppStore';

/**
 * Onboarding — manual pager with RN-core Animated + PanResponder.
 *
 * Why not ScrollView / FlatList: RN's horizontal scroll components
 * auto-flip their content offset when `I18nManager.isRTL === true`, and
 * the auto-flip is inconsistent across platforms and RN versions. We
 * burned several iterations on the bug where the finger swipe felt
 * reversed on Hebrew devices — tapping Next worked, but the swipe went
 * the opposite way. By driving the transform ourselves we bypass the
 * auto-flip entirely, so behavior is identical on iOS / Android / LTR / RTL:
 *
 *   - Slides are laid out left-to-right (index 0 on the left).
 *   - Swipe finger right → left → translateX goes more negative → the
 *     next slide scrolls in. Same mental model Hebrew users see in every
 *     other native app (WhatsApp, iOS home screen, etc).
 *   - Prev / Next buttons call the same setIndex() path so button
 *     navigation and finger navigation animate identically.
 *
 * Using RN-core (not react-native-gesture-handler) means no
 * GestureHandlerRootView plumbing and no extra Reanimated worklet tricks —
 * this component is self-contained.
 */

const DESKTOP_MAX_WIDTH = 480;
const SWIPE_THRESHOLD = 50;

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

  const [currentSlide, setCurrentSlide] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  // Mirror the committed index inside a ref so the PanResponder handlers
  // always see the latest value (closures in PanResponder created at mount
  // capture the initial state).
  const indexRef = useRef(0);

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

  const snapTo = (i: number, animated: boolean = true) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, i));
    indexRef.current = clamped;
    setCurrentSlide(clamped);
    if (animated) {
      Animated.timing(translateX, {
        toValue: -clamped * SCREEN_WIDTH,
        duration: 280,
        useNativeDriver: true,
      }).start();
    } else {
      translateX.setValue(-clamped * SCREEN_WIDTH);
    }
  };

  // Keep the transform in sync when the viewport width changes (e.g.
  // rotating a tablet or resizing the browser window on web).
  useEffect(() => {
    translateX.setValue(-indexRef.current * SCREEN_WIDTH);
  }, [SCREEN_WIDTH]);

  const finish = async () => {
    await setHasSeenOnboarding(true);
    router.replace('/(auth)/phone');
  };

  const goNext = () => {
    if (indexRef.current === slides.length - 1) void finish();
    else snapTo(indexRef.current + 1);
  };

  const goPrev = () => snapTo(indexRef.current - 1);

  // PanResponder — claim horizontal drags only. Right-to-left (negative dx)
  // advances; left-to-right (positive dx) goes back. This matches what
  // Hebrew users asked for and is also how every other native app behaves.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) => {
          translateX.setValue(-indexRef.current * SCREEN_WIDTH + g.dx);
        },
        onPanResponderRelease: (_, g) => {
          let next = indexRef.current;
          if (g.dx < -SWIPE_THRESHOLD) next = indexRef.current + 1;
          else if (g.dx > SWIPE_THRESHOLD) next = indexRef.current - 1;
          snapTo(next);
        },
        onPanResponderTerminate: () => snapTo(indexRef.current),
      }),
    [SCREEN_WIDTH],
  );

  const slide = slides[currentSlide];
  const isFirst = currentSlide === 0;
  const isLast = currentSlide === slides.length - 1;

  return (
    <View style={[styles.container, isDesktop && { alignItems: 'center' }]}>
      <View style={isDesktop ? { width: DESKTOP_MAX_WIDTH, flex: 1 } : { flex: 1 }}>
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => void finish()} hitSlop={20}>
            <Text style={styles.skipText}>{t('common.skip')}</Text>
          </Pressable>
        </View>

        {/* Clip container hides the off-screen slides. Inner Animated.View
            is 3× screen width and translates left/right via the transform. */}
        <View style={[styles.pagerClip, { width: SCREEN_WIDTH }]} {...panResponder.panHandlers}>
          <Animated.View
            style={[
              styles.pagerRow,
              {
                width: SCREEN_WIDTH * slides.length,
                transform: [{ translateX }],
              },
            ]}
          >
            {slides.map((s, i) => (
              <SlideView key={i} slide={s} width={SCREEN_WIDTH} />
            ))}
          </Animated.View>
        </View>

        <View style={styles.dots}>
          {slides.map((_, i) => (
            <Pressable key={i} onPress={() => snapTo(i)} hitSlop={8}>
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
  pagerClip: {
    flex: 1,
    overflow: 'hidden',
  },
  pagerRow: {
    flex: 1,
    flexDirection: 'row',
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
