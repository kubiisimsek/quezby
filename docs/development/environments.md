# App environments — local, staging, production

One app, three APIs. iOS and Android ship **one** id —
`com.kubisimsek.game.quezby` (bundle id, application id and Kotlin namespace)
— so a phone holds one Quezby at a time, and `apps/mobile/.env` decides which
API it talks to.

| Environment | `QUEZBY_ENV` | Name on the phone | API (`apps/mobile/.env`) | API `APP_ENV` |
| --- | --- | --- | --- | --- |
| local | `local` | Quezby Local | `API_URL_LOCAL` (default `http://localhost:8000`) | `local` — `.env.example` |
| staging | `staging` | Quezby Staging | `API_URL_STAGING` (default `https://staging-api.quezby.com`) | `staging` — `.env.staging.example` |
| production | `production` | Quezby | `API_URL_PRODUCTION` (default `https://api.quezby.com`) | `production` — `.env.production.example` |

## Switching

```bash
pnpm switch-local        # or switch-staging, switch-production
pnpm ios                 # or pnpm android
```

`scripts/switch-env.mjs` sets `QUEZBY_ENV` in `apps/mobile/.env` (made from
`.env.example` the first time) and writes
`apps/mobile/ios/Config/Environment.generated.xcconfig` from it (git-ignored),
then says what the build will be: the API, whether Google sign-in and the
Android device check are configured, and whether Metro must be restarted.

Every part reads the same file:

- **JavaScript** — `react-native-dotenv` inlines `.env` (`babel.config.js`);
  `src/config/environment.ts` turns `QUEZBY_ENV` into `local | staging |
  production` (anything else is `local`, never production by accident) and
  `src/config/env.ts` picks that environment's API origin. Metro keys its cache
  on `.env` (`metro.config.js`): after a switch, restarting Metro is enough.
- **iOS** — the project-level configurations are based on
  `ios/Config/Environment.xcconfig` (committed defaults = local), which
  includes the generated file: `QUEZBY_ENV` (→ Info.plist
  `QuezbyEnvironment`), `QUEZBY_DISPLAY_NAME` (→ `CFBundleDisplayName`) and
  `GOOGLE_IOS_URL_SCHEME`. `pnpm ios` rewrites it from `.env` before building,
  and the target's first build phase, **Check environment**, stops an Xcode
  build when `.env` changed after it was written.
- **Android** — `android/app/build.gradle` reads `QUEZBY_ENV` from `.env`
  itself: `app_name` and `BuildConfig.QUEZBY_ENV`.

Edit the rest of `.env` (URLs, Google ids) by hand, then run the switch again so
iOS picks up a new Google iOS client id. Keep every environment in the one
`.env`: react-native-dotenv would merge a `.env.local`, `.env.development` or
`.env.production` over it, so `babel.config.js` refuses to bundle while one
exists. Tests never read `.env` — Jest maps `@env` to
`src/types/env.mock.ts`, a local build with nothing optional set up.

All three API origins are public and ship in every bundle; nothing secret
lives in `apps/mobile/.env`.

A local Debug build on a phone or the Android emulator cannot reach
`localhost` — that is the device. `localApiUrl()` swaps `localhost` for the
host Metro served the bundle from (or `10.0.2.2` on the Android emulator), so
`pnpm dev:api` on the Mac is reachable without editing `.env`.

## Builds and stores

The build configuration and the environment are independent: Debug and
Release are the only configurations, and either can talk to any API.

| Platform | Run on a simulator / device | Store build |
| --- | --- | --- |
| iOS | `pnpm ios` (Debug) | switch, then Xcode → scheme **Quezby** → Product → Archive (Release) |
| Android | `pnpm android` (debug) | switch, then `cd apps/mobile/android && ./gradlew bundleRelease` |

There is one app in App Store Connect and one in Google Play. Staging builds
go to TestFlight / Play internal testing, production builds to the stores —
"Quezby Staging" on the home screen tells them apart. They share one build
number sequence, so every upload needs a higher build number (iOS
`CURRENT_PROJECT_VERSION`, Android `versionCode`) than any before it.

A release build is signed with the Google Play upload key when
`~/.gradle/gradle.properties` names it (`QUEZBY_UPLOAD_STORE_FILE`,
`QUEZBY_UPLOAD_STORE_PASSWORD`, `QUEZBY_UPLOAD_KEY_ALIAS`,
`QUEZBY_UPLOAD_KEY_PASSWORD`); without it, with the debug keystore — it
installs on a phone, Google Play refuses it. Making the key:
`docs/development/device-integrity-setup.md`. Never commit it.

## The API

