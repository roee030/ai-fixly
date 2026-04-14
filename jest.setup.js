/**
 * Jest setup file. Runs before every test file.
 *
 * Responsibilities:
 *   1. Reset all Zustand stores between tests (prevent state leaks)
 *   2. Mock native modules that don't exist in the test environment
 *   3. Suppress noisy console warnings from third-party libraries
 */

// ============================================================================
// 0. Global RN constants
// ============================================================================

// React Native's __DEV__ flag — set to true in test environment
global.__DEV__ = true;

// ============================================================================
// 1. Zustand store cleanup
// ============================================================================
// Store cleanup is handled by createMockProviders() — each test render
// hydrates stores to the desired mock state via React.useMemo. No global
// afterEach needed (setupFiles runs before Jest globals are available).

// ============================================================================
// 2. Mock native modules
// ============================================================================

// Firebase Web SDK — mock all Firebase web modules (they load Node-specific
// code that doesn't work in jsdom test environment)
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({})),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: null,
    onAuthStateChanged: jest.fn(() => jest.fn()),
  })),
  signInWithPhoneNumber: jest.fn(),
  RecaptchaVerifier: jest.fn(),
  onAuthStateChanged: jest.fn(() => jest.fn()),
  signOut: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  serverTimestamp: jest.fn(() => new Date()),
}));

jest.mock('firebase/analytics', () => ({
  getAnalytics: jest.fn(() => ({})),
  logEvent: jest.fn(),
  setUserId: jest.fn(),
}));

// Mock our own Firebase web config (it's imported by .web.ts files)
jest.mock('./src/config/firebaseWeb', () => ({
  firebaseApp: {},
  firebaseAuth: null,
  firebaseDb: {},
}));

// @expo/vector-icons — mock all icon components as simple span elements
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const createIcon = () => {
    const Icon = React.forwardRef((props, ref) =>
      React.createElement('span', { ref, 'data-testid': `icon-${props.name}` }, props.name || 'icon')
    );
    Icon.displayName = 'MockIcon';
    Icon.glyphMap = {};
    return Icon;
  };
  return {
    Ionicons: createIcon(),
    MaterialIcons: createIcon(),
    FontAwesome: createIcon(),
    Feather: createIcon(),
    createIconSet: () => createIcon(),
  };
});

// react-native-safe-area-context — mock with static insets
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 34, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
}));

// React Native Reanimated — must be mocked before any component imports
jest.mock('react-native-reanimated', () => {
  const RNW = require('react-native-web');
  const React = require('react');
  // Create a proper forwardRef component for Animated.View / Animated.Text
  const createAnimated = (Component) =>
    React.forwardRef((props, ref) =>
      React.createElement(Component, { ...props, ref })
    );
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: createAnimated,
      View: createAnimated(RNW.View),
      Text: createAnimated(RNW.Text),
      Image: createAnimated(RNW.Image),
      ScrollView: createAnimated(RNW.ScrollView),
      FlatList: createAnimated(RNW.FlatList),
    },
    useSharedValue: jest.fn((init) => ({ value: init })),
    useAnimatedStyle: jest.fn(() => ({})),
    useAnimatedScrollHandler: jest.fn(() => jest.fn()),
    withSpring: jest.fn((val) => val),
    withTiming: jest.fn((val) => val),
    withDelay: jest.fn((_, val) => val),
    withSequence: jest.fn((...vals) => vals[vals.length - 1]),
    withRepeat: jest.fn((val) => val),
    interpolate: jest.fn(() => 0),
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    // Chainable animation modifier mock — supports any call order
    // e.g. FadeIn.delay(400).duration(500), FadeInDown.duration(300).springify().damping(12)
    ...(() => {
      const chainable = () => new Proxy({}, { get: () => () => chainable() });
      const names = ['FadeIn', 'FadeInDown', 'FadeInUp', 'FadeOut', 'SlideInRight', 'SlideOutLeft', 'Layout'];
      return Object.fromEntries(names.map(n => [n, chainable()]));
    })(),
    Easing: {
      bezier: jest.fn(() => jest.fn()),
      linear: jest.fn(),
      ease: jest.fn(),
      in: jest.fn((x) => x),
      out: jest.fn((x) => x),
      inOut: jest.fn((x) => x),
    },
    runOnJS: jest.fn((fn) => fn),
    runOnUI: jest.fn((fn) => fn),
    createAnimatedComponent: createAnimated,
    View: createAnimated(RNW.View),
    Text: createAnimated(RNW.Text),
  };
});

