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
  testPathIgnorePatterns: ['/node_modules/', '/workers/'],
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      'react-native|' +
      'react-native-web|' +
      '@react-native|' +
      'expo|' +
      '@expo|' +
      'react-native-reanimated|' +
      'react-native-gesture-handler|' +
      'react-native-screens|' +
      'react-native-safe-area-context|' +
      '@react-navigation|' +
      'nativewind|' +
      '@testing-library' +
    ')/)',
  ],
};
