# Quezby "Arena" Design Language

**Status:** Source of truth for everything a Quezby player looks at
**Surface:** `apps/mobile` — the admin panel (`apps/admin`) is staff-only and
has its own language: `docs/design/admin-design-system.md`
**Authored in:** `apps/mobile/design/palette.mjs` → generated into
`apps/mobile/src/ui/tokens.ts` by `pnpm tokens`
**Replaces:** "Akış" (2026-09-24), which dressed an app's system — white
cards, iOS rows, native headers — in the brand's colours. Players read it as
an app. Arena is drawn the way games are.

Quezby is a game, so it looks like one: a night arena instead of a canvas,
slabs that sink under the thumb instead of flat buttons, tiles with an
outline and a lip instead of cards with a soft shadow, titles set in a heavy
face on a hard shadow, gold for the one thing that starts a game. The rules
below come from how the games players already know are built — Duolingo's
3D buttons, Clash Royale's and Brawl Stars' lobbies, docks and ladders — and
the research behind them is summarised at the end.

---

## One look, not two themes

The arena does not follow the phone's light/dark setting. A game has an art
direction, not a system theme; a violet night with saturated colour on what
can be tapped or won is what Quezby is. It also serves a dark-mode player
already. `useTheme()` always returns the arena; `theme.dark` is always true.

## Colour

### Roles, never values

`design/palette.mjs` authors every colour in OKLCH under role names, as one
flat `roles` object. **A component may only name a role.** A role at an
opacity is `withAlpha(role, opacity)` from `ui/theme.ts`, never a hex suffix.
Every other export of `palette.mjs` is a fixed group (`reel`, `marks`); hex
appears only in `marks`.

### The arena

| Role | Use |
| --- | --- |
| `night` → `nightDeep` | The arena's vertical ramp, top to bottom |
| `glow` · `glowAlt` | The magenta light from above, the violet bloom in the far corner |
| `tile` · `tileHi` · `tileLip` | A tile's face, its lit top edge, its side |
| `outline` | The near-black line round every tile, slab, gem and portrait — and the hard shadow under display text |
| `well` · `wellLine` | A see-through groove cut into a tile: inputs, tracks, rank wells |

`Arena` (inside every `Screen`) draws the ramp, both glows and faint diagonal
lanes across it, so the dark reads as a place. Nothing on it is white.

### Colour is a job

| Colour | Job |
| --- | --- |
| **Gold** `gold` · `goldHi` · `goldLip` · `goldInk` | The action that starts a game — **one per screen** — and what a player wins: records, their own rank numbers, the podium's first place. Dark `goldInk` on it, never white. |
| **Magenta** `primary*` | The brand, a like, you: the actions around a game ("Geç onu", "Paylaş"), your tile in a list, the chosen tab. |
| **Violet** `secondary*` | Everything quieter: a second choice, a stage, a gem that only labels. |
| **Cyan** `accent` | Time. Every countdown, nothing else. |
| **Green** `ok*` | Good: a hit, promotion, "on". |
| **Red** `bad*` | Bad: a miss, demotion, a door that takes something away. |

A colour never carries meaning alone — a status is a tag with a glyph, a
zone is a banner with an arrow and a word, a tier's emblem changes shape.

### Medals, tiers, sign-in

`medalGold/Silver/Bronze` each with `Soft`, `Ink` and `Lip` make the podium's
coins and pedestals. `tierBronze … tierDiamond` (+ `Soft`) draw the league
emblems, whose mark climbs with the tier (one chevron, two, a star, a spark, a
gem). `appleBg/Ink` and `googleBg/Ink/Line` are the two companies' dark-screen
buttons; the Google "G" keeps its colours in `marks`.

### The feed — `reel`

Reels are content, not chrome: fixed colours in their own group. Skip is a
rotating slate, like is pink, hold is gold, freeze is deep red; the kind must
read from colour and badge before any text. The HUD's dopamine meter runs
`meter` → `meterMid` → `meterLow` as it empties, always labelled "Dopamin".

