import { useColorScheme } from 'react-native';

const darkTheme = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  background: '#0F0F1A',
  backgroundLight: '#1A1A2E',
  surface: 'rgba(255, 255, 255, 0.06)',
  surfaceHover: 'rgba(255, 255, 255, 0.10)',
  border: 'rgba(255, 255, 255, 0.12)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textTertiary: 'rgba(255, 255, 255, 0.4)',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  card: '#1E1E30',
};

const lightTheme = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  background: '#F8F9FA',
  backgroundLight: '#FFFFFF',
  surface: 'rgba(0, 0, 0, 0.04)',
  surfaceHover: 'rgba(0, 0, 0, 0.08)',
  border: 'rgba(0, 0, 0, 0.10)',
  text: '#1A1A2E',
  textSecondary: 'rgba(0, 0, 0, 0.55)',
  textTertiary: 'rgba(0, 0, 0, 0.35)',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
  card: '#FFFFFF',
};

export type Theme = typeof darkTheme;

export function useTheme(): Theme {
  const colorScheme = useColorScheme();
  return colorScheme === 'light' ? lightTheme : darkTheme;
}

export { darkTheme, lightTheme };
