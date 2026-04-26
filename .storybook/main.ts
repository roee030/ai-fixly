import type { StorybookConfig } from '@storybook/react-native-web-vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Storybook 10 runs the config as ESM, so the CommonJS __dirname global
// isn't defined. Re-derive it from import.meta.url so the alias paths
// below resolve relative to .storybook/.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Storybook config for the Fixly app.
 *
 * We use the `@storybook/react-native-web-vite` framework so React Native
 * components (Pressable, View, Text, RNW components, etc.) render in the
 * web Storybook UI via react-native-web — no separate native runtime
 * required, no extra build step beyond `npm run storybook`.
 *
 * Stories live next to their components in `src/components/**` so the
 * component owner sees the playground right next to the implementation.
 */
const config: StorybookConfig = {
  stories: ['../src/components/**/*.stories.@(ts|tsx|mdx)'],

  framework: {
    name: '@storybook/react-native-web-vite',
    options: {},
  },

  // Mock a few native modules that have no web equivalent. The mocks are
  // declared in `.storybook/preview.tsx` so they run before any story.
  // Vite's resolve.alias handles redirects.
  viteFinal: async (cfg) => {
    cfg.resolve = cfg.resolve || {};
    cfg.resolve.alias = {
      ...(cfg.resolve.alias || {}),
      // Reanimated has its own babel plugin that we can't run from Vite.
      // Redirect to the web mock that ships with the package.
      'react-native-reanimated': path.resolve(
        __dirname,
        './mocks/reanimated.tsx',
      ),
      // Native FCM / Sentry / Firebase aren't story-relevant. Storyshots
      // never reach them, but the import graph from a UI primitive can.
      '@sentry/react-native': path.resolve(__dirname, './mocks/empty.ts'),
      '@react-native-firebase/messaging': path.resolve(
        __dirname,
        './mocks/empty.ts',
      ),
    };
    return cfg;
  },

  // Don't auto-open the browser — Windows + WSL would otherwise spawn
  // edge.exe inside WSL and fail.
  core: { disableTelemetry: true },
};

export default config;
