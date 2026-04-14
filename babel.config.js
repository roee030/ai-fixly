module.exports = function (api) {
  api.cache(true);

  const isTest = process.env.NODE_ENV === 'test';

  return {
    presets: [
      // In test: skip NativeWind's jsxImportSource (injects _ReactNativeCSSInterop
      // which breaks jest.mock() factory scope). Styles won't apply in tests
      // but that's fine — we test structure, not visual styling.
      ['babel-preset-expo', isTest ? {} : { jsxImportSource: 'nativewind' }],
      // NativeWind babel preset only in non-test builds
      ...(isTest ? [] : ['nativewind/babel']),
    ],
  };
};
