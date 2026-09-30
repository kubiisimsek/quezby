import type { ReactNode } from 'react';
import Svg, { Circle, G, Path, Rect, type NumberProp } from 'react-native-svg';

import { IS_RTL } from '@/i18n/native';

/**
 * The app's icon set, drawn here rather than pulled from a font — an icon font
 * is a native asset to link on two platforms for shapes this simple. Every
 * glyph is a 24×24 drawing on one grid, so they share optical weight. Add a
 * glyph here rather than importing a set.
 */
export type IconName =
  // navigation
  | 'home'
  | 'podium'
  | 'account'
  | 'history'
  // affordances
  | 'chevron'
  | 'chevronDown'
  | 'chevronUp'
  | 'back'
  | 'close'
  | 'check'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'refresh'
  | 'share'
  | 'more'
  | 'play'
  | 'sliders'
  | 'help'
  | 'search'
  | 'grid'
  | 'globe'
  | 'camera'
  | 'image'
  | 'flag'
  | 'ban'
  | 'bell'
  // people
  | 'users'
  | 'userPlus'
  | 'userCheck'
  | 'userMinus'
  // friends
  | 'inbox'
  | 'message'
  | 'swords'
  // time
  | 'calendar'
  | 'hourglass'
  // the game
  | 'trophy'
  /** qb, the rating: its coin and monogram (`QbCoin` is the full-colour one). */
  | 'qb'
  | 'crown'
  | 'medal'
  | 'flame'
  | 'heart'
  | 'bolt'
  | 'arrowUp'
  | 'hand'
  | 'handStop'
  | 'sparkle'
  | 'star'
  | 'clock'
  | 'vibrate'
  | 'mountain'
  | 'trendUp'
  | 'trendDown'
  | 'target'
  // state
  | 'alert'
  | 'info'
  | 'shield'
  // accounts
  | 'lock'
  | 'mail'
  | 'eye'
  | 'eyeOff'
  | 'logout'
  | 'apple';

type Stroke = {
  stroke: string;
  strokeWidth: NumberProp;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: string;
};

