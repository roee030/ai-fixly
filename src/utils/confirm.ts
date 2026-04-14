import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog.
 *
 * Why this exists: Alert.alert is silently broken on react-native-web —
 * it does not render a dialog, so onPress callbacks never fire and the
 * user sees "nothing happens". This helper uses window.confirm on web
 * and Alert.alert on native.
 *
 * @returns Promise resolving to true if user confirmed, false otherwise.
 */
export function confirmDialog(
  title: string,
  message: string,
  confirmLabel: string,
  cancelLabel: string,
): Promise<boolean> {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
    // Native browser confirm ignores button labels but returns a boolean reliably.
    const body = message ? `${title}\n\n${message}` : title;
    return Promise.resolve(window.confirm(body));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, onPress: () => resolve(true) },
    ]);
  });
}
