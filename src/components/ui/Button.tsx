import { Pressable, Text, ActivityIndicator, ViewStyle } from 'react-native';
import { COLORS } from '../../constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  const bgColor =
    variant === 'primary'
      ? COLORS.primary
      : variant === 'secondary'
        ? COLORS.surface
        : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      style={[
        {
          paddingVertical: 16,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          backgroundColor: bgColor,
          opacity: isDisabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={COLORS.text} />
      ) : (
        <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 16 }}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
