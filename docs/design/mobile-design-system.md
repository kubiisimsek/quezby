# Quezby Mobile — Design System

**Parent:** [design-language.md](./design-language.md)
**Code:** `apps/mobile/src/ui/`, `apps/mobile/src/navigation/`, `apps/mobile/src/game/`
**Rules:** [../rules/react-native-rules.md](../rules/react-native-rules.md)

> Read this before writing any screen. Every component below already exists;
> building a card, a button, a form row or a sheet by hand is the one way the
> app's look falls apart.

## Surfaces

```
navigation/
  RootNavigator.tsx  update required → splash → Welcome/Login → a new account's first
                     steps (Tutorial → Username → Protect) → Username (an old account
                     with no name) → Tabs (Zirve · Lig · Oyna · Arkadaşlar · Profil)
                     + Game, Help, Daily. `gate.ts` decides which, from the session and
                     `stores/onboarding` (the steps, kept on the phone per account).
                     No navigation bars anywhere (`headerShown: false`); a screen that
                     needs a head draws `TopBar`
  TabBar.tsx         the dock: five slots on a dark slab, the lobby in the middle as a gold
                     play slab standing out of it; the slot you are on lifts into a magenta tile
  options.tsx        stack options (no header, night behind transitions), tab(), nav theme
  types.ts           one param list per navigator; Game takes { mode: 'free' | 'daily' };
                     Tutorial is the same GameScreen, as a new player's practice run;
                     `Search` is a tab — from a stack screen: navigate('Tabs', { screen: 'Search' })
screens/
  welcome/           the arena, the mark stamped in, "Quezby" in Rubik, the four moves as gems,
                     one gold "Oyna" (a guest account, then the practice run) and "Hesabım var,
                     giriş yap"
  auth/              Login (TopBar "Tekrar hoş geldin") — Apple / Google, then "ya da e-postayla"
  username/          after the practice run "Sana ne diyelim?" — the field in a tile, magenta
                     "Kaydet", ghost "Şimdilik geç" (the account keeps `guest48128742`); for an
                     old account with no name, the one question before the game, gold "Devam"
  onboarding/        Protect — "Hesabını koru" after the name: Apple / Google, "E-postayla
                     koru", ghost "Şimdi değil"; a kept account says so before "Devam et", and
                     an Apple / Google account that is another player's can be switched to
  home/              the lobby: a status strip (framed portrait with the league emblem, Yardım);
                     "Günün akışı" on a stage with a fan of the four reels and its countdown (your
                     score in gold, place and Paylaş once played); the big breathing gold play slab;
                     the league tile with its progress bar ("KİLİTLİ · Lige 2 oyun kaldı" before a
                     new player's first 3 counted runs), the rival as a VS face-off, records;
                     a guest just seated in a league is asked once to keep the account
                     (SignInWaysSheet, "Ligdesin!");
                     a warn tile up top while the API keeps this phone's runs off the boards
                     (a failed Play Integrity / App Attest check, `enforced` only)
  leaderboard/       Zirve — a stage with TopBar (countdown, players, search), Herkes / Arkadaşlar,
                     the podium on 3D metal pedestals (crown and a spotlight for #1), the period
                     tabs, the climb as tiles with "▲ fark", your floor pinned with a gold "Geç onu"
  league/            the week's league: "HAFTALIK LİG", your tier's emblem big between the tiers
                     below and above, TERFİ / DÜŞME BÖLGESİ banners over their rows, last week's
                     result (confetti on a promotion), your floor pinned; before a new
                     player's first 3 counted runs, "Lige N oyun kaldı" with a gold "Oyna"
  daily/             Günün akışı: TopBar with a back slab, "AKIŞ #17", your score and place in a
                     well with the share grid, then "GÜNÜN ZİRVESİ" — its podium and climb
  profile/           a player card (framed portrait, tier, season best in gold, place on each
                     board), a "Hesabını koru" tile for guests, İstatistikler (stat tiles, named
                     combos, most-liked posts as little reels); the gear opens Ayarlar
                     (SettingsSheet): Titreşim, Yardım and the account doors — username,
                     "Hesabını koru" / "Giriş yolları" (SignInWaysSheet), e-posta, çıkış, silme.
                     Each door opens only after Ayarlar has left the screen (`onClosed`)
  help/              Yardım (TopBar with a back slab) — the rules, from `game/howTo` and the
                     engine's `RULES`: reels in their feed colours, the dopamine bar, points and
                     combos, the daily, leagues, boards, fair play, account, Sık sorulanlar
  search/            Arkadaşlar — a dock tab: search by the start of a name, follow from the
                     tile, who you follow / who follows you, a player's card (PlayerSheet)
  game/GameScreen    the game — a root screen over the tabs, no swipe-back; as `Tutorial`, a
                     new player's practice run: a CoachCard before each kind's first post,
                     closing always ends in its result, which leads on to the name
game/
  useGame.ts         engine + clock + touches → what the screen draws; starts the run
                     with the engine and content versions, keeps an unsent finish; a practice
                     run (`offline`, `outdated`, `tutorial`) stays on the phone — the coached
                     one waits under each card (phase `coach`) and starts the post's clock
                     only when it is put away
  gesture.ts         raw touches → swipe / like / hold / touch (pure, tested)
  ReelCard.tsx       one reel, full screen
  Hud.tsx            a close slab · the chunky dopamine meter (notched, labelled) · the score in
                     Rubik · level and a gold combo pill (x1,00–x1,50) on their own row
  FeedbackLayer.tsx  points rising in Rubik, heart burst, a miss slammed on a red slab and shaken,
                     named combos stamped in as tilted gold ribbons
  ResultView.tsx     the run's end, drawn only from the API's answer: a stage with the score
                     slammed in and counting up ("YENİ REKOR!" banner and confetti on a record),
                     then bonuses stamped in, stat tiles, rank tiles (▲/▼), who you passed, the
                     league, the daily's grid — about 100 ms apart; the buttons slide up last in a
                     tray; a tap skips to the end; review, flagged and practice states, and
                     "Bu cihazda skorlar sıralamaya girmiyor" when `flagReason` is `device`;
                     "Lige N oyun kaldı" while the league is locked; the practice run as
                     "DENEME TURU" with the kinds it never reached, magenta "Devam et" and
                     "Bir daha dene"
  howTo.ts           the one source of rule copy: reels (and the move each coach card acts
                     out), bonuses, their order
  content.ts         what a reel looks like — the post the catalog picks for seed + index
components/          screen-sized pieces shared between screens (below)
```

