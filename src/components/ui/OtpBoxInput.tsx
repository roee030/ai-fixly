import { useEffect, useRef, useState } from 'react';
import { View, TextInput, Platform, StyleSheet } from 'react-native';
import { COLORS } from '../../constants';

interface Props {
  length?: number;
  value: string;
  onChange: (next: string) => void;
  /** Fired when the user fills the last box — lets the parent auto-submit. */
  onComplete?: (code: string) => void;
  error?: boolean;
  autoFocus?: boolean;
}

/**
 * 6-box OTP input with two modern niceties:
 *
 *  1. Auto-advance as the user types — focus moves forward after each
 *     digit, and Backspace on an empty box moves focus back.
 *
 *  2. Auto-fill from the SMS itself. On iOS / Android the platform
 *     suggests the code from Messages via `textContentType="oneTimeCode"`
 *     and `autoComplete="sms-otp"`. When that single suggestion arrives
 *     as one paste, we split it across every box and fire `onComplete`.
 *     On Web (Chrome/Safari) we additionally call the WebOTP API
 *     (`navigator.credentials.get({ otp: ... })`) which reads the code
 *     straight from the SMS notification — no copy, no paste.
 *
 * Parent owns the string state; this component is a controlled input.
 */
export function OtpBoxInput({
  length = 6,
  value,
  onChange,
  onComplete,
  error = false,
  autoFocus = true,
}: Props) {
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [focusedIdx, setFocusedIdx] = useState(autoFocus ? 0 : -1);

  // Split the controlled value across boxes. Missing digits → empty string.
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  // Web: ask the browser for the incoming SMS code via the WebOTP API.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined' || !('OTPCredential' in window)) return;

    const controller = new AbortController();
    (navigator.credentials as any)
      .get({ otp: { transport: ['sms'] }, signal: controller.signal })
      .then((cred: any) => {
        if (!cred?.code) return;
        const digitsOnly = String(cred.code).replace(/\D/g, '').slice(0, length);
        onChange(digitsOnly);
        if (digitsOnly.length === length) onComplete?.(digitsOnly);
      })
      .catch(() => {
        // User declined or timed out — nothing to do, keep manual flow.
      });

    return () => controller.abort();
  }, [length, onChange, onComplete]);

  const handleChange = (i: number, raw: string) => {
    // If the user (or the platform autofill) pastes more than one digit,
    // spread them across boxes starting from the current one.
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length === 0) {
      const next = value.slice(0, i) + value.slice(i + 1);
      onChange(next.slice(0, length));
      return;
    }

    if (digitsOnly.length > 1) {
      const merged = (value.slice(0, i) + digitsOnly).slice(0, length);
      onChange(merged);
      const nextFocus = Math.min(merged.length, length - 1);
      inputRefs.current[nextFocus]?.focus();
      if (merged.length === length) onComplete?.(merged);
      return;
    }

    // Single digit: replace the current slot and advance.
    const next = (value.slice(0, i) + digitsOnly + value.slice(i + 1)).slice(0, length);
    onChange(next);
    if (i < length - 1) inputRefs.current[i + 1]?.focus();
    if (next.length === length) onComplete?.(next);
  };

  const handleKeyPress = (i: number, key: string) => {
    if (key === 'Backspace' && !digits[i] && i > 0) {
      // Empty box + backspace → jump back and clear previous.
      const next = value.slice(0, i - 1) + value.slice(i);
      onChange(next);
      inputRefs.current[i - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {digits.map((d, i) => (
        <TextInput
          key={i}
          ref={(r) => { inputRefs.current[i] = r; }}
          value={d}
          onChangeText={(t) => handleChange(i, t)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
          onFocus={() => setFocusedIdx(i)}
          onBlur={() => setFocusedIdx(-1)}
          keyboardType="number-pad"
          // The magic props: these are what lets the OS surface the SMS code.
          textContentType="oneTimeCode"
          autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
          // Only the first box needs length=6 paste capability — the rest
          // are single-digit. But accepting multi-digit on every box lets
          // paste-in-middle still work, which matches user muscle memory.
          maxLength={length}
          autoFocus={autoFocus && i === 0}
          selectTextOnFocus
          caretHidden={d.length > 0}
          style={[
            styles.box,
            focusedIdx === i && styles.boxFocused,
            d.length > 0 && styles.boxFilled,
            error && styles.boxError,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  box: {
    flex: 1,
    height: 64,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    // Web only — prevents the browser from adding an inner focus ring that
    // clashes with our borderColor transitions.
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none' } as any)
      : {}),
  },
  boxFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  boxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  boxError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error + '10',
  },
});
