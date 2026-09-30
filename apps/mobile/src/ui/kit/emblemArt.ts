import type { LeagueTier } from '@quezby/types';

/**
 * The league frames as data: every shape of every tier on one 120 × 120
 * canvas, named by the paint it takes. `LeagueFrame` draws them round a
 * player's portrait in the tier's metal (`emblem` in `design/palette.mjs`);
 * nothing here knows a colour.
 *
 * A league is a frame, the way a game dresses a player's picture for their
 * rank: a metal bezel round the portrait and a plate under it with the
 * league's mark. It reads at a glance by its silhouette before its colour —
 * a bare bezel in Bronz, small wings in Gümüş that grow a feather and spread
 * wider every league, a spike on Platin, a tiara on Elmas, and a crown, a
 * halo and rays round MasterClass. The mark on the plate climbs too: a chevron, two, a
 * star, a cut gem, a diamond, a crowned star.
 */

/** What a shape is painted with: the tier's metal, its gem, or the arena's outline. */
export type Paint =
  | 'rim'
  | 'face'
  | 'deep'
  | 'shade'
  | 'hi'
  | 'accent'
  | 'gem'
  | 'gemHi'
  | 'halo';

export type Shape = {
  d: string;
  fill: Paint | 'none';
  /** The arena's outline round the shape: its width on the 120 canvas. */
  outline?: number;
  /** A stroke in a paint instead of the outline. */
  stroke?: Paint;
  strokeWidth?: number;
  opacity?: number;
  /** Turns slowly round the middle when the frame moves: MasterClass's rays. */
  spin?: boolean;
};

export type Frame = {
  /** Behind the bezel: the halo, the rays, the wings, the crown. */
  back: Shape[];
  /** The league's mark, drawn round (60, 60) at 34 units; the plate shrinks it. */
  mark: Shape[];
  /** Over the bezel: its studs and gems, the crown's gems. */
  front: Shape[];
  /** Where the sparkles twinkle, when the frame moves. */
  sparkles: Array<[x: number, y: number, size: number]>;
  /** Whether it glows behind: the leagues past Altın. */
  glow: boolean;
};

export const CANVAS = 120;

/** The portrait's window, and its corner. */
export const HOLE = { x: 31, y: 29, size: 58, radius: 17 } as const;

/** A rounded rectangle, clockwise. */
function box(x: number, y: number, w: number, h: number, r: number): string {
  return (
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}` +
    `A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  );
}

/** The bezel's outer edge. */
export const BEZEL_OUT = box(22, 20, 76, 76, 25);
/** The bezel as a ring: its outer edge with the portrait's window cut out (even-odd). */
export const BEZEL = BEZEL_OUT + box(HOLE.x, HOLE.y, HOLE.size, HOLE.size, HOLE.radius);
/** The window's own edge, drawn dark over the portrait's rim. */
export const WINDOW = box(HOLE.x, HOLE.y, HOLE.size, HOLE.size, HOLE.radius);
/** The lit top of the bezel. */
export const BEZEL_GLOSS = 'M29 24.5C39 22 49 21.5 60 21.5C71 21.5 81 22 91 24.5C88 26.5 86 27.5 83.5 29H36.5C34 27.5 32 26.5 29 24.5Z';
/** The plate under the portrait that carries the league's mark. */
export const PLATE = 'M43 86H77L86 96.5 77 107H43L34 96.5Z';
/** The plate's lit upper half. */
export const PLATE_GLOSS = 'M43.8 88H76.2L83.4 96.5H36.6Z';
/** Where the mark sits on the plate, and how small. */
export const PLATE_MARK = { x: 60, y: 96.6, scale: 0.36 } as const;
/** The band of light that sweeps across the bezel. */
export const SHINE = 'M0 0H16L-8 120H-24Z';

/** A path's mirror across the canvas's middle: M, L, C, V, Z and bare pairs only. */
function mirror(d: string): string {
  let x = true;
  return d.replace(/-?\d+(\.\d+)?|[A-Za-z]/g, (token) => {
    if (/[A-Za-z]/.test(token)) {
      x = token !== 'V';
      return token;
    }
    const value = Number(token);
    const out = x ? CANVAS - value : value;
    x = !x;
    return String(Math.round(out * 10) / 10);
  });
}

function pair(d: string): string {
  return d + mirror(d);
}

