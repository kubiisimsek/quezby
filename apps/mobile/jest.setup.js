require('react-native-gesture-handler/jestSetup');

jest.mock('react-native-gesture-handler', () => {
  const actual = jest.requireActual('react-native-gesture-handler');
  const React = require('react');
  return {
    ...actual,
    GestureDetector: ({ children }) =>
      React.createElement(React.Fragment, null, children),
  };
});

// Both official mocks. Worklets needs its own: Gesture Handler 3 asks it for
// the UI runtime as soon as it is imported, which the JS build refuses.
jest.mock('react-native-worklets', () =>
  require('react-native-worklets/src/mock'),
);

jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  // Motion is on unless a test turns it off; the lobby's breathing button asks.
  useReducedMotion: jest.fn(() => false),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) =>
      React.createElement(View, null, children),
    SafeAreaView: ({ children }) => React.createElement(View, null, children),
    useSafeAreaInsets: () => inset,
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: inset,
    },
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/** The keychain, in memory: one entry per service, as on a device. */
jest.mock('react-native-keychain', () => {
  const actual = jest.requireActual('react-native-keychain');
  const entries = new Map();
  const serviceOf = (options) => (options && options.service) || 'default';
  return {
    ...actual,
    setGenericPassword: jest.fn(async (username, password, options) => {
      const service = serviceOf(options);
      entries.set(service, { username, password, service, storage: 'KC' });
      return { service, storage: 'KC' };
    }),
    getGenericPassword: jest.fn(
      async (options) => entries.get(serviceOf(options)) ?? false,
    ),
    hasGenericPassword: jest.fn(async (options) =>
      entries.has(serviceOf(options)),
    ),
    resetGenericPassword: jest.fn(async (options) =>
      entries.delete(serviceOf(options)),
    ),
    getAllGenericPasswordServices: jest.fn(async () => [...entries.keys()]),
  };
});

/** A local debug build, so nothing under test ever points at production. */
jest.mock('react-native-device-info', () => {
  const mock = require('react-native-device-info/jest/react-native-device-info-mock');
  mock.getBundleId.mockReturnValue('com.kubisimsek.game.quezby.local');
  mock.getVersion.mockReturnValue('1.0.0');
  mock.getBuildNumber.mockReturnValue('1');
  return { __esModule: true, default: mock, ...mock };
});

jest.mock('react-native-haptic-feedback', () => {
  const haptics = {
    trigger: jest.fn(),
    impact: jest.fn(),
    stop: jest.fn(),
    triggerPattern: jest.fn(),
    isSupported: jest.fn(() => true),
    isEnabled: jest.fn(() => true),
    setEnabled: jest.fn(),
  };
  return { __esModule: true, default: haptics, ...haptics };
});

/** Sign in with Apple: a supported iOS by default; a test decides what Apple answers. */
jest.mock('@invertase/react-native-apple-authentication', () => ({
  appleAuth: {
    isSupported: true,
    performRequest: jest.fn(),
    Operation: { LOGIN: 1, LOGOUT: 3 },
    Scope: { EMAIL: 0, FULL_NAME: 1 },
    Error: { CANCELED: '1001', FAILED: '1004' },
  },
}));

/** Google sign-in: a test decides what the picker returns. */
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(),
    signOut: jest.fn(async () => null),
  },
  isCancelledResponse: (response) => response?.type === 'cancelled',
  isErrorWithCode: (error) => typeof error?.code === 'string',
  statusCodes: { IN_PROGRESS: 'IN_PROGRESS', SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
}));
