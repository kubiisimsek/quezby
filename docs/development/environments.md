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

## The admin panel

`apps/admin` is built per environment, not switched: its API origin is fixed
at build time from `apps/admin/deploy/environments.mjs`.

| Environment | Build | Panel | API |
| --- | --- | --- | --- |
| local | `pnpm dev:admin` (Vite, `:5180`) | `http://localhost:5180` | `/api` proxied to `http://localhost:8000` — same origin, no CORS |
| staging | `pnpm admin:package:staging` | `https://staging-admin.quezby.com` | `https://staging-api.quezby.com` |
| production | `pnpm admin:package:production` | `https://admin.quezby.com` | `https://api.quezby.com` |

`VITE_API_ORIGIN` (`apps/admin/.env`, git-ignored; `.env.example`) points a
local panel at another API; it is the panel's only variable, and public — the
packaging script refuses any other `VITE_*`. On the API side the panel adds
`QUEZBY_ADMIN_TOKEN_HOURS` (12: how long a panel session lasts) to every
`.env*.example`. Admin accounts live in the API's database; the first owner
is made with `php artisan quezby:admin:create` or `POST /api/v1/ops/admins`
(`docs/deployment/shared-hosting.md`).

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
The version players see is one number on both (iOS `MARKETING_VERSION`,
Android `versionName`, `apps/mobile/package.json` — 1.0.0 today), and the
API holds it against `QUEZBY_IOS_MIN_VERSION` / `QUEZBY_ANDROID_MIN_VERSION`:
a build below the minimum opens on "Güncelleme gerekli" and goes no further.

A release build is signed with the Google Play upload key when
`~/.gradle/gradle.properties` names it (`QUEZBY_UPLOAD_STORE_FILE`,
`QUEZBY_UPLOAD_STORE_PASSWORD`, `QUEZBY_UPLOAD_KEY_ALIAS`,
`QUEZBY_UPLOAD_KEY_PASSWORD`); without it, with the debug keystore — it
installs on a phone, Google Play refuses it. Making the key:
`docs/development/device-integrity-setup.md`. Never commit it.

## The API

Usage analytics and the device registry (`QUEZBY_ANALYTICS_*`,
`QUEZBY_DEVICE_DAYS`) have the same defaults in every environment — what they
do and when to turn them: `docs/product/analytics.md`. So do Dereceli's
threshold (`QUEZBY_LEAGUE_UNLOCK_RUNS`, 20 counted Normal or Günlük runs;
`rating.unlock_runs`), how long a VS waits
for its answer (`QUEZBY_DUEL_EXPIRE_HOURS`, 48) and how long conversation
lines stay (`QUEZBY_INBOX_KEEP_DAYS`, 90). Push has three variables of its
own — *Push notifications* below.

Profile photos are re-encoded with PHP's **GD** extension, so every
environment needs it (without it an upload answers `500`; the admin panel's
Sistem page says "GD eksik"). They are kept in `storage/app/avatars` —
outside the web root, served by the API itself (`GET /api/v1/media/avatars/{file}`),
and never part of an update zip.

`apps/api/.env.example` is local development (SQLite, debug on).
`.env.staging.example` and `.env.production.example` are the hosting
templates (MySQL, debug off); the API refuses to boot with `APP_DEBUG=true`
when `APP_ENV` is `staging` or `production` — so a hosting `.env` that says
`APP_ENV=local` skips that guard. Copy one to `apps/api/.env.staging` /
`.env.production` (git-ignored), fill it in, and `pnpm api:package:staging`
builds a zip ready to upload — see `docs/deployment/shared-hosting.md`. The
build refuses a file without a well-formed `APP_KEY`, with another `APP_ENV`
or with debug on (`scripts/check-api-env.mjs`).

`APP_KEY` is not optional anywhere: checkpoint receipts are signed with a key
derived from it and Apple's refresh tokens are encrypted with it. Without it
the API answers every player request `500` (`RequireAppKey`; the admin panel
and the ops routes stay open, and the panel's Sistem page says so in red).
Generate it once per environment and never change it — a new key turns the
receipts of runs in play into forgeries and leaves the stored Apple tokens
unreadable. The Pest suite carries its own key in `phpunit.xml`.

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
  git). With the key in place, every Apple sign-in trades Apple's one-time code
  for a refresh token and stores it encrypted — so it needs `APP_KEY`. Apple
  sign-in is iOS only.
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