`apps/api/.env.example` is local development (SQLite, debug on).
`.env.staging.example` and `.env.production.example` are the hosting
templates (MySQL, debug off); the API refuses to boot with `APP_DEBUG=true`
outside local. Copy one to `apps/api/.env.staging` / `.env.production`
(git-ignored), fill it in, and `pnpm api:package:staging` builds a zip ready
to upload — see `docs/deployment/shared-hosting.md`.

The API accepts `com.kubisimsek.game.quezby` wherever it checks which app it is
talking to (`APPLE_BUNDLE_IDS`, `PLAY_INTEGRITY_PACKAGES`); both stay empty
unless another app joins.

## Sign in with Apple and Google

The app ships the code for both; the consoles are set up once, for the one app.

- **Apple** — the iOS target has `Quezby/Quezby.entitlements`
  (`com.apple.developer.applesignin`) in both configurations. Enable
  "Sign in with Apple" on the App ID, set your `DEVELOPMENT_TEAM` in Xcode, and
  create one Sign in with Apple key (`.p8`). Only for revoking Apple's grant
  when an account is deleted, the API needs `APPLE_TEAM_ID`, `APPLE_KEY_ID`
  and `APPLE_PRIVATE_KEY_PATH` (the `.p8` under `storage/app/private`, never in
  git). Apple sign-in is iOS only.
- **Google** — in Google Cloud: the OAuth consent screen, one **Web** client
  (the token audience the API checks), one **iOS** client for
  `com.kubisimsek.game.quezby`, and one **Android** client per signing key, each
  for `com.kubisimsek.game.quezby` with that key's SHA-1: the debug keystore
  (`keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android`),
  the upload key, and Play App Signing's (Play Console → App integrity). Put
  the public ids in `apps/mobile/.env` (`GOOGLE_WEB_CLIENT_ID`,
  `GOOGLE_IOS_CLIENT_ID`) and run the switch again — it turns the iOS client id
  into the app's URL scheme — and put the web and iOS ids in the API's
  `GOOGLE_CLIENT_IDS` in every environment. Without them the Google button is
  simply not shown.
- The store listings must declare email and user id (App Store privacy label,
  Play Data safety).

## Device integrity (Play Integrity, App Attest)

Ranked runs need the phone to vouch for itself (see `docs/product/scoring.md`
→ "Hile koruması"); `docs/development/device-integrity-setup.md` walks through
the console setup step by step. The API decides per environment how much a
verdict counts: `QUEZBY_INTEGRITY_MODE` — `log` locally and on staging
(verdicts are recorded, nothing changes), `enforce` in production (a failing
device's runs never rank; an unverifiable one ranks but its top scores wait
for review).

- **Android — Google Play Integrity API.** In Google Cloud: a project (its
  **project number** is public) with the Play Integrity API enabled and linked
  to the app in Play Console (App integrity → Play Integrity API), and a service
  account with a JSON key. The app needs the project number in
  `apps/mobile/.env` (`GOOGLE_CLOUD_PROJECT_NUMBER` — one for the app, whatever
  the environment; empty → the Android check is skipped). The API needs the
  JSON key's path in `GOOGLE_PLAY_INTEGRITY_CREDENTIALS` (under
  `storage/app/private`, never in git). Only a build installed from Google Play
  (internal testing counts) is "Play recognized"; a build from Android Studio
  or `pnpm android` fails that part, which is why local and staging run in
  `log` mode — and why such a build pointed at production never ranks.
- **iOS — App Attest.** The target's entitlement
  `com.apple.developer.devicecheck.appattest-environment` reads the
  `APP_ATTEST_ENVIRONMENT` build setting: `development` for Debug,
  `production` for Release (TestFlight and the App Store always use
  production). Enable the App Attest capability on the App ID. The API checks
  attestations against Apple's root CA (committed at
  `apps/api/resources/certs/`), `APPLE_TEAM_ID` + the bundle id, and the
  environments in `APP_ATTEST_ENVIRONMENTS` (`production` in production;
  `development,production` locally and on staging) — so a Debug build pointed
  at production never ranks either. App Attest does not run in the iOS
  Simulator — there a device simply stays unverified.

## Outside the repo

- Apple Developer: one App ID, `com.kubisimsek.game.quezby`, with
  "Sign in with Apple" and "App Attest"; one app in App Store Connect.
- Google Cloud: the OAuth clients above; the Play Integrity API and its
  service account.
- Google Play: one app, `com.kubisimsek.game.quezby`.
- DNS: `staging-api.quezby.com` and `api.quezby.com` (or whatever you set in
  `apps/mobile/.env`) pointing at the hosting, each with HTTPS.