**The game is a root-stack screen**, never a tab: the bar would sit under the
feed and a swipe-back would end a run by accident. Its only exits are the
close button (which ends and scores the run) and leaving the app (same).

**The phone draws, the server decides.** Once a run ends, every number on
screen — score, stats, ranks, gaps, the league, the share text, the time left
on a board (`endsAt` against `serverTime`) — comes from an API answer. A
screen never computes a rank, a gap or a countdown from its own clock.

## Tokens

`src/ui/tokens.ts` is **generated** (`pnpm tokens`) — never edit it. It holds
the one `arena` palette and the fixed groups `reel` and `marks`.
`src/ui/theme.ts` returns it from `useTheme()` (and as `THEME` outside a
component) with the app's scales: `FONT` (Rubik display, Nunito body),
`TYPE` (+ `score`, `label`), `EMBOSSED` and `embossed(size)` for the hard
shadow under display text, `SPACE`, `RADIUS`, `DEPTH` (outline, lip),
`CONTROL`, `shadow(theme, level)` for what floats, and
`withAlpha(role, opacity)`.

Fonts are static Latin subsets in `assets/fonts` (Rubik Black/ExtraBold,
Nunito SemiBold/Bold/ExtraBold/Black), linked in `ios/Quezby/Info.plist`
(`UIAppFonts`), the Xcode project's resources, and
`android/app/src/main/assets/fonts`. Adding a weight means all three and a
native rebuild. The logo's images (icons, store art, `BrandMark`, the launch
tile) come from `design/make-brand.py` — see design-language.md → "The mark".

## Motion — `ui/motion.ts`

`SPRING` · `SPRING_PRESS` · `SPRING_POP` · `FADE` / `FADE_OUT` ·
`stagger(index)` · `useEntrance(index)` · `usePressScale()`. Juice lives in
the kit (`ui/kit/juice.tsx`): `Stamp`, `CountUp`, `Confetti`, `useShake` —
each plays once and stands down under reduced motion.

## The kit — `ui/kit.tsx`

One import for every screen: `@/ui/kit`. The pieces live a family per file in
`ui/kit/` (`text`, `surfaces`, `slab`, `topbar`, `identity`, `buttons`, `rows`,
`status`, `fields`, `loading`, `segmented`, `meter`, `badges`, `countdown`,
`podium`, `climb`, `result`, `lobby`, `coach`, `juice`); `ui/kit.tsx` re-exports them.
A new shape goes into the family it belongs to and into that list.

