/**
 * Quezby "Arena" palette — authored in OKLCH so the steps are perceptually even.
 *
 * `node scripts/sync-design-tokens.mjs` (or `pnpm tokens`) converts every value
 * to sRGB hex and writes `apps/mobile/src/ui/tokens.ts`. Edit here, never there.
 *
 * `roles` is the public vocabulary — a component names a role, never a value.
 * There is one set: Quezby is a game with one look, the night arena, and does
 * not follow the phone's light or dark setting (see design-language.md).
 *
 * Every other export is a fixed group. `marks` is the one place a hex value is
 * allowed: another company's logo colours are a spec to copy exactly, not a
 * role to tune.
 */
export const roles = {
  // The arena: a deep violet night, lit magenta from the top.
  night: 'oklch(0.27 0.135 293)',
  nightDeep: 'oklch(0.165 0.085 289)',
  glow: 'oklch(0.62 0.25 352)',
  glowAlt: 'oklch(0.56 0.22 280)',

  // Tiles — the game's panels: a violet slab with a lit top edge, a dark lip
  // under it and a near-black outline around it.
  tile: 'oklch(0.34 0.145 292)',
  tileHi: 'oklch(0.45 0.165 292)',
  tileLip: 'oklch(0.2 0.1 290)',
  outline: 'oklch(0.14 0.07 290)',
  well: 'oklch(0.13 0.07 290 / 0.55)',
  wellLine: 'oklch(1 0 0 / 0.12)',

  // The names the kit has always used, pointed at the arena.
  rail: 'oklch(0.21 0.11 291)',
  canvas: 'oklch(0.24 0.125 292)',
  surface: 'oklch(0.34 0.145 292)',
  raised: 'oklch(0.37 0.15 292)',
  sunken: 'oklch(0.2 0.1 290)',
  fill: 'oklch(0.29 0.125 292)',
  fillHover: 'oklch(0.32 0.13 292)',
  fillActive: 'oklch(0.38 0.14 292)',
  line: 'oklch(1 0 0 / 0.14)',
  lineSoft: 'oklch(1 0 0 / 0.08)',
  lineStrong: 'oklch(1 0 0 / 0.26)',
  ink: 'oklch(1 0 0)',
  inkMuted: 'oklch(0.87 0.05 295)',
  inkFaint: 'oklch(0.74 0.08 295)',
  inkOnSolid: 'oklch(1 0 0)',
  scrim: 'oklch(0.1 0.06 290 / 0.74)',
  onBrand: 'oklch(1 0 0)',
  brandFrom: 'oklch(0.58 0.235 351)',
  brandTo: 'oklch(0.5 0.23 289)',

  // Gold: the one action that starts a game. Dark ink on it, never white.
  gold: 'oklch(0.85 0.17 86)',
  goldHi: 'oklch(0.94 0.14 102)',
  goldLip: 'oklch(0.63 0.15 62)',
  goldInk: 'oklch(0.32 0.075 55)',

  // Magenta: the brand, a like, the actions around a game — "Geç onu", "Paylaş".
  primary: 'oklch(0.61 0.24 352)',
  primaryHi: 'oklch(0.7 0.21 352)',
  primaryLip: 'oklch(0.4 0.17 350)',
  primaryHover: 'oklch(0.66 0.23 352)',
  primaryInk: 'oklch(1 0 0)',
  primaryText: 'oklch(0.81 0.14 352)',
  primaryLine: 'oklch(0.52 0.18 352)',
  primarySoft: 'oklch(0.36 0.14 350)',

  // Violet: everything quieter — a second choice, a tab, a tile's badge.
  secondary: 'oklch(0.55 0.21 289)',
  secondaryHi: 'oklch(0.64 0.19 290)',
  secondaryLip: 'oklch(0.33 0.16 287)',
  secondaryInk: 'oklch(1 0 0)',
  secondaryText: 'oklch(0.83 0.11 292)',
  secondaryLine: 'oklch(0.52 0.16 290)',
  secondarySoft: 'oklch(0.33 0.14 292)',

  // Cyan: time. A countdown, a timer, "live".
  accent: 'oklch(0.87 0.13 205)',
  accentSoft: 'oklch(0.3 0.08 225)',

  ok: 'oklch(0.79 0.19 150)',
  okHi: 'oklch(0.88 0.16 150)',
  okLip: 'oklch(0.52 0.14 152)',
  okSoft: 'oklch(0.32 0.08 158)',
  okLine: 'oklch(0.55 0.13 152)',
  okText: 'oklch(0.87 0.15 150)',
  warn: 'oklch(0.85 0.16 86)',
  warnSoft: 'oklch(0.34 0.07 80)',
  warnLine: 'oklch(0.6 0.12 80)',
  warnText: 'oklch(0.9 0.13 92)',
  bad: 'oklch(0.66 0.22 22)',
  badHi: 'oklch(0.74 0.19 22)',
  badLip: 'oklch(0.44 0.17 22)',
  badSoft: 'oklch(0.32 0.1 22)',
  badLine: 'oklch(0.55 0.17 22)',
  badText: 'oklch(0.82 0.13 22)',

  // The podium's metals: a disc, a ring, a pedestal cap. `Ink` is the glyph on one.
  medalGold: 'oklch(0.86 0.165 90)',
  medalGoldSoft: 'oklch(0.4 0.09 80)',
  medalGoldInk: 'oklch(0.36 0.08 68)',
  medalGoldLip: 'oklch(0.62 0.14 66)',
  medalSilver: 'oklch(0.87 0.02 262)',
  medalSilverSoft: 'oklch(0.4 0.03 265)',
  medalSilverInk: 'oklch(0.34 0.03 262)',
  medalSilverLip: 'oklch(0.62 0.03 265)',
  medalBronze: 'oklch(0.76 0.12 58)',
  medalBronzeSoft: 'oklch(0.38 0.07 52)',
  medalBronzeInk: 'oklch(0.3 0.07 45)',
  medalBronzeLip: 'oklch(0.54 0.11 48)',

  // League tiers: the solid draws the emblem, the soft fills it.
  tierBronze: 'oklch(0.74 0.125 56)',
  tierBronzeSoft: 'oklch(0.36 0.07 50)',
  tierSilver: 'oklch(0.86 0.025 260)',
  tierSilverSoft: 'oklch(0.38 0.03 262)',
  tierGold: 'oklch(0.87 0.16 92)',
  tierGoldSoft: 'oklch(0.4 0.08 84)',
  tierPlatinum: 'oklch(0.88 0.07 190)',
  tierPlatinumSoft: 'oklch(0.36 0.05 200)',
  tierDiamond: 'oklch(0.78 0.15 240)',
  tierDiamondSoft: 'oklch(0.36 0.1 250)',

  // Sign-in buttons as Apple and Google draw them on a dark screen.
  appleBg: 'oklch(1 0 0)',
  appleInk: 'oklch(0 0 0)',
  googleBg: 'oklch(0.187 0.002 286)',
  googleInk: 'oklch(0.916 0 0)',
  googleLine: 'oklch(0.654 0.005 157)',
};

