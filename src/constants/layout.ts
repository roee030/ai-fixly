import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const LAYOUT = {
  SCREEN_WIDTH: width,
  SCREEN_HEIGHT: height,
  TAB_BAR_HEIGHT: 80,
  HEADER_HEIGHT: 56,
  CAPTURE_BUTTON_SIZE: 72,
  MIN_TOUCH_TARGET: 44,
  CONTENT_PADDING: 16,
} as const;
