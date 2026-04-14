/**
 * Simple flag that the dev gallery sets before navigating to auth screens.
 * AuthGate checks this and skips redirects when set.
 * Resets after 3 seconds (enough time for navigation to complete).
 *
 * Only used in __DEV__ builds.
 */
let _bypass = false;

export const devBypass = {
  set(value: boolean) {
    _bypass = value;
    if (value) {
      setTimeout(() => { _bypass = false; }, 3000);
    }
  },
  get(): boolean {
    return _bypass;
  },
};
