/** @type {import('jest').Config} */
module.exports = {
  // jest-expo/web tests via react-native-web in jsdom — no native mocks needed
  preset: 'jest-expo/web',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__tests__/helpers/fileMock.js',
    '\\.css$': '<rootDir>/__tests__/helpers/styleMock.js',
  },
  testPathIgnorePatterns: ['/node_modules/', '/workers/', '/storybook-static/'],
  // Stories are Storybook-only — never run them as Jest tests.
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  // Match the jest-expo/web preset's pattern style: no trailing `/`, so a
  // prefix like `expo` matches `expo-constants/` too. The previous version
  // had `(?!(...)/)`, which silently excluded every `expo-*` and
  // `react-native-*` subpackage from Babel and broke every screen test.
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      '\\.pnpm|' +
      'react-native|' +
      '@react-native|' +
      '@react-native-community|' +
      'expo|' +
      '@expo|' +
      '@expo-google-fonts|' +
      'react-navigation|' +
      '@react-navigation|' +
      '@sentry/react-native|' +
      'nativewind|' +
      '@testing-library' +
    '))',
  ],
};
