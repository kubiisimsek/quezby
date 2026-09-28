import { AVATAR } from '@quezby/config';
import { launchImageLibrary } from 'react-native-image-picker';

/** A photo from the library: where it is and its size in pixels. */
export type PickedPhoto = { uri: string; width: number; height: number };

export class PhotoUnusable extends Error {
  constructor(readonly reason: string) {
    super(`The photo cannot be used: ${reason}`);
    this.name = 'PhotoUnusable';
  }
}

/** Plenty for a 512-pixel square, and a phone keeps it in memory with ease. */
const LARGEST = 2048;

/**
 * One photo from the phone's library, through the system's own picker — it
 * asks for no permission, and the app sees only the photo picked. An iPhone's
 * HEIC comes back as a JPEG. Null when the player backs out; a photo too
 * small to fill a portrait is refused here, before any framing.
 */
export async function pickPhoto(): Promise<PickedPhoto | null> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    assetRepresentationMode: 'compatible',
    maxWidth: LARGEST,
    maxHeight: LARGEST,
    includeBase64: false,
  });
  if (result.didCancel) return null;
  if (result.errorCode) throw new PhotoUnusable(result.errorCode);
  const asset = result.assets?.[0];
  if (!asset?.uri || !asset.width || !asset.height) throw new PhotoUnusable('no_asset');
  if (Math.min(asset.width, asset.height) < AVATAR.minSide) throw new PhotoUnusable('too_small');
  return { uri: asset.uri, width: asset.width, height: asset.height };
}
