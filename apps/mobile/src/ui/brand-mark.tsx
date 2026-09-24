import Svg, {
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { arena as light, marks } from '@/ui/tokens';

/**
 * The Quezby mark — magenta running into violet, a round Q, and the swipe
 * that the whole game is made of. SVG, so no gradient module and no bitmap.
 */
export function BrandMark({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="quezby-mark" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={light.brandFrom} />
          <Stop offset="1" stopColor={light.brandTo} />
        </LinearGradient>
      </Defs>
      <Rect width={64} height={64} rx={18} fill="url(#quezby-mark)" />
      <SvgText
        x={29}
        y={45}
        fontSize={36}
        fontFamily="Rubik-Black"
        fill={light.onBrand}
        textAnchor="middle"
      >
        Q
      </SvgText>
      <Path
        d="M49 26V13m0 0-5 5m5-5 5 5"
        stroke={light.onBrand}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/**
 * Google's "G" in its four colours. Google's sign-in guidelines allow it only
 * unaltered, so it takes a size and nothing else — no tint, no theme.
 */
export function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill={marks.googleRed}
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill={marks.googleBlue}
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill={marks.googleYellow}
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill={marks.googleGreen}
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}