A post's **format** — a chat, a poll, a receipt, a sign — draws with the
reel's props: white `glass` and a faint `pattern` that sit on any kind's
colour without changing it, and the few light things — `paper`, a `photo`
frame, a `sign`, a chat `bubble` — kept small against the reel. A format
never brings a colour of its own: a friend's photos are the like reel's own
pinks (`likeTiles`), a gold post's light is `holdRay`, a red post's tape is
`freezeAlarm` on `hazard`. However a post is dressed, its kind still reads
first.

---

## Type

**Rubik** for what is read at a glance, **Nunito** for what is read.

| Role | Face | Use |
| --- | --- | --- |
| `hero` 42 · `display` 28 · `title` 20 · `score` 40 | Rubik Black | Titles, numbers, a score. `Txt` sets them on a hard drop shadow in `outline` (2–3pt, no blur) — letters that stand on the tile. |
| `label` 12.5, letter-spaced | Rubik ExtraBold | A ribbon or a tile's name: "GÜNÜN AKIŞI", "TERFİ BÖLGESİ". |
| `heading` · `body` · `meta` · `micro` | Nunito ExtraBold / Bold | Everything else. |
| Button labels | Rubik Black | Sized with the button. |

Both faces carry every letter the four Latin languages write — Turkish,
German, French and Spanish (ğ ş ı İ ä ö ü ß é è ê à â ç œ ñ á í ó ú ¿ ¡ « »);
most faces games use do not (Lilita One, Fredoka, Titan One, Chango and
Bowlby One lack ğ, ş or İ, and caps-only faces such as Luckiest Guy draw a
lower-case i without its dot). Neither has a capital ẞ or the narrow no-break
space (U+202F): German capitals write SS, French spacing uses U+00A0. The app
ships static Latin subsets: Rubik Black and ExtraBold, Nunito SemiBold, Bold,
ExtraBold and Black (`assets/fonts`, OFL).

**Arabic** is set in **Cairo** (OFL), weight for weight — Black where Rubik
Black stands, ExtraBold, Bold, SemiBold for the rest (`ARABIC_FONT` in
`ui/theme.ts`). Arabic reads right to left and the app reloads to turn
around, so `FONT` and `TYPE` are chosen once, when the app starts, by the
direction it reads: in Arabic every role is Cairo, `label` loses its
letter-spacing (spacing tears joined letters apart — `tracking()`), and
every line is a third taller (`lh()`: Cairo's letters climb and hang
further). The language picker writes each language's name in its own face,
whatever the game speaks.

**Capitals** are allowed for ribbons and tile names only, **typed in capitals
in each language's line** — the Turkish İ, the German SS; Arabic has none.
Never `textTransform: 'uppercase'`: it knows no Turkish and turns "i" into
"I". Everything else is sentence case.

**Right to left.** In Arabic the whole layout mirrors itself: rows, margins,
`left`/`right`, the dock's order, the podium, a meter's fill. What a layout
does not turn by itself is turned by hand — the glyphs that point along the
line (`chevron`, `back`, `logout`, `trendUp`/`trendDown`, …; `MIRRORED` in
`ui/icons.tsx`) and transforms (the `Toggle` knob). The game's own gestures
are vertical and read the same both ways.

## Shape and depth

- **4pt grid** with half steps (`xxs 2 · xs 4 · sm 6 · ms 10 · md 12 · lg 14 · xl 18 · xxl 26`).
- **Chunky radii:** `control` 16 · `nav` 18 · `panel` 22 · `overlay` 30 · `pill`.
- **Depth is an outline and a lip**, not a soft shadow: `DEPTH.outline` 2.5pt
  round everything, `DEPTH.lip` 6pt (4pt small) under it. A tile draws its lip
  as a thicker bottom edge and a lit top edge; a slab (button) stands on a
  separate lip it sinks into. A soft shadow is left only for what floats over
  the arena — a sheet, the dock.
- **Controls:** `CONTROL` sm 36 · md 46 · lg 58; the lobby's play slab is 74.

