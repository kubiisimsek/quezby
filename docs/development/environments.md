# App environments — local, staging, production

One source, three apps that install side by side, each talking to its own API.

| Environment | Bundle / application id | Name on the phone | API (`apps/mobile/.env`) | API `APP_ENV` |
| --- | --- | --- | --- | --- |
| local | `com.kubisimsek.game.quezby.local` | Quezby Local | `API_URL_LOCAL` (default `http://localhost:8000`) | `local` — `.env.example` |
| staging | `com.kubisimsek.game.quezby.staging` | Quezby Staging | `API_URL_STAGING` (default `https://staging-api.quezby.com`) | `staging` — `.env.staging.example` |
| production | `com.kubisimsek.game.quezby` | Quezby | `API_URL_PRODUCTION` (default `https://api.quezby.com`) | `production` — `.env.production.example` |

The app reads its environment from the **native build, never from `.env`**:
`src/config/environment.ts` maps the bundle id (`react-native-device-info`) to
`local | staging | production`, and `src/config/env.ts` picks that
environment's API origin. All three origins are public and ship in every
bundle; nothing secret lives in `apps/mobile/.env`.

A local Debug build on a phone or the Android emulator cannot reach
`localhost` — that is the device. `localApiUrl()` swaps `localhost` for the
host Metro served the bundle from (or `10.0.2.2` on the Android emulator), so
`pnpm dev:api` on the Mac is reachable without editing `.env`.

## iOS

| Configuration | Environment | Scheme |
| --- | --- | --- |
| `Debug` | local | **Quezby** (Run) |
| `Staging.Debug` | staging | **Quezby Staging** (Run) |
| `Staging.Release` | staging | **Quezby Staging** (Archive) |
| `Release` | production | **Quezby** (Archive) |

Per configuration, on the `Quezby` target: `PRODUCT_BUNDLE_IDENTIFIER`,
`QUEZBY_ENV`, `QUEZBY_DISPLAY_NAME` (→ `CFBundleDisplayName`). Info.plist also
carries `QuezbyEnvironment = $(QUEZBY_ENV)` for native code that needs it. The
Podfile maps the two staging configurations onto `:debug` / `:release`.

```bash
pnpm ios            # Debug → Quezby Local
pnpm ios:staging    # Staging.Debug → Quezby Staging
```

Archive `Quezby` for the App Store and `Quezby Staging` for TestFlight testers.

## Android

Product flavors in `android/app/build.gradle`, dimension `environment`:
`local` (`.local`), `staging` (`.staging`), `prod` (no suffix). Each sets
`app_name` through `resValue` and `BuildConfig.QUEZBY_ENV`. The Kotlin
namespace stays `com.kubisimsek.game.quezby`, so the launcher activity is
`com.kubisimsek.game.quezby.MainActivity` whatever the flavor.

```bash
pnpm android            # localDebug
pnpm android:staging    # stagingDebug
cd apps/mobile/android && ./gradlew bundleProdRelease   # store bundle
```

The release build is still signed with the debug keystore from the template.
Create an upload keystore before the first Play upload and wire it into
`signingConfigs.release` — never commit it.

## The API

`apps/api/.env.example` is local development (SQLite, debug on).
`.env.staging.example` and `.env.production.example` are the hosting
templates (MySQL, debug off); the API refuses to boot with `APP_DEBUG=true`
outside local. Copy one to `apps/api/.env.staging` / `.env.production`
(git-ignored), fill it in, and `pnpm api:package:staging` builds a zip ready
to upload — see `docs/deployment/shared-hosting.md`.

## Sign in with Apple and Google

The app ships the code for both; each environment needs its own console setup.

- **Apple** — the iOS target has `Quezby/Quezby.entitlements`
  (`com.apple.developer.applesignin`) in all four configurations. Enable
  "Sign in with Apple" on each App ID, set your `DEVELOPMENT_TEAM` in Xcode,
  and create one Sign in with Apple key (`.p8`). The API needs
  `APPLE_BUNDLE_IDS` (the bundle id of that environment), and — only for
  revoking Apple's grant when an account is deleted — `APPLE_TEAM_ID`,
  `APPLE_KEY_ID` and `APPLE_PRIVATE_KEY_PATH` (the `.p8` under
  `storage/app/private`, never in git). Apple sign-in is iOS only.
- **Google** — in Google Cloud: the OAuth consent screen, one **Web** client
  (its id is the token audience the API checks), one **iOS** client per bundle
  id, and one **Android** client per application id with that build's SHA-1
  (`keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android`
  for local and staging; Play App Signing's for production). Put the public ids
  in `apps/mobile/.env` (`GOOGLE_WEB_CLIENT_ID_*`, `GOOGLE_IOS_CLIENT_ID_*`),
  the reversed iOS client id in the `GOOGLE_IOS_URL_SCHEME` build setting of
  each iOS configuration (`com.googleusercontent.apps.…`), and every id in the
  API's `GOOGLE_CLIENT_IDS`. Without them the Google button is simply not shown.
- The store listings must declare email and user id (App Store privacy label,
  Play Data safety).

## Outside the repo

- Apple Developer: an App ID for each of the three bundle ids, with
  "Sign in with Apple".
- Google Cloud: the OAuth clients above.
- Google Play: one app per application id you ship (`staging` for internal
  testing, the bare id for production).
- DNS: `staging-api.quezby.com` and `api.quezby.com` (or whatever you set in
  `apps/mobile/.env`) pointing at the hosting, each with HTTPS.
