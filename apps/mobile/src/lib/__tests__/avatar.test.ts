import { AVATAR } from '@quezby/config';
import ImageEditor from '@react-native-community/image-editor';

import {
  AvatarTooBig,
  AvatarTooSmall,
  base64Bytes,
  clampPan,
  cropRect,
  panLimits,
  squeeze,
} from '@/lib/avatar';

const cropImage = jest.mocked(ImageEditor.cropImage);

/** A crop answer whose base64 decodes to `bytes`. */
function cropped(bytes: number) {
  return {
    uri: 'file:///cropped.jpg',
    path: '/cropped.jpg',
    name: 'cropped.jpg',
    width: 512,
    height: 512,
    size: bytes,
    type: 'image/jpeg' as const,
    base64: 'A'.repeat(Math.ceil((bytes * 4) / 3)),
  };
}

describe('framing a photo', () => {
  // A 4000 × 3000 photo in a 300-point square: its short side fills it.
  const photo = { width: 4000, height: 3000, frame: 300 };

  it('lets the photo move only as far as it still covers the square', () => {
    expect(panLimits({ ...photo, zoom: 1 })).toEqual({ x: 50, y: 0 });
    expect(panLimits({ ...photo, zoom: 2 })).toEqual({ x: 250, y: 150 });
    expect(clampPan({ ...photo, zoom: 1, x: 999, y: -40 })).toEqual({ x: 50, y: -0 });
  });

  it('cuts the middle square of an untouched photo', () => {
    expect(cropRect({ ...photo, zoom: 1, x: 0, y: 0 })).toEqual({
      offset: { x: 500, y: 0 },
      size: { width: 3000, height: 3000 },
    });
  });

  it('follows a zoom and a move, and never cuts past the photo', () => {
    // Zoomed ×2 the square holds 1500 pixels; centred it would start at 1250.
    // Moved right by 100 points (500 pixels), it shows more of the left.
    expect(cropRect({ ...photo, zoom: 2, x: 100, y: 0 })).toEqual({
      offset: { x: 750, y: 750 },
      size: { width: 1500, height: 1500 },
    });
    // Moved far past the edge: the move is clamped first.
    expect(cropRect({ ...photo, zoom: 1, x: 900, y: 900 })).toEqual({
      offset: { x: 0, y: 0 },
      size: { width: 3000, height: 3000 },
    });
  });
});

describe('squeezing a photo to fit', () => {
  const rect = { offset: { x: 0, y: 0 }, size: { width: 1024, height: 1024 } };

  beforeEach(() => cropImage.mockReset());

  it('counts the bytes a base64 string holds', () => {
    expect(base64Bytes('QUJD')).toBe(3);
    expect(base64Bytes('QUI=')).toBe(2);
    expect(base64Bytes('QQ==')).toBe(1);
  });

  it('takes the best quality that fits in 100 KB, scaled to 512 pixels', async () => {
    cropImage
      .mockResolvedValueOnce(cropped(AVATAR.maxBytes + 5_000))
      .mockResolvedValueOnce(cropped(80_000));

    const image = await squeeze('file:///photo.jpg', rect);

    expect(base64Bytes(image)).toBeLessThanOrEqual(AVATAR.maxBytes);
    expect(cropImage).toHaveBeenCalledTimes(2);
    expect(cropImage).toHaveBeenNthCalledWith(1, 'file:///photo.jpg', expect.objectContaining({
      ...rect,
      displaySize: { width: 512, height: 512 },
      format: 'jpeg',
      quality: 0.85,
      includeBase64: true,
    }));
    expect(cropImage.mock.calls[1]?.[1]).toMatchObject({ quality: 0.75 });
  });

  it('never scales a smaller square up', async () => {
    cropImage.mockResolvedValue(cropped(20_000));

    await squeeze('file:///photo.jpg', { offset: { x: 0, y: 0 }, size: { width: 300, height: 300 } });

    expect(cropImage.mock.calls[0]?.[1]).toMatchObject({ displaySize: { width: 300, height: 300 } });
  });

  it('refuses a square too small to be a portrait, and one that never fits', async () => {
    await expect(
      squeeze('file:///photo.jpg', { offset: { x: 0, y: 0 }, size: { width: 100, height: 100 } }),
    ).rejects.toBeInstanceOf(AvatarTooSmall);

    cropImage.mockResolvedValue(cropped(AVATAR.maxBytes + 1));
    await expect(squeeze('file:///photo.jpg', rect)).rejects.toBeInstanceOf(AvatarTooBig);
    expect(cropImage).toHaveBeenCalledTimes(AVATAR.qualities.length);
  });
});