// react-i18next — mock translation hook to return key as-is
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'he', changeLanguage: jest.fn(() => Promise.resolve()) },
  }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
  Trans: ({ children }) => children,
}));

// NativeWind — mock the CSS interop to prevent Babel transform conflicts
jest.mock('nativewind', () => ({}));
jest.mock('react-native-css-interop', () => ({
  cssInterop: jest.fn(),
  remapProps: jest.fn(),
}));

// expo-router — mock navigation so screens render without a real navigator
// NOTE: don't use requireActual here — it triggers NativeWind transforms
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => '/'),
  useRootNavigationState: jest.fn(() => ({ key: 'test-nav-key' })),
  useFocusEffect: jest.fn(),
  Link: ({ children }) => children,
  Stack: ({ children }) => children,
  Tabs: ({ children }) => children,
}));

// expo-router/head — mock Head for SEO tests
jest.mock('expo-router/head', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }) => React.createElement('head', null, children),
  };
});

// @react-native-firebase/* — mock all Firebase modules
jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: () => ({}),
  getApp: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => ({
    onAuthStateChanged: jest.fn(() => jest.fn()),
    signInWithPhoneNumber: jest.fn(),
    signOut: jest.fn(),
  }),
}));

jest.mock('@react-native-firebase/firestore', () => {
  const mockDoc = { id: 'mock', data: () => ({}), exists: () => true };
  const mockSnapshot = { docs: [], forEach: jest.fn() };
  return {
    __esModule: true,
    default: () => ({}),
    getFirestore: jest.fn(() => ({})),
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(() => Promise.resolve(mockDoc)),
    getDocs: jest.fn(() => Promise.resolve(mockSnapshot)),
    setDoc: jest.fn(() => Promise.resolve()),
    updateDoc: jest.fn(() => Promise.resolve()),
    deleteDoc: jest.fn(() => Promise.resolve()),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    onSnapshot: jest.fn(() => jest.fn()),
    serverTimestamp: jest.fn(() => new Date()),
  };
});

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: () => ({}),
  getMessaging: jest.fn(() => ({})),
  requestPermission: jest.fn(() => Promise.resolve(1)),
  getToken: jest.fn(() => Promise.resolve('mock-fcm-token')),
  onMessage: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
  setBackgroundMessageHandler: jest.fn(),
  AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2 },
}));

jest.mock('@react-native-firebase/analytics', () => ({
  __esModule: true,
  default: () => ({}),
  getAnalytics: jest.fn(() => ({})),
  logEvent: jest.fn(),
  setUserId: jest.fn(),
}));

jest.mock('@react-native-firebase/crashlytics', () => ({
  __esModule: true,
  default: () => ({
    log: jest.fn(),
    recordError: jest.fn(),
    setCrashlyticsCollectionEnabled: jest.fn(),
  }),
}));

// expo-splash-screen
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

// expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

// expo-location (native only — tests mock it)
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({ coords: { latitude: 32.0853, longitude: 34.7818 } })
  ),
  reverseGeocodeAsync: jest.fn(() =>
    Promise.resolve([{ city: 'תל אביב', street: 'דיזנגוף' }])
  ),
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
}));

// expo-camera
jest.mock('expo-camera', () => ({
  Camera: 'Camera',
  useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
}));

// expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({ canceled: false, assets: [{ uri: 'mock://image.jpg' }] })
  ),
  launchCameraAsync: jest.fn(() =>
    Promise.resolve({ canceled: false, assets: [{ uri: 'mock://photo.jpg' }] })
  ),
  MediaTypeOptions: { Images: 'Images' },
}));

// @sentry/react-native
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: (component) => component,
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: { path: 'mock/path' }, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://mock.supabase.co/mock.jpg' } })),
      })),
    },
  })),
}));

// ============================================================================
// 3. Suppress noisy warnings
// ============================================================================

const originalWarn = console.warn;
console.warn = (...args) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  // Suppress known noisy warnings from third-party libs
  if (
    msg.includes('Animated:') ||
    msg.includes('NativeEventEmitter') ||
    msg.includes('deprecated')
  ) {
    return;
  }
  originalWarn(...args);
};
