import { AVATAR } from '@quezby/config';
import ImageEditor from '@react-native-community/image-editor';

/**
 * A profile photo from the library to what the API keeps: the square the
 * player framed, cut out of the photo, scaled to `AVATAR.size` and squeezed
 * down the JPEG qualities until it fits in `AVATAR.maxBytes`. The API
 * re-encodes whatever arrives anyway — and strips the photo's metadata —
 * so this only saves the upload and the refusal.
 */

/** A photo as the editor shows it: `frame` points a side, the photo covering it, zoomed and moved. */
export type Framing = {
  /** The photo's pixels. */
  width: number;
  height: number;
  /** The editor's square, in points. */
  frame: number;
  /** 1 fills the square with the photo's short side. */
  zoom: number;
  /** How far the photo's centre is moved from the square's, in points. */
  x: number;
  y: number;
};

export type CropRect = {
  offset: { x: number; y: number };
  size: { width: number; height: number };
};

/** Points per photo pixel at `zoom`: at 1 the photo's short side spans the square. */
function scaleOf({ width, height, frame, zoom }: Omit<Framing, 'x' | 'y'>): number {
  return (frame / Math.min(width, height)) * zoom;
}

/** How far the photo can move each way and still cover the square. */
export function panLimits(framing: Omit<Framing, 'x' | 'y'>): { x: number; y: number } {
  const scale = scaleOf(framing);
  return {
    x: Math.max(0, (framing.width * scale - framing.frame) / 2),
    y: Math.max(0, (framing.height * scale - framing.frame) / 2),
  };
}

/** A move kept inside the photo: the square never shows past its edge. */
export function clampPan(framing: Framing): { x: number; y: number } {
  const limits = panLimits(framing);
  return {
    x: Math.min(limits.x, Math.max(-limits.x, framing.x)),
    y: Math.min(limits.y, Math.max(-limits.y, framing.y)),
  };
}

/** The photo's pixels inside the square, as `cropImage` wants them — whole pixels, inside the photo. */
export function cropRect(framing: Framing): CropRect {
  const { width, height, frame } = framing;
  const { x, y } = clampPan(framing);
  const scale = scaleOf(framing);
  const side = Math.min(width, height, Math.round(frame / scale));
  const left = width / 2 - (frame / 2 + x) / scale;
  const top = height / 2 - (frame / 2 + y) / scale;
  return {
    offset: {
      x: Math.min(width - side, Math.max(0, Math.round(left))),
      y: Math.min(height - side, Math.max(0, Math.round(top))),
    },
    size: { width: side, height: side },
  };
}

/** The bytes a base64 string holds. */
export function base64Bytes(value: string): number {
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  return Math.floor((value.length * 3) / 4) - padding;
}

export class AvatarTooSmall extends Error {
  constructor() {
    super('The photo is too small');
    this.name = 'AvatarTooSmall';
  }
}

export class AvatarTooBig extends Error {
  constructor() {
    super('The photo does not fit');
    this.name = 'AvatarTooBig';
  }
}

/**
 * The framed square as a base64 JPEG of at most `AVATAR.maxBytes`: the best
 * quality that fits, trying `AVATAR.qualities` in order.
 */
export async function squeeze(uri: string, rect: CropRect): Promise<string> {
  const side = rect.size.width;
  if (side < AVATAR.minSide) throw new AvatarTooSmall();
  const out = Math.min(AVATAR.size, side);
  for (const quality of AVATAR.qualities) {
    const cropped = await ImageEditor.cropImage(uri, {
      ...rect,
      displaySize: { width: out, height: out },
      resizeMode: 'cover',
      quality,
      format: 'jpeg',
      includeBase64: true,
    });
    if (base64Bytes(cropped.base64) <= AVATAR.maxBytes) return cropped.base64;
  }
  throw new AvatarTooBig();
}
