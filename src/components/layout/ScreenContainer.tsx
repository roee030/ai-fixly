import { View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../constants';

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
}

export function ScreenContainer({
  children,
  padded = true,
  style,
  ...props
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} accessibilityRole="none">
      <View
        style={[{ flex: 1 }, padded && { paddingHorizontal: SPACING.md }, style]}
        {...props}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