| Component | Role |
| --- | --- |
| `Txt` | **Every string** outside a reel: `variant` × `tone`; the Rubik roles stand on a hard shadow (`flat` removes it) |
| `Eyebrow` | A section's head: gold glyph, Rubik title, a groove to the edge |
| `Ribbon` | A dark strip with a gold capital label — "GÜNÜN AKIŞI" (typed in capitals) |
| `Screen` / `Arena` | The night arena every screen stands on / the arena alone, for a screen that lays out its own scroll |
| `TopBar` | A screen's head on the arena: title in Rubik, `subtitle`, a back slab (`onBack`), one action (`right`) |
| `Panel` / `Card` | A tile (outline, lip, lit edge) / a pressable tile that sinks and staggers in; `tone` `primary` (yours) / `sunken` (a well) |
| `BrandBand` | The stage — magenta into violet with lanes, for a hero |
| `Gradient` | A two-colour SVG wash |
| `Slab` | Anything pressable that is not a row: face on a lip in the outline, gloss on top; sinks under the thumb |
| `Button` | A slab with a Rubik label. `play` (gold — starts a game, one per screen) / `primary` (magenta) / `secondary` (violet) / `neutral` (tile) / `ghost` (text) / `danger` (red) / `onBrand` (gold on a stage) / `onBrandSoft` (violet on a stage); `sm/md/lg/xl`; `icon`; `loading`; the label shrinks to fit |
| `IconButton` | A square glyph slab: `neutral` on the arena, `onBrand` on a stage; `label` is read aloud; `badge` counts what is new |
| `SocialButton` | "Apple ile devam et" / "Google ile devam et", flat as each company asks, a large `Button`'s height and corners |
| `Divider`, `Avatar`, `IconChip` | A groove; a player's framed portrait (initials in Rubik, `primary` = you); a gem — a glyph on a bright outlined tile |
| `Row`, `ArrowNub`, `SwitchRow`, `Toggle` | A line that opens something (ends in a small arrow slab) / that arrow / a setting with the game's toggle (green groove, springing knob, role `switch`) |
| `PlayerRow` | A player in a list: portrait, @name, league, season best — and one action (follow) beside it, a separate target from the row that opens their card |
| `Tag`, `Callout`, `Stat`, `StatRow`, `Meter` | A status pill; a message with a gem (copy built from pieces is set in its text); a stat tile (gem, label, Rubik number); a chunky bar with a shine |
| `StatGrid` | Stat tiles in 2 or 3 even columns |
| `Field`, `PasswordField` | A dark well with a label, glyph and trailing control; the ring lights magenta while you type |
| `Segmented` | A tab strip: the chosen view raised as a magenta slab out of a dark groove |
| `Loading`, `Skeleton`, `SkeletonList`, `EmptyState` | Waiting (gold spinner, dark skeleton tiles) and nothing-yet (a gem, a title, the fix) |
| `MedalBadge` | A coin in its metal on its rim — a crown for first, a medal for the others; `sm/md/lg` |
| `TierBadge` | A league emblem in the tier's metal, outlined, its mark cut in; `showLabel`; `sm/md/lg/xl` |
| `CountdownChip` | Time left, in cyan on a dark pill, counted on the server's clock (`endsAt` + `serverTime`) |
| `Podium` | A board's top three on 3D pedestals in their metals, with portraits and coins, a crown dropping on #1; 2-1-3; rises once |
| `Spotlight` | Rays of light behind a winner or a tier's emblem, drawn once in the colour given |
| `ClimbRow` | A board row from #4 down as a tile: rank, portrait, name, score and "▲ 1.240" to pass the row above; yours in magenta; `detail` ("3 gün") |
| `FloorCard` | "Senin katın" — your floor pinned under a board: rank in gold, who to pass and how far, "Geç onu" |
| `BonusChip` | A named combo as a pill with its gem: Kusursuz seviye, Şimşek, Soğukkanlı, Geri dönüş, `×count`, `+points` |
| `ShareGrid` | The server's emoji share grid, one square to a cell |
| `LobbyCard` | A door in the lobby: a gem, its capital name over a Rubik title, live state on the right, an arrow slab when it opens something; sinks under the thumb |
| `PlayButton` | The lobby's gold play slab: breathes 1 → 1.04 → 1 (1.6 s each way) with a glint crossing it — the only loop outside a reel; `breathing` pauses it, reduced motion never starts it |
| `RankChips` | Your place on each board in gold, one well per board; "—" where you have not placed |
| `CoachCard` | A new kind of post, before it starts: "YENİ POST · 2/4", its gem, a hand acting the move out (swipe, double-tap, hold into the green zone, keep still — twice, then still), its name and line, the gold "Anladım" that starts the post |
| `Stamp`, `CountUp`, `Confetti`, `useShake` | Juice: slam a value in; count a number up (the final value is its accessibility label); a burst of confetti on a key; a small shake |

