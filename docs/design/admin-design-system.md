# Quezby Yönetim — the admin panel's design system

`apps/admin` is a staff tool, not the game. It does **not** wear "Arena"
(`design-language.md` is the game's): it follows the design language of the
Qesvis admin — calm, dense, card-and-table — worn in Quezby's colours. The kit
is Quezby's own code, written from that language's recipes; nothing is
imported from Qesvis.

Enforceable rules: `docs/rules/admin-rules.md`. The API behind it:
`docs/backend/admin-api.md`.

## Principles

- **Modern, never plain.** Every page opens on the brand band; lists are
  tables with rich cells, never bare text grids.
- **One solid action per view.** On the band it is the white `onBrand`
  button; inside a card the magenta `primary`.
- **Say the thing.** Status is a tag with a word, never colour alone, and
  never in the action's magenta. Empty states say what is missing and what to
  do. A destructive act names itself.
- **The API decides.** The panel shows numbers, ranks, risks and rates as the
  API sends them, and hides what a role cannot use.

## Colour — `apps/admin/src/index.css`

Two layers, and components only touch the second.

1. **Ramps**, OKLCH, numbered like Radix (1–2 canvas, 3–5 fills, 6–8 lines,
   9–10 solids, 11–12 text), light and dark:
   - `--n-*` neutral — a violet-grey (hue 290), the arena at noon;
   - `--p-*` primary — **Quezby magenta** (hue 352), the game's brand;
   - `--s-*` secondary — the arena's **violet** (hue 290);
   - `ok`, `warn`, `bad` — soft / line / solid / text.
2. **Roles**, registered in `@theme inline`, so Tailwind writes `bg-surface`,
   `text-ink`, `border-line`:

   | Role | Use |
   | --- | --- |
   | `rail`, `canvas`, `surface`, `raised`, `overlay`, `sunken` | surfaces, back to front: page, sidebar, cards, dialogs, table heads |
   | `fill`, `fill-hover`, `fill-active` | input wells, neutral buttons, chips at rest |
   | `line`, `line-soft`, `line-strong` | edges, table rules, checkbox borders |
   | `ink`, `ink-muted`, `ink-faint`, `ink-on-solid` | text, strongest to weakest; `ink-faint` for labels and placeholders only |
   | `primary-*` | the action colour, focus ring, the chosen nav item — never a status |
   | `secondary-*` | accent only — never a solid call to action |
   | `ok-*`, `warn-*`, `bad-*` | status |
   | `brand-from`, `brand-to`, `on-brand`, `scrim` | the band's gradient — the game's `brandFrom → brandTo` — and the white it carries |

`primary` is never a status colour: its magenta (hue 352) beside `bad`
(hue 25) reads as the same red. A verdict, a state or a chart series that
means good or bad takes `ok`, `warn` or `bad` — the neutral grey when it is
neither — and good news is green, as in the game: a clean run, a perfect post,
a clean VS run ("Oynandı"), a report put right ("Giderildi"); a report still
open is amber.

Light and dark point the roles at different rungs of the same ramps, so no
component carries a `dark:` class. The theme is light, dark or the system's,
remembered per browser (`quezby.admin.theme`).

`scripts/admin-tokens.test.mjs` holds the brand to the game's palette
(`apps/mobile/design/palette.mjs`) and every text role to its contrast in
both themes (4.5:1; 3:1 for `ink-faint` labels).

## Type

Quicksand (self-hosted, every Turkish letter), body weight 500. Each role is
one utility carrying size, line height, tracking and weight:

| Utility | Size | Where |
| --- | --- | --- |
| `text-hero` | 40 / 700 | the sign-in page's one line |
| `text-display` | 28 / 700 | a page title, a headline number |
| `text-title` | 20 / 700 | a dialog title, a band tile, an empty state |
| `text-heading` | 15 / 650 | a card title |
| `text-body` | 14 / 500 | cells, inputs, the menu |
| `text-meta` | 13 / 500 | descriptions, hints |
| `text-micro` | 11 / 650 | labels, table heads, tags — the floor |

Sentence case, no `uppercase`, no letter-spaced eyebrows, no arbitrary text
sizes (the brand mark's letter and a temporary password are the only
exceptions). Numbers are tabular in tables and tiles.

## Shape, depth, motion

- Radii: `control` 12 (buttons, inputs), `nav` 14, `panel` 16 (cards,
  menus), `overlay` 26 (dialogs, the page sheet), `pill`.
- Depth: `shadow-card`, `shadow-raised`, `shadow-overlay` — a soft violet
  shadow in light, a hairline in dark. **Cards are lifted, never bordered.**
  `shadow-primary` under the one solid action, `shadow-brand` on the band.
- Motion: anything a person moves is a spring (`ease-spring`, 520 ms — the
  sliding nav pill, a dialog, the drawer); anything that arrives by itself is a
  timing curve (`animate-rise`, `animate-enter` with `stagger`). Only "live"
  things loop. `prefers-reduced-motion` switches it all off.

## Layout

- **Shell** — the sidebar (264 px, 76 px folded) on a wide screen; a magenta
  bar and a drawer below `lg`. The sidebar's magenta pill springs to the page
  you are on; its groups (Genel, Oyuncular, Oyun, Yönetim) fold and are
  remembered; badges count what waits (`GET /counts`: the review queue on
  Şüpheliler, the players with an open report on Bildirimler); the account,
  the theme and signing out live at its foot, the panel's release ("Sürüm
  1.00.00.12", `lib/release.ts`) under the theme while the sidebar is wide.
  There is no top bar.
- **Page** — every route body: the brand band (title, description, one
  action, `BandStats` or an eyebrow of tags, and `leading` — a record's
  picture beside its title, the player's photo on a player's page), the
  canvas rising over it, and a slim bar that slides down with the title once
  it scrolls away. Tabs are a `Segmented` on the canvas. Record pages use a
  two-column grid (`xl:grid-cols-[minmax(0,1fr)_24rem]`). Every layout grid
  starts from `grid-cols-1`, so a long value can never widen a phone's column;
  a table sheds supporting columns (`hideBelow`) before it scrolls sideways.
- **Sign-in** — the logo's gradient on one half with the game's four moves
  floating over it, the form on the other.

## The kit — `apps/admin/src/components`

| Piece | What |
| --- | --- |
| `base/button` | primary, secondary, neutral, ghost, danger, onBrand, onBrandSoft; sm, md, lg, icon; `loading` |
| `base/tag`, `icon-chip`, `brand-mark` | status pills, glyph squares, the Q |
| `base/avatar` | a person: a player's photo in a disc, as players see it — or two letters in a tinted one when there is none or it will not load; decoration beside the name unless `alt` names it, where the photo itself is what is looked at; `onBrand` on the band; `sm`, `md`, `lg`, `xl`, and `2xl` for the photo panel of a player's page |
| `base/panel` | the card: icon, title, description, actions, toolbar, footer |
| `base/text-input`, `field`, `text-area`, `checkbox`, `picker` | the input well; a labelled field with its hint or error |
| `base/segmented` | tabs and choices with a sliding pill; arrow keys |
| `base/modal`, `menu`, `tooltip`, `meter`, `skeleton`, `spinner` | overlays and small pieces |
| `patterns/page`, `band-stats`, `stats` | the page and its numbers |
| `patterns/data-table`, `pager`, `filter-chips` | every list: loading, failure and empty are its states; the API pages it |
| `patterns/confirm-modal`, `form-modal` | every destructive act asks first, focus on "Vazgeç"; small forms read with `FormData` |
| `patterns/callout`, `empty-state`, `facts`, `share-list`, `bar-chart` | messages, missing things, records, shares, 30-day charts (SVG, a table for screen readers) |
| `patterns/run-timeline` | a run post by post: decision times and a cell per verdict (its colours below) |
| `patterns/retention-table` | weekly cohorts × day 1/3/7/14/30: every cell writes its per-mille out, tinted only greener for more; a day not over yet is "—" |
| `patterns/funnel-list` | rows with a count and the API's per-mille on a bar of that length — numbered steps (a funnel) or slices of a whole; never sums anything itself, unlike `share-list` |
| `patterns/activity-strip` | a player's days as cells: grey when they did not come, greener the longer they stayed; each cell says its day in words |
| `analytics/journey` | a visit's path: screens as quiet chips joined by arrows, the moments between them as tags in their own colour; the rest as "+N adım" |
| `patterns/secret-reveal` | a temporary password, shown once |
| `layout/shell`, `sidebar`, `login-layout`, `gate` | the frame and the doors |
| `moderation/*`, `boards/board-table` | the moderation dialogs and the board table every page shares |
| `lib/columns` | the cells many tables draw: `PlayerCell` (the photo, where the row carries it), `When` (a moment on one line, the exact time on hover), `RunStatusTag` (what the status means for the boards, on hover), `FlagTags`, `TierTag` (a league's name with its medal, a crown for MasterClass), `EloDelta` (a rating move with its sign, green up, red down, grey none), the audit columns |

A third copy of the same markup is a missing component.

The run timeline's cells follow the game: **İsabet** light green (a soft fill
with a green edge — a pale fill alone reads as the grey of a drained post),
**Mükemmel** solid green, **Erken bıraktı** and **Geç bıraktı** amber,
**Süre doldu**, **Yanlış hareket** and **Dokundu** red, **Dopamin bitti**
grey. The tally pills above the strip carry each cell's swatch, so they read
as its legend; every cell also says its post and verdict in words.

## Words

Turkish, "sen", short and specific — the API's own messages speak the same
way. Examples: "Yasakla", "Yasağı kaldır", "Adı sıfırla", "Fotoğrafı kaldır",
"Bildirimleri kapat", "Oturumları kapat", "Hesabı sil", "Onayla", "Reddet",
"Vazgeç". A confirm names the thing ("@kerem.35 yasaklansın mı?") and the
consequence ("Fotoğraf silinir, artık kimse göremez"). Dates on the game's
clock (Europe/Istanbul): "25 Eyl 2026 14:05", "12 dk önce", "dün 14:05";
numbers "12.345", "%94,2"; a missing value is "—". Players are `@handle`.
Game words follow `ui-writing.md`: a reel is a **post**; the kinds are
Sıradan, Arkadaş, Altın and Kırmızı; a VS is **VS**. In the panel,
**Bildirimler** are what players report about each other's photos and names
(Açık, Giderildi, Kapatıldı) — the game's own "Bildirimler" are push
notifications, which the Sistem page calls "Push bildirimleri".
