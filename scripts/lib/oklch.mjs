/**
 * OKLCH, the space both design systems are authored in: the game's palette
 * (`apps/mobile/design/palette.mjs`) and the admin panel's tokens
 * (`apps/admin/src/index.css`).
 */

/** OKLCH → linear sRGB, unclamped. */
export function oklchToLinearSrgb(l, c, h) {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const L = l_ ** 3;
  const M = m_ ** 3;
  const S = s_ ** 3;

  return [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
}

/** OKLCH → linear sRGB → gamma-encoded hex. */
export function oklchToHex(l, c, h, alpha = 1) {
  const channels = oklchToLinearSrgb(l, c, h).map((v) => {
    const encoded = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, encoded)) * 255);
  });

  const hex = channels.map((v) => v.toString(16).padStart(2, '0')).join('');
  if (alpha >= 1) return `#${hex}`;
  return `#${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;
}

const OKLCH = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/;

/** `oklch(0.55 0.215 352)` → `{ l, c, h, alpha }`, or null for anything else. */
export function parseOklch(value) {
  const match = String(value).trim().match(OKLCH);
  if (!match) return null;
  return {
    l: Number(match[1]),
    c: Number(match[2]),
    h: Number(match[3]),
    alpha: match[4] === undefined ? 1 : Number(match[4]),
  };
}

/** WCAG 2 relative luminance of an opaque OKLCH colour, clipped to sRGB the way a screen shows it. */
export function relativeLuminance({ l, c, h }) {
  const [r, g, b] = oklchToLinearSrgb(l, c, h).map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio between two opaque colours, 1 to 21. */
export function contrastRatio(foreground, background) {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}
