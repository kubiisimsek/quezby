---
name: mobile-feature
description: Work on apps/mobile — bare React Native 0.86 with committed ios/ and android/ folders and three environments. Use when adding a screen, touching the game screen, adding a native dependency, changing env values, or when a mobile build fails.
---

# Mobile (bare React Native)

`apps/mobile` is **bare React Native**, not Expo. `ios/` and `android/` are
committed source and are edited by hand.

Read first: `docs/design/design-language.md`, `docs/design/mobile-design-system.md`,
`docs/rules/react-native-rules.md`, `docs/development/environments.md`.

## Structure

```
src/
  App.tsx            providers + RootNavigator
  navigation/        RootNavigator (gates), TabBar, options, types
  screens/           one folder per screen, composition only
  game/              useGame (engine + clock + touches), gesture (pure), ReelCard, Hud, FeedbackLayer, ResultView, content
  components/        shared presentational pieces (UsernameField)
  hooks/             useMe, useAppStatus, useUsernameCheck
  api/client.ts      the @quezby/sdk instance — every network call
  auth/session.ts    token (keychain) + user + ranks (zustand)
  stores/            settings (zustand + AsyncStorage)
  config/            env.ts (the only @env reader), environment.ts (bundle id → env)
  ui/                tokens (generated), theme, motion, kit, sheet, icons, brand-mark
```

## Non-negotiable

- Never install `expo`, `expo-*`, or EAS tooling.
- Never delete, regenerate, or gitignore `ios/` / `android/` to get past a build failure.
- Node ≥ 22.11. Xcode needs `ios/.xcode.env.local` with `NODE_BINARY` and `NODE_PATH`
  (pnpm's `node_modules/.pnpm/node_modules`) — see `docs/development/local-development.md`.
- The game's outcome is only what `Run.apply` returns; timers only decide when to ask.
- Screens use the kit. A new shape goes into `src/ui/kit.tsx` and the design doc.
- Quezby looks like a game ("Arena"): the arena behind every screen, tiles with
  an outline and a lip, `Slab` buttons (gold `play` starts a game — one per
  screen), Rubik for display text on a hard shadow, no navigation bars (`TopBar`),
  the dock at the bottom. No white canvases, no iOS chevron rows.
- Fonts are native assets: a new weight goes in `assets/fonts`, `Info.plist`
  `UIAppFonts`, the Xcode project's resources and `android/app/src/main/assets/fonts`,
  then a native rebuild. Only faces with every Turkish letter (ğ ş ı İ).

## Adding a native dependency

```bash
pnpm --filter @quezby/mobile add <pkg>
pnpm pods
pnpm ios        # full rebuild
```

## Environments

Bundle ids `com.kubisimsek.game.quezby.local` / `.staging` / bare. iOS schemes
`Quezby` (Debug = local, Release = production) and `Quezby Staging`; Android
flavors `local`, `staging`, `prod`. `src/config/environment.ts` maps the bundle
id to the environment; `.env` only holds the three public API origins.

## Verify

```bash
pnpm --filter @quezby/mobile lint
pnpm --filter @quezby/mobile typecheck
pnpm --filter @quezby/mobile test
```

Native builds are not covered by tests — run it on a simulator before claiming
a native change works.
