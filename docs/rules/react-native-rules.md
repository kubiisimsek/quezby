# React Native Rules

- Apply to `apps/mobile`. This is **bare React Native 0.86**, not Expo. Never
  add `expo`, `expo-*` or EAS tooling; pick a bare-RN library instead.
- `ios/` and `android/` are committed source. Never regenerate, delete or
  gitignore them; edit native config deliberately and review the diff.
- After any native dependency change: `pnpm pods` for iOS and a full rebuild.
  Metro reload does not apply native changes.
- One app id, `com.kubisimsek.game.quezby`, on both platforms — never a suffix, a
  flavor or a per-environment configuration. The environment is `QUEZBY_ENV`
  in `apps/mobile/.env`, changed only with `pnpm switch-local | switch-staging
  | switch-production` (they also write the iOS settings). `apps/mobile/.env`
  ships inside the bundle — public values only, read in exactly one place,
  `src/config/env.ts`, each with a fallback. No `.env.local` /
  `.env.production` next to it; tests read `src/types/env.mock.ts`.
- `StyleSheet.create` for layout. A theme colour may be passed inline in a
  style array; a static size or spacing may not.
- Never `textTransform: 'uppercase'`.
- **Every word a player sees comes from the catalogs** (`src/i18n/messages/`,
  the six languages side by side; `docs/design/ui-writing.md`): `const t =
  useT()` in the component, `t.<area>.<line>`. No text literal in a screen,
  kit piece or hook — ESLint refuses JSX text, copy props (`label`, `title`,
  `subtitle`, `body`, `hint`, `placeholder`, `message`, `accessibilityLabel`)
  and Turkish letters outside `src/i18n`. Numbers, times and lists through
  `t.fmt`, a player's name through `handle(name)` (never `` `@${name}` ``).
  Keep codes in state and words out of it, so a language picked mid-screen
  shows at once.
- **The language** is `useLanguage` (`src/i18n/language.ts`): the phone's own
  language on a first launch (English when it is none of the six), then the
  one picked in Ayarlar or taken from the account at sign-in;
  `useLanguageSync` writes it to the account (`PUT /me/locale`) and every
  request asks the API for it (`Accept-Language`). Arabic reads right to left
  (`I18nManager`): choosing it, or leaving it, reloads the app
  (`react-native-restart`), guarded against reloading twice.
- **Right to left is automatic, except where it is not.** React Native mirrors
  rows, margins, paddings and `left`/`right` in Arabic by itself — use them
  freely. A transform, an SVG path or a glyph that points somewhere does not
  turn: flip it with `IS_RTL` (`src/i18n/native.ts`) or add the glyph to
  `MIRRORED` in `src/ui/icons.tsx`. No line of copy names a side.
- UI components are presentation-only. Rules live in `@quezby/engine`
  (the game), `@quezby/config` (usernames) and the API (everything else).
- The game's outcome is **only** what `Run.apply` returns. The screen's
  timers decide when to ask the engine, never what happened.
- Usage analytics goes through `track(event)` / `trackScreen(route)`
  (`src/analytics/track.ts`) and nothing else: they only change the visit on
  the phone — never a request per event — and do nothing before the player's
  yes. A new moment is a code added to `@quezby/config`'s closed catalog (and
  the API's enum), never free text or a property. `docs/product/analytics.md`.
- Network calls go through `@/api/client` (the `@quezby/sdk` instance), never
  a screen-level `fetch`. Server state is `@tanstack/react-query`; session and
  settings are Zustand stores.
- The keychain (`react-native-keychain`) holds the token and nothing else,
  filed under the install id and `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` (never
  in a backup). Everything else — the install id, the App Attest key id,
  settings, onboarding — lives in AsyncStorage, which goes with the app. iOS
  keeps the keychain after the app is deleted: a new install (no install id
  on disk) clears it before anything reads it, and a token filed under
  another install is never used (`src/auth/session.ts`). A reinstall starts
  signed out.
