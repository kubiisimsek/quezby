// Dates and times are read on the phone's own clock: the tests' phone is in Istanbul.
process.env.TZ = 'Europe/Istanbul';

require('react-native-gesture-handler/jestSetup');

jest.mock('react-native-gesture-handler', () => {
  const actual = jest.requireActual('react-native-gesture-handler');
  const React = require('react');
  return {
    ...actual,
    GestureDetector: ({ children }) =>
      React.createElement(React.Fragment, null, children),
    // Gesture Handler 3's hooks lean on Reanimated's event handlers, which its
    // mock has not: a test reads the config it was given and calls its callbacks.
    usePanGesture: jest.fn((config) => ({ type: 'pan', config })),
    usePinchGesture: jest.fn((config) => ({ type: 'pinch', config })),
    useSimultaneousGestures: jest.fn((...gestures) => ({ type: 'simultaneous', gestures })),
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

/** The one app; which environment it talks to comes from `@env` (src/types/env.mock.ts). */
jest.mock('react-native-device-info', () => {
  const mock = require('react-native-device-info/jest/react-native-device-info-mock');
  mock.getBundleId.mockReturnValue('com.kubisimsek.game.quezby');
  mock.getVersion.mockReturnValue('1.0.0');
  mock.getBuildNumber.mockReturnValue('1');
  mock.getModel.mockReturnValue('iPhone 15');
  mock.getSystemVersion.mockReturnValue('18.0');
  return { __esModule: true, default: mock, ...mock };
});

/**
 * The phone's languages: a Turkish phone, so every screen speaks the words
 * its tests were written in. A test that wants another phone sets
 * `getLocales` or picks a language in the store.
 */
jest.mock('react-native-localize', () => ({
  getLocales: jest.fn(() => [
    { languageCode: 'tr', countryCode: 'TR', languageTag: 'tr-TR', isRTL: false },
  ]),
  findBestLanguageTag: jest.fn(() => ({ languageTag: 'tr', isRTL: false })),
  getNumberFormatSettings: jest.fn(() => ({ decimalSeparator: ',', groupingSeparator: '.' })),
  usesMetricSystem: jest.fn(() => true),
  openAppLanguageSettings: jest.fn(async () => undefined),
}));

/** A reload is the phone's business; a test only checks it was asked for. */
jest.mock('react-native-restart', () => ({
  __esModule: true,
  default: { restart: jest.fn(), Restart: jest.fn(), getReason: jest.fn(async () => null) },
}));

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

/**
 * The app's own integrity module (`QuezbyIntegrity`: Play Integrity on
 * Android, App Attest on iOS). Both platforms' methods, answering as a phone
 * that cannot vouch for itself — a test decides what Google or Apple says.
 */
require('react-native/Libraries/BatchedBridge/NativeModules').default.QuezbyIntegrity = {
  isAvailable: jest.fn(async () => false),
  prepare: jest.fn(async () => undefined),
  request: jest.fn(async () => 'play-integrity-token'),
  isSupported: jest.fn(async () => false),
  generateKey: jest.fn(async () => 'app-attest-key'),
  attestKey: jest.fn(async () => 'app-attest-attestation'),
  generateAssertion: jest.fn(async () => 'app-attest-assertion'),
};

/**
 * Firebase, as a build without its files: no app, so push is unavailable. A
 * test that wants push makes `getApps` return one and decides what the
 * phone answers.
 */
jest.mock('@react-native-firebase/app', () => ({
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({ name: '[DEFAULT]' })),
}));

jest.mock('@react-native-firebase/messaging', () => ({
  AuthorizationStatus: { NOT_DETERMINED: -1, DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2, EPHEMERAL: 3 },
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn(async () => 'fcm-token'),
  deleteToken: jest.fn(async () => undefined),
  setAutoInitEnabled: jest.fn(async () => undefined),
  hasPermission: jest.fn(async () => -1),
  requestPermission: jest.fn(async () => 1),
  onMessage: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  onTokenRefresh: jest.fn(() => jest.fn()),
  getInitialNotification: jest.fn(async () => null),
}));

/** The photo library: a test decides what the player picks. */
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(async () => ({ didCancel: true })),
  launchCamera: jest.fn(async () => ({ didCancel: true })),
}));

/** Cropping a photo: a test decides how big each quality comes out. */
jest.mock('@react-native-community/image-editor', () => ({
  __esModule: true,
  default: {
    cropImage: jest.fn(async () => ({
      uri: 'file:///cropped.jpg',
      path: '/cropped.jpg',
      name: 'cropped.jpg',
      width: 512,
      height: 512,
      size: 40_000,
      type: 'image/jpeg',
      base64: 'AAAA',
    })),
  },
}));