/**
 * The Google "G", in Google's own colours. Hex on purpose — see above — and
 * drawn only by `GoogleMark`.
 */
export const marks = {
  googleBlue: '#4285F4',
  googleGreen: '#34A853',
  googleYellow: '#FBBC05',
  googleRed: '#EA4335',
};

/**
 * The feed's own colours. Each kind is told apart by hue before anything is
 * read: calm slate for an ordinary reel, pink for a friend, gold for a gold
 * reel, deep red for "don't touch". Ordinary reels rotate through several
 * slates so the feed never looks like one reel on repeat.
 */
export const reel = {
  skip: [
    'oklch(0.36 0.035 250)',
    'oklch(0.34 0.04 215)',
    'oklch(0.37 0.03 275)',
    'oklch(0.35 0.035 180)',
    'oklch(0.38 0.03 305)',
    'oklch(0.33 0.03 235)',
  ],
  skipDisc: 'oklch(1 0 0 / 0.1)',
  like: 'oklch(0.55 0.2 355)',
  likeDeep: 'oklch(0.38 0.15 355)',
  likeGlow: 'oklch(0.86 0.1 355)',
  hold: 'oklch(0.72 0.15 75)',
  holdDeep: 'oklch(0.48 0.12 60)',
  holdBar: 'oklch(0.96 0.07 90)',
  holdZone: 'oklch(0.74 0.18 150)',
  freeze: 'oklch(0.3 0.12 25)',
  freezeAlarm: 'oklch(0.62 0.23 25)',
  ink: 'oklch(1 0 0)',
  inkSoft: 'oklch(1 0 0 / 0.74)',
  inkFaint: 'oklch(1 0 0 / 0.5)',
  shade: 'oklch(0 0 0 / 0.28)',
  outline: 'oklch(0.14 0.07 290)',
  meter: 'oklch(0.8 0.15 165)',
  meterMid: 'oklch(0.82 0.16 85)',
  meterLow: 'oklch(0.63 0.22 25)',
  track: 'oklch(0.14 0.07 290 / 0.55)',
  hit: 'oklch(0.8 0.17 150)',
  miss: 'oklch(0.66 0.22 25)',
  gold: 'oklch(0.85 0.17 86)',
  goldInk: 'oklch(0.32 0.075 55)',
};
