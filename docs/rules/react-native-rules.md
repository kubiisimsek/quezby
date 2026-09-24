# React Native Rules

- Apply to `apps/mobile`. This is **bare React Native 0.86**, not Expo. Never
  add `expo`, `expo-*` or EAS tooling; pick a bare-RN library instead.
- `ios/` and `android/` are committed source. Never regenerate, delete or
  gitignore them; edit native config deliberately and review the diff.
- After any native dependency change: `pnpm pods` for iOS and a full rebuild.
  Metro reload does not apply native changes.
- The environment comes from the native build (bundle id), never from `.env`.
  `apps/mobile/.env` ships inside the bundle — public values only, read in
  exactly one place, `src/config/env.ts`, each with a fallback.
- `StyleSheet.create` for layout. A theme colour may be passed inline in a
  style array; a static size or spacing may not.
- Never `textTransform: 'uppercase'`.
- UI components are presentation-only. Rules live in `@quezby/engine`
  (the game), `@quezby/config` (usernames) and the API (everything else).
- The game's outcome is **only** what `Run.apply` returns. The screen's
  timers decide when to ask the engine, never what happened.
- Network calls go through `@/api/client` (the `@quezby/sdk` instance), never
  a screen-level `fetch`. Server state is `@tanstack/react-query`; session and
  settings are Zustand stores.
- The token lives in the keychain (`react-native-keychain`), not AsyncStorage.
- Every screen is built from `src/ui/kit.tsx` and `src/ui/sheet.tsx`
  (see `docs/design/mobile-design-system.md`). A missing shape goes into the
  kit, not into a screen.
- Animation is `react-native-reanimated` v4 only. Anything a finger drives is
  a spring; anything the app drives is a timing curve (`src/ui/motion.ts`).
- The `@/…` alias lives in `tsconfig.json`, `jest.config.js` and
  `metro.config.js` (`resolveRequest`). Change one, change all three.
- Strict TypeScript, no `any`. No narration comments; a short doc comment only
  where a contract is not obvious.