/** A round dot of radius `r` at (cx, cy). */
function dot(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
}

/** The same dot on both sides. */
function dots(cx: number, cy: number, r: number): string {
  return dot(cx, cy, r) + dot(CANVAS - cx, cy, r);
}

/** A small cut gem — a rhombus — at (cx, cy). */
function stud(cx: number, cy: number, r: number): string {
  return `M${cx} ${cy - r}L${cx + r * 0.8} ${cy}L${cx} ${cy + r}L${cx - r * 0.8} ${cy}Z`;
}

/**
 * A wing of `feathers` feathers on the bezel's left, `reach` long at its
 * widest, fanning from the shoulder down.
 */
function wing(feathers: number, reach: number): string {
  const paths: string[] = [];
  for (let k = 0; k < feathers; k += 1) {
    const top = 30 + k * 10;
    const length = reach * (1 - (k / Math.max(1, feathers)) * 0.45);
    const tipX = 24 - length;
    const tipY = top - 8 + k * 5;
    paths.push(
      `M25 ${top}C${25 - length * 0.45} ${top - 8} ${tipX + 4} ${tipY - 2} ${tipX} ${tipY}` +
        `C${tipX + 9} ${tipY + 9} ${25 - length * 0.35} ${top + 13} 25 ${top + 13}Z`,
    );
  }
  return paths.join('');
}

/** Rays for the halo: `count` wedges from the portrait's middle out to `radius`. */
function rays(count: number, radius: number): string {
  const paths: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const spread = Math.PI / count / 2.2;
    const x1 = 60 + Math.cos(angle - spread) * radius;
    const y1 = 60 + Math.sin(angle - spread) * radius;
    const x2 = 60 + Math.cos(angle + spread) * radius;
    const y2 = 60 + Math.sin(angle + spread) * radius;
    paths.push(`M60 60L${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}Z`);
  }
  return paths.join('');
}

const CHEVRON = 'M42 70 60 52 78 70 71 77 60 66 49 77Z';
const CHEVRON_UPPER = 'M42 59 60 41 78 59 71 66 60 55 49 66Z';
const CHEVRON_LOWER = 'M42 79 60 61 78 79 71 86 60 75 49 86Z';
const STAR =
  'M60 40 66.2 53.4 80.8 55 69.9 64.9 73 79.3 60 71.9 47 79.3 50.1 64.9 39.2 55 53.8 53.4Z';
const HEX_GEM = 'M60 40 77 49.5V70.5L60 80 43 70.5V49.5Z';
const HEX_GEM_TOP = 'M60 40 77 49.5 60 59 43 49.5Z';
const HEX_GEM_FACETS = 'M60 40V59M77 49.5 60 59 43 49.5M60 59V80';
const DIAMOND = 'M42 52 50 42H70L78 52 60 80Z';
const DIAMOND_TABLE = 'M42 52 50 42H70L78 52Z';
const DIAMOND_FACETS = 'M42 52H78M50 42 55 52 60 80M70 42 65 52 60 80M55 52 60 42 65 52';
const CROWN_MARK = 'M42 76 40 50 51 60 60 44 69 60 80 50 78 76Z';

const RIVETS = dot(60, 24.5, 2.2) + dots(26, 58, 2.2);
const STUDS = stud(60, 24.5, 3.4) + stud(26, 58, 3.4) + stud(94, 58, 3.4);

const TOP_SPIKE = 'M50 22 60 3 70 22Z';
const TIARA = 'M38 24 42 6 50 16 60 0 70 16 78 6 82 24C75 21 67 20 60 20C53 20 45 21 38 24Z';
const TIARA_GEMS = dot(60, 3, 3.4) + dots(42, 7.5, 2.6);
const CROWN = 'M34 26 32 3 45 13 52 -2 60 9 68 -2 75 13 88 3 86 26C78 21 69 19.5 60 19.5C51 19.5 42 21 34 26Z';
const CROWN_BAND = 'M35 20.5C43 16.5 51 15.5 60 15.5C69 15.5 77 16.5 85 20.5L86 26C78 21 69 19.5 60 19.5C51 19.5 42 21 34 26Z';
const CROWN_GEMS = dots(52, 1, 3) + dots(32, 5, 2.6) + dot(60, 16, 3.6);
const HALO_RING = dot(60, 60, 55);