- Device integrity is native: `QuezbyIntegrity` (Kotlin, Play Integrity standard
  API; Objective-C, App Attest) behind `src/lib/integrity.ts`, which degrades to
  "unavailable" when the module or support is missing. The app only carries the
  proof; the API decides. App Attest does not run in the Simulator.
- Push is Firebase Cloud Messaging (`@react-native-firebase/messaging`) behind
  `src/lib/push.ts` — the only thing the app uses Firebase for. A build without
  Firebase's app files (`GoogleService-Info.plist`, `google-services.json`,
  git-ignored like `.env`) answers "unavailable" and does nothing. The
  permission is asked only when the player taps for it — the onboarding step,
  a `PushNudge`, Ayarlar → Bildirimler — and Firebase makes no token before
  a yes (`firebase.json`). What a notification says is the API's.
- Every screen is built from `src/ui/kit.tsx` and `src/ui/sheet.tsx`
  (see `docs/design/mobile-design-system.md`). A missing shape goes into the
  kit, not into a screen.
- Animation is `react-native-reanimated` v4 only. Anything a finger drives is
  a spring; anything the app drives is a timing curve (`src/ui/motion.ts`).
- The `@/…` alias lives in `tsconfig.json`, `jest.config.js` and
  `metro.config.js` (`resolveRequest`). Change one, change all three.
- Strict TypeScript, no `any`. No narration comments; a short doc comment only
  where a contract is not obvious.

## Quezby looks like a game ("Arena")

The owner judges every screen as a game. These are the rules that keep it one
(`docs/design/design-language.md` explains them):

- **No app chrome.** No navigation bars: every navigator uses
  `headerShown: false`, and a screen that needs a head draws `TopBar` (or its
  own stage). No iOS chevron rows (a `Row` that opens something ends in
  `ArrowNub`), no platform `Switch` (use `SwitchRow` / `Toggle`), no system
  segmented control (use `Segmented`).
- **The arena behind everything.** Screens stand on `Screen` / `Arena`; lists
  on them stay transparent. No white or grey canvases, and never
  `theme.canvas` or `theme.brandFrom` as a list background. The app has one
  look and does not follow the phone's light/dark setting.
- **Tiles and slabs.** Surfaces are `Panel` / `Card` / `LobbyCard` tiles
  (outline + lip); anything pressable that is not a row is a slab (`Button`,
  `IconButton`, `Slab`). **One gold `play` button per screen** — the action
  that starts a game. Magenta and violet do everything else; red takes
  something away.
- **Type.** Titles, numbers and button labels are Rubik through `Txt`
  (`hero`, `display`, `title`, `score`) or `embossed()`; body text is Nunito
  (Cairo in Arabic, chosen by `FONT` — never name a face in a screen).
  Capitals only for ribbons and tile names (`TYPE.label`), typed in capitals
  in each language's line (the Turkish **İ**, German **SS**) — never
  `textTransform`. A letter-spacing or a line height outside `TYPE` goes
  through `tracking()` / `lh()`, so Arabic stays joined and uncut.
- **Fonts carry the six languages.** A Latin face is allowed only if it has
  every letter of Turkish, German, French and Spanish (ğ Ğ ş Ş ı İ ç Ç ö Ö ü
  Ü ä ß é è ê à â œ ñ á í ó ú ¿ ¡ « ») and draws a lower-case i with its dot
  (Lilita One, Fredoka, Titan One, Luckiest Guy and other caps-only faces
  fail); Arabic is Cairo. A new weight goes into `assets/fonts`,
  `Info.plist` `UIAppFonts`, the Xcode project's resources and
  `android/app/src/main/assets/fonts`, then a native rebuild.
- **Colour is a job.** Gold: play, records, your rank numbers. Magenta: brand,
  you, likes. Violet: quiet. Cyan (`accent`): time only. Green / red: good /
  bad, never alone — with a glyph or a word. Roles only, `withAlpha` for
  opacity, no hex.
- **Juice plays once and respects reduced motion.** `Stamp`, `CountUp`,
  `Confetti`, `useShake`, `useEntrance` stand down under
  `useReducedMotion()`. The only loops: a playing reel and the lobby's
  `PlayButton`.

