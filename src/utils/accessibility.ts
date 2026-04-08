import { AccessibilityProps } from 'react-native';

export function a11yLabel(label: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityLabel: label,
  };
}

export function a11yButton(label: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'button',
  };
}

export function a11yHeader(label: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'header',
  };
}

export function a11yImage(label: string): AccessibilityProps {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'image',
  };
}