## Push notifications (Firebase Cloud Messaging)

Friends' news — a request, a request accepted, a VS sent or ended, a phrase —
reaches the phone through Firebase Cloud Messaging.
`docs/development/push-setup.md` walks through the consoles step by step;
`docs/backend/api-contract.md` → *Push* says what is sent when.

- **One Firebase project for every environment.** The app has one id, so it
  carries one Firebase config: the owner's project, `quezby-staging`, serves
  local, staging and production alike. An FCM token belongs to the project
  whose config made it, so every API — production included — sends with
  `FIREBASE_PROJECT_ID=quezby-staging` and a service-account key from that
  project.
- **The app's two Firebase files are git-ignored**, downloaded from the
  Firebase console: `apps/mobile/ios/Quezby/GoogleService-Info.plist` and
  `apps/mobile/android/app/google-services.json`. Without them the app still
  builds, with no push: the Xcode build phase **Copy Firebase config** copies
  the plist into the app when it is there (and warns when it is not),
  `AppDelegate.swift` calls `FirebaseApp.configure()` only when the plist is
  bundled, and `android/app/build.gradle` applies the `google-services` plugin
  only when the json exists. The app then counts push as unavailable: no
  notifications step, and Ayarlar → Bildirimler says so.
- **No token before a yes.** `apps/mobile/firebase.json` turns messaging
  auto-init off: the app asks Firebase for a token only once the player
  allowed notifications, and hands it to the API (`PUT /me/push-token`);
  signing out takes it back and deletes it on the phone.
- **iOS** — `aps-environment` in `Quezby/Quezby.entitlements` reads the
  `APS_ENVIRONMENT` build setting: `development` for Debug, `production` for
  Release (TestFlight and the App Store always use production). The App ID
  needs Push Notifications, and Firebase an APNs key. The Podfile sets
  `$RNFirebaseDisableSPM = true` — Firebase comes as pods, since the app links
  its pods as static libraries, which Firebase's Swift packages do not
  support — and gives the Firebase pods `modular_headers`. Google stops
  publishing new Firebase versions to CocoaPods after October 2026
  ([Migrate from CocoaPods](https://firebase.google.com/docs/ios/cocoapods-deprecation)):
  the versions in `Podfile.lock` keep installing and working, but a newer
  Firebase will mean Swift Package Manager.
- **Android** — `POST_NOTIFICATIONS` (asked on Android 13 and later), the
  notification channel `social` created in `MainApplication.kt` and named in
  the phone's language (`res/values*/strings.xml`), the status-bar icon
  `@drawable/ic_stat_quezby` tinted `@color/notification`.
- **API** — `QUEZBY_PUSH_ENABLED` (true), `FIREBASE_PROJECT_ID`,
  `FIREBASE_CREDENTIALS` (the service account's JSON key, absolute or relative
  to the API's root: `storage/app/private/firebase-push.json`, never in git or
  a zip). Nothing is sent until all three are set; the admin panel's Sistem
  page says whether they are.
- **Trying it** — end to end on a real iPhone, or an Android emulator with
  Google Play; the iOS Simulator is not used for that. There,
  `xcrun simctl push` shows how a notification looks and where a tap leads
  (`push-setup.md` → *Deneme*).

## Outside the repo

- Apple Developer: one App ID, `com.kubisimsek.game.quezby`, with
  "Sign in with Apple", "App Attest" and "Push Notifications"; an APNs key;
  one app in App Store Connect.
- Google Cloud: the OAuth clients above; the Play Integrity API and its
  service account.
- Firebase: the project `quezby-staging` with the iOS and the Android app
  `com.kubisimsek.game.quezby`, the APNs key uploaded, the Firebase Cloud
  Messaging API (V1) on, and a service account with "Firebase Cloud Messaging
  API Admin".
- Google Play: one app, `com.kubisimsek.game.quezby`.
- DNS: `staging-api.quezby.com` and `api.quezby.com` (or whatever you set in
  `apps/mobile/.env`) pointing at the hosting, each with HTTPS.
