import { View, ViewProps, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../constants';

/**
 * Max content width on desktop web. Mobile and tablet render full-width.
 * This gives a phone-like experience on desktop (centered card) rather
 * than stretching UI designed for 375px across a 1920px monitor.
 */
const DESKTOP_MAX_WIDTH = 480;
const DESKTOP_BREAKPOINT = 768;

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
  /** Override maxWidth for wider screens like SEO pages (default: 480) */
  maxWidth?: number;
}

export function ScreenContainer({
  children,
  padded = true,
  maxWidth = DESKTOP_MAX_WIDTH,
  style,
  ...props
}: ScreenContainerProps) {
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && windowWidth >= DESKTOP_BREAKPOINT;

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
        // On desktop web: center the content column
        ...(isDesktop ? { alignItems: 'center' } : {}),
      }}
      accessibilityRole="none"
    >
      <View
        style={[
          { flex: 1 },
          padded && { paddingHorizontal: SPACING.md },
          // On desktop: constrain width like a phone screen centered on page
          isDesktop && {
            width: '100%',
            maxWidth,
          },
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