## The mark

The logo is a **Q**: a thick magenta ring whose tail is a **gold lightning
bolt** — the reflex — with two **swipe-up chevrons** in its eye, a white one and
its pink echo: the move the feed is made of. It is drawn like everything else
in the arena — outline, lip, a gloss across the ring's top, a rim light — on
the night with a magenta glow, spotlight rays and a few sparkles.

`apps/mobile/design/make-brand.py` draws it from the palette (through
`tokens.ts`) and Rubik, and writes every image of it: the App Store and Google
Play icons, Android's adaptive layers (with a monochrome one for themed
icons), the wide logo with **Quezby** and "Kaydırma alışkanlığın, rekabete
dönüştü.", the Play feature graphic, `BrandMark` and the iOS launch tile — all
in `design/brand/` or where the platform wants them. Change the mark there and
run it again; never touch an exported PNG.

## Surfaces

| Surface | What it is |
| --- | --- |
| `Screen` / `Arena` | The night every screen stands on |
| `BrandBand` | The stage: magenta running into violet with lanes across it, for a hero — the lobby's event, a podium, a result |
| `Panel` / `Card` | A tile; `primary` is your own, `sunken` is a well |
| `Slab` | Anything pressable that is not a row: face + lip + outline + gloss |
| `TopBar` | A screen's head, drawn on the arena. **There are no navigation bars.** |
| The dock | The bottom bar: five slots, the lobby in the middle as a gold play slab standing out of it |

No iOS list rows with chevrons on main surfaces: a row that opens something
ends in a small arrow slab (`ArrowNub`), and rarely used settings live in a
sheet.

## Motion

1. **A finger's move is a spring** — a sheet, the dock's tile, a slab coming
   back up (the press goes down in 60 ms and springs back).
2. **What the game does on its own is a timing curve** — the reel timer, the
   meter, a count-up.
3. **Juice plays once, when the game says so** — `Stamp` (slammed in big,
   settling on `SPRING_POP`), `CountUp` (~900 ms, fixed-width digits),
   `Confetti` (a record, a place climbed), `useShake` (a miss). Tap feedback
   lands in ~100 ms, transitions in 200–300 ms, stamps ~100 ms apart; a long
   celebration can be skipped with a tap.
4. **What loops:** a playing reel (it is live), the lobby's play slab — it
   breathes 1 → 1.04 → 1, 1.6 s each way, and a glint crosses it every few
   seconds, because the game is waiting — and nothing else. Loops pause while
   covered: a reel under a coach card holds still, since it is not live yet.
   The coach card's hand acts its move out **twice** and rests on the last
   frame — a demonstration, not a loop.

**Reduced motion** (`useReducedMotion()`) stops every loop and every piece of
juice; the end state shows at once.

## Feel

Every reel ends in the hand as well as on the screen (`src/lib/haptics.ts`):
a swipe ticks, a hit lands, a perfect hold thumps, a miss buzzes, a new record
celebrates. Players can turn it off in Profil → Ayarlar. Sound would add a
great deal and needs a native module — a separate decision.

---

## Why (research, 2026-09-24)

- Game UI reads as a game through a small, strict toolkit: slabs with a dark
  lip that press down (Duolingo's live CSS: 50px button, `0 4px 0` unblurred
  lip in a darker shade), thick dark outlines, a lit top edge, white display
  text on a hard shadow, ribbons for titles, one accent kept for the main
  action (Clash Royale's yellow "Battle").
- Lobbies put status at the top, the event in the middle, the main action in
  the thumb's reach and a fixed dock at the bottom with the play slot raised
  in the centre (Clash Royale, Brawl Stars, Stumble Guys).
- Ladders that centre on *you* and the player just above you retain better
  than "top players" boards; demotion pressure brings players back more
  reliably than promotion (Duolingo leagues). "Geç onu" is that pattern.
- Result screens sequence their juice: the score slams in and counts up,
  bonuses stamp in one after another, the passed rows climb, confetti on a
  record, the buttons come last.
