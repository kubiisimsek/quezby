/**
 * `@env` under Jest (`jest.config.js` maps it here; `babel.config.js` keeps
 * react-native-dotenv out of tests): a local build with nothing optional set
 * up, whichever environment `apps/mobile/.env` is switched to. A test that
 * needs Google or Play Integrity mocks `@/config/env` itself.
 */
export const QUEZBY_ENV = 'local';
export const API_URL_LOCAL = 'http://localhost:8000';
export const API_URL_STAGING = 'https://quezby.kubisimsek.com';
export const API_URL_PRODUCTION = 'https://quezby.com';
export const GOOGLE_WEB_CLIENT_ID = '';
export const GOOGLE_IOS_CLIENT_ID = '';
export const GOOGLE_CLOUD_PROJECT_NUMBER = '';