export const FRAMES: Record<LeagueTier, Frame> = {
  bronze: {
    back: [],
    mark: [{ d: CHEVRON, fill: 'accent', outline: 4 }],
    front: [{ d: RIVETS, fill: 'hi', outline: 1.4 }],
    sparkles: [],
    glow: false,
  },
  silver: {
    back: [{ d: pair(wing(2, 13)), fill: 'rim', outline: 3.2 }],
    mark: [
      { d: CHEVRON_UPPER, fill: 'accent', outline: 4 },
      { d: CHEVRON_LOWER, fill: 'accent', outline: 4 },
    ],
    front: [{ d: RIVETS, fill: 'hi', outline: 1.4 }],
    sparkles: [],
    glow: false,
  },
  gold: {
    back: [{ d: pair(wing(3, 19)), fill: 'rim', outline: 3.2 }],
    mark: [{ d: STAR, fill: 'accent', outline: 4 }],
    front: [{ d: STUDS, fill: 'gem', outline: 1.4 }],
    sparkles: [[16, 22, 5]],
    glow: false,
  },
  platinum: {
    back: [
      { d: TOP_SPIKE, fill: 'rim', outline: 3.2 },
      { d: pair(wing(4, 23)), fill: 'rim', outline: 3.2 },
    ],
    mark: [
      { d: HEX_GEM, fill: 'gem', outline: 4 },
      { d: HEX_GEM_TOP, fill: 'gemHi', opacity: 0.85 },
      { d: HEX_GEM_FACETS, fill: 'none', stroke: 'deep', strokeWidth: 2, opacity: 0.5 },
    ],
    front: [{ d: STUDS, fill: 'gem', outline: 1.4 }],
    sparkles: [
      [14, 20, 5],
      [106, 90, 4],
    ],
    glow: true,
  },
  diamond: {
    back: [
      { d: pair(wing(5, 26)), fill: 'rim', outline: 3.2 },
      { d: TIARA, fill: 'rim', outline: 3 },
    ],
    mark: [
      { d: DIAMOND, fill: 'gem', outline: 4 },
      { d: DIAMOND_TABLE, fill: 'gemHi', opacity: 0.9 },
      { d: DIAMOND_FACETS, fill: 'none', stroke: 'deep', strokeWidth: 1.8, opacity: 0.5 },
    ],
    front: [
      { d: STUDS, fill: 'gem', outline: 1.4 },
      { d: TIARA_GEMS, fill: 'gemHi', outline: 1.6 },
    ],
    sparkles: [
      [10, 18, 6],
      [110, 26, 5],
      [106, 96, 4],
      [12, 86, 4],
    ],
    glow: true,
  },
  master: {
    back: [
      { d: rays(12, 64), fill: 'halo', opacity: 0.3, spin: true },
      { d: HALO_RING, fill: 'none', stroke: 'accent', strokeWidth: 3, opacity: 0.85 },
      { d: pair(wing(5, 30)), fill: 'shade', outline: 3.2 },
      { d: pair(wing(4, 22)), fill: 'rim', outline: 2.8 },
      { d: CROWN, fill: 'accent', outline: 3 },
      { d: CROWN_BAND, fill: 'hi', opacity: 0.35 },
    ],
    mark: [
      { d: CROWN_MARK, fill: 'accent', outline: 4 },
      { d: dot(60, 66, 5) + dots(48, 67, 3.4), fill: 'gem', outline: 2 },
    ],
    front: [
      { d: STUDS, fill: 'accent', outline: 1.4 },
      { d: CROWN_GEMS, fill: 'gem', outline: 1.6 },
    ],
    sparkles: [
      [8, 16, 7],
      [112, 18, 6],
      [110, 96, 5],
      [10, 92, 5],
    ],
    glow: true,
  },
};

/** A four-point sparkle of `size` at (x, y). */
export function sparkle(x: number, y: number, size: number): string {
  const w = size * 0.28;
  return (
    `M${x} ${y - size}C${x + w * 0.4} ${y - w} ${x + w} ${y - w * 0.4} ${x + size} ${y}` +
    `C${x + w} ${y + w * 0.4} ${x + w * 0.4} ${y + w} ${x} ${y + size}` +
    `C${x - w * 0.4} ${y + w} ${x - w} ${y + w * 0.4} ${x - size} ${y}` +
    `C${x - w} ${y - w * 0.4} ${x - w * 0.4} ${y - w} ${x} ${y - size}Z`
  );
}
