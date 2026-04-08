import { TextInput, View, Text, TextInputProps } from 'react-native';
import { COLORS, FONT_SIZES } from '../../constants';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={{ width: '100%', marginBottom: 16 }}>
      {label && (
        <Text style={{ marginBottom: 8, fontSize: 14, color: COLORS.textSecondary }}>
          {label}
        </Text>
      )}
      <TextInput
        accessibilityLabel={label || props.placeholder}
        accessibilityHint={error ? `Error: ${error}` : undefined}
        style={[
          {
            width: '100%',
            paddingVertical: 16,
            paddingHorizontal: 16,
            borderRadius: 12,
            fontSize: FONT_SIZES.md,
            backgroundColor: COLORS.surface,
            color: COLORS.text,
            borderWidth: error ? 1 : 0,
            borderColor: error ? COLORS.error : 'transparent',
          },
          style,
        ]}
        placeholderTextColor={COLORS.textTertiary}
        {...props}
      />
      {error && (
        <Text style={{ marginTop: 4, fontSize: 12, color: COLORS.error }}>
          {error}
        </Text>
      )}
    </View>
  );
}