const GLYPHS: Record<IconName, (s: Stroke, color: string) => ReactNode> = {
  home: (s) => (
    <Path
      d="M4 10.6 12 4l8 6.6V19a1.6 1.6 0 0 1-1.6 1.6h-3.8v-5.4H9.4v5.4H5.6A1.6 1.6 0 0 1 4 19v-8.4Z"
      {...s}
    />
  ),
  podium: (s) => (
    <Path
      d="M3.5 20.5h17M9 20.5V9.5h6v11M3.5 20.5v-6H9M15 14h5.5v6.5"
      {...s}
    />
  ),
  account: (s) => (
    <>
      <Circle cx={12} cy={8.4} r={3.7} {...s} />
      <Path d="M4.9 20a7.3 7.3 0 0 1 14.2 0" {...s} />
    </>
  ),
  history: (s) => (
    <>
      <Circle cx={12} cy={12} r={8.6} {...s} />
      <Path d="M12 6.8V12l3.5 2.1" {...s} />
    </>
  ),

  chevron: (s) => <Path d="M9.5 5.5 16 12l-6.5 6.5" {...s} />,
  chevronDown: (s) => <Path d="M5.5 9.5 12 16l6.5-6.5" {...s} />,
  chevronUp: (s) => <Path d="M5.5 14.5 12 8l6.5 6.5" {...s} />,
  back: (s) => <Path d="M19 12H5m0 0 6.2-6.2M5 12l6.2 6.2" {...s} />,
  close: (s) => <Path d="M6 6l12 12M18 6L6 18" {...s} />,
  check: (s) => <Path d="m4.8 12.6 4.8 4.8 9.6-10.8" {...s} />,
  plus: (s) => <Path d="M12 5v14M5 12h14" {...s} />,
  edit: (s) => (
    <>
      <Path d="M4.6 19.4h4l10.2-10.2a2.8 2.8 0 0 0-4-4L4.6 15.4v4Z" {...s} />
      <Path d="m13.6 6.4 4 4" {...s} />
    </>
  ),
  trash: (s) => (
    <>
      <Path d="M4.4 6.6h15.2M9.6 6.6V4.8c0-.7.6-1.2 1.2-1.2h2.4c.7 0 1.2.5 1.2 1.2v1.8" {...s} />
      <Path d="m6.2 6.6.9 12.2c.1 1 .9 1.8 1.9 1.8h6c1 0 1.8-.8 1.9-1.8l.9-12.2" {...s} />
    </>
  ),
  refresh: (s) => (
    <>
      <Path d="M19.4 12a7.4 7.4 0 1 1-2.2-5.2" {...s} />
      <Path d="M19.6 4.4v4.4h-4.4" {...s} />
    </>
  ),
  share: (s) => (
    <>
      <Path d="M12 15.4V3.8m0 0L8.3 7.5M12 3.8l3.7 3.7" {...s} />
      <Path d="M5.4 12.8v5.4a2 2 0 0 0 2 2h9.2a2 2 0 0 0 2-2v-5.4" {...s} />
    </>
  ),
  more: (_s, color) => (
    <>
      <Circle cx={5.4} cy={12} r={1.7} fill={color} />
      <Circle cx={12} cy={12} r={1.7} fill={color} />
      <Circle cx={18.6} cy={12} r={1.7} fill={color} />
    </>
  ),
  play: (s) => (
    <Path
      d="M8.2 5.3v13.4a.9.9 0 0 0 1.4.8l10.3-6.7a.9.9 0 0 0 0-1.6L9.6 4.5a.9.9 0 0 0-1.4.8Z"
      {...s}
    />
  ),
  sliders: (s) => (
    <>
      <Path d="M4 7h9.6M18.4 7H20M4 17h3.6M12.4 17H20" {...s} />
      <Circle cx={16} cy={7} r={2.4} {...s} />
      <Circle cx={10} cy={17} r={2.4} {...s} />
    </>
  ),
  help: (s) => (
    <>
      <Circle cx={12} cy={12} r={8.6} {...s} />
      <Path d="M9.5 9.6a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 4M12 17.4h.01" {...s} />
    </>
  ),
  search: (s) => (
    <>
      <Circle cx={10.8} cy={10.8} r={6.4} {...s} />
      <Path d="m15.6 15.6 4.6 4.6" {...s} />
    </>
  ),
  // The language picker's door: a globe with its equator and one meridian.
  globe: (s) => (
    <>
      <Circle cx={12} cy={12} r={8.6} {...s} />
      <Path
        d="M3.4 12h17.2M12 3.4c2.3 2.4 3.5 5.3 3.5 8.6s-1.2 6.2-3.5 8.6c-2.3-2.4-3.5-5.3-3.5-8.6S9.7 5.8 12 3.4z"
        {...s}
      />
    </>
  ),
  grid: (s) => (
    <>
      <Rect x={4} y={4} width={6.6} height={6.6} rx={1.6} {...s} />
      <Rect x={13.4} y={4} width={6.6} height={6.6} rx={1.6} {...s} />
      <Rect x={4} y={13.4} width={6.6} height={6.6} rx={1.6} {...s} />
      <Rect x={13.4} y={13.4} width={6.6} height={6.6} rx={1.6} {...s} />
    </>
  ),

  camera: (s) => (
    <>
      <Path
        d="M3.8 8.6a2 2 0 0 1 2-2h2.2l1.5-2.2h5l1.5 2.2h2.2a2 2 0 0 1 2 2v9.2a2 2 0 0 1-2 2H5.8a2 2 0 0 1-2-2V8.6Z"
        {...s}
      />
      <Circle cx={12} cy={12.8} r={3.4} {...s} />
    </>
  ),
  image: (s) => (
    <>
      <Rect x={3.6} y={4.4} width={16.8} height={15.2} rx={2.6} {...s} />
      <Circle cx={9} cy={9.6} r={1.8} {...s} />
      <Path d="m4.2 17.4 5.2-5.2 3.4 3.4 2.2-2.2 4.8 4.8" {...s} />
    </>
  ),
  flag: (s) => <Path d="M5.6 21V4.4m0 .4h11.6l-2.4 3.9 2.4 3.9H5.6" {...s} />,
  ban: (s) => (
    <>
      <Circle cx={12} cy={12} r={8.6} {...s} />
      <Path d="m5.9 5.9 12.2 12.2" {...s} />
    </>
  ),
  bell: (s) => (
    <>
      <Path d="M6.2 16.6V11a5.8 5.8 0 0 1 11.6 0v5.6l1.6 1.8H4.6l1.6-1.8Z" {...s} />
      <Path d="M10 20.6a2.2 2.2 0 0 0 4 0" {...s} />
    </>
  ),

  users: (s) => (
    <>
      <Circle cx={9.2} cy={8.6} r={3.4} {...s} />
      <Path d="M3 19.6a6.2 6.2 0 0 1 12.4 0" {...s} />
      <Path d="M15.4 5.4a3.3 3.3 0 0 1 0 6.4M17.4 14a6.2 6.2 0 0 1 3.6 5.6" {...s} />
    </>
  ),
  userPlus: (s) => (
    <>
      <Circle cx={10} cy={8.4} r={3.7} {...s} />
      <Path d="M2.9 20a7.3 7.3 0 0 1 14.2 0M19 7.4v6M16 10.4h6" {...s} />
    </>
  ),
  userCheck: (s) => (
    <>
      <Circle cx={10} cy={8.4} r={3.7} {...s} />
      <Path d="M2.9 20a7.3 7.3 0 0 1 14.2 0m-1.3-9.4 2 2 3.8-4.2" {...s} />
    </>
  ),
  userMinus: (s) => (
    <>
      <Circle cx={10} cy={8.4} r={3.7} {...s} />
      <Path d="M2.9 20a7.3 7.3 0 0 1 14.2 0M16 10.4h6" {...s} />
    </>
  ),

  // The inbox: a tray with its slot.
  inbox: (s) => (
    <>
      <Path
        d="M3.6 13.2 6.3 5.8a2 2 0 0 1 1.9-1.4h7.6a2 2 0 0 1 1.9 1.4l2.7 7.4v4.6a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2v-4.6Z"
        {...s}
      />
      <Path d="M3.6 13.2h4.6l1.4 2.6h4.8l1.4-2.6h4.6" {...s} />
    </>
  ),
  message: (s) => (
    <Path
      d="M20 14.6a2 2 0 0 1-2 2H9.8L5.2 20.2v-3.6H6a2 2 0 0 1-2-2V6.4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8.2Z"
      {...s}
    />
  ),
  // VS: two swords crossed, hilts down.
  swords: (s) => (
    <>
      <Path d="M8.8 15.2 19.4 4.6m0 0v3.6m0-3.6h-3.6M6 12.6l5.4 5.4M4.4 19.6l3-3" {...s} />
      <Path d="M15.2 15.2 4.6 4.6m0 0v3.6m0-3.6h3.6M18 12.6 12.6 18M19.6 19.6l-3-3" {...s} />
    </>
  ),

  calendar: (s) => (
    <>
      <Rect x={3.6} y={5.2} width={16.8} height={15.2} rx={2.6} {...s} />
      <Path d="M3.6 10h16.8M8 3.4v3.6M16 3.4v3.6" {...s} />
    </>
  ),
  hourglass: (s) => (
    <Path
      d="M6.4 3.6h11.2M6.4 20.4h11.2M7.6 3.6c0 4.6 4.4 5.4 4.4 8.4s-4.4 3.8-4.4 8.4M16.4 3.6c0 4.6-4.4 5.4-4.4 8.4s4.4 3.8 4.4 8.4"
      {...s}
    />
  ),

  trophy: (s) => (
    <>
      <Path d="M7.4 4h9.2v5.2a4.6 4.6 0 0 1-9.2 0V4Z" {...s} />
      <Path
        d="M7.4 6H4.6v1.4a3.2 3.2 0 0 0 3 3.2M16.6 6h2.8v1.4a3.2 3.2 0 0 1-3 3.2"
        {...s}
      />
      <Path d="M12 13.8v3.4M8.4 20.4h7.2M9.8 20.4l.4-3.2h3.6l.4 3.2" {...s} />
    </>
  ),
  qb: (s) => (
    <>
      <Circle cx={12} cy={12} r={9.6} {...s} />
      <Path
        d="M10.6 12.6a2.2 2.2 0 1 1-4.4 0a2.2 2.2 0 1 1 4.4 0M10.6 10.2V17M13.4 11.4a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0M13.4 7v6.8"
        {...s}
      />
    </>
  ),
  crown: (s) => (
    <>
      <Path d="M4 8.2 7.8 12 12 5.4 16.2 12 20 8.2l-1.6 9.4H5.6L4 8.2Z" {...s} />
      <Path d="M5.6 20.4h12.8" {...s} />
    </>
  ),
  medal: (s) => (
    <>
      <Circle cx={12} cy={15} r={5} {...s} />
      <Path d="M8.6 11.4 6 3.8h4l2 4.4 2-4.4h4l-2.6 7.6" {...s} />
    </>
  ),
  flame: (s) => (
    <Path
      d="M12 3.4c.6 3.2 4.8 5.2 4.8 10a4.8 4.8 0 0 1-9.6 0c0-2.2 1.2-3.6 2.4-4.6 0 1.6.8 2.8 2 3.2-.4-3 .4-6 .4-8.6Z"
      {...s}
    />
  ),
  heart: (s) => (
    <Path
      d="M12 19.6s-7.6-4.5-7.6-9.9A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.6 2.5c0 5.4-7.6 9.9-7.6 9.9Z"
      {...s}
    />
  ),
  bolt: (s) => <Path d="M13.2 3 5.6 13.4h6l-1 7.6 7.8-10.6h-6.2L13.2 3Z" {...s} />,
  arrowUp: (s) => <Path d="M12 19.5V4.5m0 0-6 6m6-6 6 6" {...s} />,
  hand: (s) => (
    <Path
      d="M9.6 11.6V5.4a1.6 1.6 0 0 1 3.2 0v5.2l4.4.8a2 2 0 0 1 1.6 2.2l-.6 4.6a3 3 0 0 1-3 2.6h-3.8a3 3 0 0 1-2.4-1.2l-3-4a1.6 1.6 0 0 1 2.4-2.1l1.2 1.1"
      {...s}
    />
  ),
  handStop: (s) => (
    <Path
      d="M8 13V6.4a1.4 1.4 0 0 1 2.8 0V11m0-.2V4.8a1.4 1.4 0 0 1 2.8 0v6m0-.2V5.8a1.4 1.4 0 0 1 2.8 0V11m0 .4V8.6a1.4 1.4 0 0 1 2.8 0v5a7.2 7.2 0 0 1-7.2 7.2 6.8 6.8 0 0 1-5.6-2.8l-2.2-3.2a1.5 1.5 0 0 1 2.3-1.9L8 14.2"
      {...s}
    />
  ),
  sparkle: (s) => (
    <>
      <Path
        d="M12 3.4 13.7 9l5.6 1.7-5.6 1.7L12 18l-1.7-5.6-5.6-1.7L10.3 9 12 3.4Z"
        {...s}
      />
      <Path
        d="M18.6 16.4l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z"
        {...s}
      />
    </>
  ),
  star: (s) => (
    <Path
      d="m12 3.6 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8L12 3.6Z"
      {...s}
    />
  ),
  clock: (s) => (
    <>
      <Circle cx={12} cy={12} r={8.6} {...s} />
      <Path d="M12 7.4V12l3 1.8" {...s} />
    </>
  ),
  vibrate: (s) => (
    <>
      <Rect x={8} y={4} width={8} height={16} rx={2.2} {...s} />
      <Path d="M4.6 9v6M19.4 9v6M2 11v2M22 11v2" {...s} />
    </>
  ),
  mountain: (s) => (
    <>
      <Path d="M2.8 19.6 9.6 8.4l3.4 5.6 2.2-3.2 6 8.8H2.8Z" {...s} />
      <Path d="M9.6 8.4V3.6l3.4 1.5-3.4 1.5" {...s} />
    </>
  ),
  trendUp: (s) => (
    <Path d="M3.6 16.8 9.4 11l3.8 3.8 7.2-7.2M15.2 7.6h5.2v5.2" {...s} />
  ),
  trendDown: (s) => (
    <Path d="M3.6 7.2 9.4 13l3.8-3.8 7.2 7.2M15.2 16.4h5.2v-5.2" {...s} />
  ),
  target: (s, color) => (
    <>
      <Circle cx={12} cy={12} r={8.6} {...s} />
      <Circle cx={12} cy={12} r={5} {...s} />
      <Circle cx={12} cy={12} r={1.5} fill={color} />
    </>
  ),

  alert: (s) => (
    <>
      <Path d="M12 3.6 21.4 20a1 1 0 0 1-.9 1.5H3.5a1 1 0 0 1-.9-1.5Z" {...s} />
      <Path d="M12 9.8v4.4M12 17.6h.01" {...s} />
    </>
  ),
  info: (s) => (
    <>
      <Circle cx={12} cy={12} r={8.6} {...s} />
      <Path d="M12 11.2v5M12 7.8h.01" {...s} />
    </>
  ),
  shield: (s) => (
    <>
      <Path
        d="M12 3 4.8 6v5.6c0 4.3 2.9 8.2 7.2 9.4 4.3-1.2 7.2-5.1 7.2-9.4V6L12 3Z"
        {...s}
      />
      <Path d="m9 12 2.2 2.2L15.2 10" {...s} />
    </>
  ),

  lock: (s) => (
    <>
      <Rect x={4.6} y={10.4} width={14.8} height={10.2} rx={2.6} {...s} />
      <Path d="M8 10.4V7.6a4 4 0 0 1 8 0v2.8M12 14.4v2.2" {...s} />
    </>
  ),
  mail: (s) => (
    <>
      <Rect x={3.2} y={5.2} width={17.6} height={13.6} rx={3} {...s} />
      <Path d="m4 7 8 6 8-6" {...s} />
    </>
  ),
  eye: (s) => (
    <>
      <Path
        d="M2.6 12S6 5.6 12 5.6 21.4 12 21.4 12 18 18.4 12 18.4 2.6 12 2.6 12Z"
        {...s}
      />
      <Circle cx={12} cy={12} r={2.8} {...s} />
    </>
  ),
  eyeOff: (s) => (
    <>
      <Path
        d="M10 5.8a9 9 0 0 1 2-.2c6 0 9.4 6.4 9.4 6.4a16 16 0 0 1-2.6 3.4M6.4 7.4A15.6 15.6 0 0 0 2.6 12S6 18.4 12 18.4a9.4 9.4 0 0 0 4.6-1.2"
        {...s}
      />
      <Path d="M10 10.2a2.8 2.8 0 0 0 3.8 3.8M3.6 3.6l16.8 16.8" {...s} />
    </>
  ),
  logout: (s) => (
    <>
      <Path
        d="M14 4.4H7a2.4 2.4 0 0 0-2.4 2.4v10.4A2.4 2.4 0 0 0 7 19.6h7"
        {...s}
      />
      <Path d="M10.4 12h10m0 0-3.4-3.4M20.4 12 17 15.4" {...s} />
    </>
  ),
  // Apple's logo is a filled shape in every colour it comes in, and drawn
  // edge to edge; inset so it sits at the weight of the stroke set.
  apple: (_s, color) => (
    <G transform="translate(2.6 2.4) scale(0.8)">
      <Path
        fill={color}
        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
      />
    </G>
  ),
};

/**
 * The glyphs that point somewhere along the line — forward, back, out, up the
 * chart — and so point the other way when the game reads right to left. The
 * layout turns itself around; a drawing does not.
 */
const MIRRORED: ReadonlySet<IconName> = new Set<IconName>([
  'chevron',
  'back',
  'logout',
  'trendUp',
  'trendDown',
  'history',
  'userPlus',
  'userCheck',
]);

const MIRROR = { transform: [{ scaleX: -1 }] };

export function Icon({
  name,
  size = 24,
  color,
  strokeWidth = 1.8,
  fill = 'none',
}: {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
  /** Paints the glyph's body too — a liked heart, a chosen star. */
  fill?: string;
}) {
  const stroke: Stroke = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill,
  };

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={IS_RTL && MIRRORED.has(name) ? MIRROR : undefined}
    >
      {GLYPHS[name](stroke, color)}
    </Svg>
  );
}