Overlays are `ui/sheet.tsx`: `Sheet` (a dark tile rising from the bottom, a
Rubik title, a red close slab), `FormSheet` (the profile's username, email and
delete flows), `ActionSheet` (tile rows with arrow slabs). Never a `Modal` with
`animationType="slide"`. One sheet never opens over another that is still
leaving: the next one waits for `onClosed` (the profile's "E-postayla koru"
does exactly this). Apple's and Google's own sign-in sheets may open over a
sheet — they are the system's, not ours.

Icons are `ui/icons.tsx` — our own 24×24 stroke set, game glyphs included
(`trophy`, `crown`, `medal`, `flame`, `heart`, `bolt`, `arrowUp`, `hand`,
`handStop`, `vibrate`, `podium`, `mountain`, `trendUp`, `trendDown`,
`target`), people (`users`, `userPlus`, `userCheck`), time (`calendar`,
`hourglass`, `clock`) and affordances (`help`, `search`, `grid`, …). `apple`
is the one filled glyph: Apple's logo is solid in every colour it comes in.
**Add a glyph there rather than importing a set.** Logos live in
`ui/brand-mark.tsx`: our `BrandMark` (the app icon as an Arena tile, a bitmap
from `design/make-brand.py`) and Google's four-colour `GoogleMark`, neither of
which takes a tint.

`components/` holds the screen-sized pieces more than one screen uses:

| Component | Role |
| --- | --- |
| `UsernameField` | The username input everywhere: lower case as typed, the rules ticking off under it, availability in the trailing slot |
| `PlayerSheet` | A player's card from any row: portrait, tier, season best in gold, weekly and all-time place, a few lifetime counts, followers, "Takip et" / "Takibi bırak" |
| `PlayerCard` | `Portrait` (the 72/92pt framed portrait of a profile) and `SeasonBest` (the gold record well) |
| `SignInWaysSheet` | "Hesabını koru" for a guest, "Giriş yolları" once kept: the attached ways (Apple / Google with "Bağı kaldır" — the API keeps the last one), `SocialButton`s for the rest, and "E-postayla koru", which hands over to the email `FormSheet`; `description` says why when it comes up on its own |
| `CredentialsSheet` | The email and password `FormSheet` — a guest's "Hesabı koru", or one more way in; opened from the profile, the Protect step and the lobby's reminder |
| `ScopeSwitch` | Herkes / Arkadaşlar — a dark well with a magenta slab that springs to the side that is on |
| `SummitBoard` | `layoutBoard()` — which entries stand on the podium, which climb, where the break before your own rows goes — and the podium stage that holds its place while a board loads |
| `BoardStage` | The magenta stage a board stands on (`BoardStage`), the players pill, and `useArrival` |
| `FriendsEmpty` | A friends board with only you, as a tile of empty seats: follow nobody → "Oyuncu ara"; friends have not played → "Oyna" |
| `FloorDock` | Holds `FloorCard` above the dock on a dark shelf, rises in once and reports its height so the list leaves room |

Data comes through hooks (`hooks/useBoards.ts`: boards, the daily, the
league, stats, players, following, search; `useMe`, `useSocialAuth`,
`usePendingRunSender`) over `@/api/client` — never a `fetch` in a screen.

## Inside a reel

A reel is content: it draws with `reel.*` colours and `TYPE` roles directly
(`ReelCard`, `Hud`, `FeedbackLayer`), not with `Txt` tones, because it must
look the same in both themes. Everything around the feed — result, home,
profile — goes back to the kit.

## Voice

See [ui-writing.md](./ui-writing.md). Short, warm, a little cheeky inside the
game ("Takıldın!", "Yakalandın!", "Dopamin bitti"); plain and exact around
accounts and errors.
