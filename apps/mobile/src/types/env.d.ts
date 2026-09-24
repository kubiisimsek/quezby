/**
 * Types for the virtual `@env` module that `react-native-dotenv` builds from
 * `apps/mobile/.env`. `allowUndefined` is on, so a missing name arrives as
 * `undefined`. Only `src/config/env.ts` may import it.
 */
declare module '@env' {
  export const API_URL_LOCAL: string | undefined;
  export const API_URL_STAGING: string | undefined;
  export const API_URL_PRODUCTION: string | undefined;
  export const GOOGLE_WEB_CLIENT_ID_LOCAL: string | undefined;
  export const GOOGLE_WEB_CLIENT_ID_STAGING: string | undefined;
  export const GOOGLE_WEB_CLIENT_ID_PRODUCTION: string | undefined;
  export const GOOGLE_IOS_CLIENT_ID_LOCAL: string | undefined;
  export const GOOGLE_IOS_CLIENT_ID_STAGING: string | undefined;
  export const GOOGLE_IOS_CLIENT_ID_PRODUCTION: string | undefined;
}
