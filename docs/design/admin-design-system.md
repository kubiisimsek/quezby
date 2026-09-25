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
- **Say the thing.** Status is a tag with a word, never colour alone. Empty
  states say what is missing and what to do. A destructive act names itself.
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
   | `primary-*` | the action colour, focus ring, the chosen nav item |
   | `secondary-*` | accent only — never a solid call to action |
   | `ok-*`, `warn-*`, `bad-*` | status |
   | `brand-from`, `brand-to`, `on-brand`, `scrim` | the band's gradient — the game's `brandFrom → brandTo` — and the white it carries |

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
  remembered; badges count what waits (the review queue); the account, the
  theme and signing out live at its foot. There is no top bar.
- **Page** — every route body: the brand band (title, description, one
  action, `BandStats` or an eyebrow of tags), the canvas rising over it, and a
  slim bar that slides down with the title once it scrolls away. Tabs are a
  `Segmented` on the canvas. Record pages use a two-column grid
  (`xl:grid-cols-[minmax(0,1fr)_24rem]`). Every layout grid starts from
  `grid-cols-1`, so a long value can never widen a phone's column; a table
  sheds supporting columns (`hideBelow`) before it scrolls sideways.
- **Sign-in** — the logo's gradient on one half with the game's four moves
  floating over it, the form on the other.

## The kit — `apps/admin/src/components`

| Piece | What |
| --- | --- |
| `base/button` | primary, secondary, neutral, ghost, danger, onBrand, onBrandSoft; sm, md, lg, icon; `loading` |
| `base/tag`, `icon-chip`, `avatar`, `brand-mark` | status pills, glyph squares, initials, the Q |
| `base/panel` | the card: icon, title, description, actions, toolbar, footer |
| `base/text-input`, `field`, `text-area`, `checkbox`, `picker` | the input well; a labelled field with its hint or error |
| `base/segmented` | tabs and choices with a sliding pill; arrow keys |
| `base/modal`, `menu`, `tooltip`, `meter`, `skeleton`, `spinner` | overlays and small pieces |
| `patterns/page`, `band-stats`, `stats` | the page and its numbers |
| `patterns/data-table`, `pager`, `filter-chips` | every list: loading, failure and empty are its states; the API pages it |
| `patterns/confirm-modal`, `form-modal` | every destructive act asks first, focus on "Vazgeç"; small forms read with `FormData` |
| `patterns/callout`, `empty-state`, `facts`, `share-list`, `bar-chart` | messages, missing things, records, shares, 30-day charts (SVG, a table for screen readers) |
| `patterns/run-timeline` | a run post by post: decision times and a cell per verdict |
| `patterns/secret-reveal` | a temporary password, shown once |
| `layout/shell`, `sidebar`, `login-layout`, `gate` | the frame and the doors |
| `moderation/*`, `boards/board-table` | the moderation dialogs and the board table every page shares |
| `lib/columns` | the cells many tables draw: `PlayerCell`, `When` (a moment on one line, the exact time on hover), `RunStatusTag`, `FlagTags`, the audit columns |

A third copy of the same markup is a missing component.

## Words

Turkish, "sen", short and specific — the API's own messages speak the same
way. Examples: "Yasakla", "Yasağı kaldır", "Adı sıfırla", "Oturumları kapat",
"Hesabı sil", "Onayla", "Reddet", "Vazgeç". A confirm names the thing ("@kerem.35
yasaklansın mı?") and the consequence. Dates on the game's clock
(Europe/Istanbul): "25 Eyl 2026 14:05", "12 dk önce", "dün 14:05"; numbers
"12.345", "%94,2"; a missing value is "—". Players are `@handle`. Game words
follow `ui-writing.md`: a reel is a **post**; the kinds are Sıradan, Arkadaş,
Altın and Kırmızı.
