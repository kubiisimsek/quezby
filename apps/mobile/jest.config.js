module.exports = {
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.after-env.js'],
  preset: '@react-native/jest-preset',
  // Reanimated's official mock loads the real package, and its worklets must
  // resolve to their JS build rather than the native one.
  resolver: 'react-native-worklets/jest/resolver.js',
  // pnpm stores packages under node_modules/.pnpm/<name>@<version>/…, so the
  // stock pattern never matches and React Native ships untranspiled ESM.
  // React Navigation and its `standard-navigation` ship ESM too.
  transformIgnorePatterns: [
    'node_modules/(?!\\.pnpm|(?:jest-)?react-native|@react-native|@react-navigation|standard-navigation)',
  ],
  moduleNameMapper: {
    '^@quezby/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@quezby/config$': '<rootDir>/../../packages/config/src/index.ts',
    '^@quezby/engine$': '<rootDir>/../../packages/engine/src/index.ts',
    '^@quezby/sdk$': '<rootDir>/../../packages/sdk/src/index.ts',
    '^@env$': '<rootDir>/src/types/env.mock.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.(ts|tsx)'],
};
