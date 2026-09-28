import { ApiError } from '@quezby/sdk';
import ImageEditor from '@react-native-community/image-editor';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { usePanGesture, usePinchGesture } from 'react-native-gesture-handler';
import { launchImageLibrary } from 'react-native-image-picker';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { AvatarEditorScreen } from '@/screens/profile/AvatarEditorScreen';
import { buildMe } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({ api: { me: { updateAvatar: jest.fn() } } }));

const mocked = api as unknown as { me: { updateAvatar: jest.Mock } };

type Props = Parameters<typeof AvatarEditorScreen>[0];

const PHOTO = { uri: 'file:///photo.jpg', width: 1200, height: 900 };

async function renderEditor() {
  const navigation = { goBack: jest.fn(), setParams: jest.fn() };
  await renderWithProviders(
    <AvatarEditorScreen
      navigation={navigation as unknown as Props['navigation']}
      route={{ key: 'AvatarEditor-test', name: 'AvatarEditor', params: PHOTO } as Props['route']}
    />,
  );
  return navigation;
}

beforeEach(() => {
  jest.clearAllMocks();
  useSession.setState({ token: 'token', user: buildMe(), ranks: null, hydrated: true });
});

describe('AvatarEditorScreen', () => {
  it('cuts the framed square, squeezes it and makes it the profile photo', async () => {
    const photoUrl = 'https://api.test/api/v1/media/avatars/0123456789abcdef01234567.jpg';
    mocked.me.updateAvatar.mockResolvedValue({ user: buildMe({ avatarUrl: photoUrl }) });
    const navigation = await renderEditor();

    expect(screen.getByText('Fotoğrafın')).toBeOnTheScreen();
    expect(screen.getByLabelText('Fotoğrafının dairede görünen kısmı')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1));
    // Untouched, the circle holds the middle of the photo: its short side, whole.
    expect(ImageEditor.cropImage).toHaveBeenCalledWith(
      'file:///photo.jpg',
      expect.objectContaining({ offset: { x: 150, y: 0 }, size: { width: 900, height: 900 } }),
    );
    expect(mocked.me.updateAvatar).toHaveBeenCalledWith('AAAA');
    expect(useSession.getState().user?.avatarUrl).toBe(photoUrl);
  });

  it('cuts what a zoom and a move put in the circle, never past the photo', async () => {
    mocked.me.updateAvatar.mockResolvedValue({ user: buildMe() });
    await renderEditor();
    type Update = (event: Record<string, number>) => void;
    const pinch = jest.mocked(usePinchGesture).mock.lastCall?.[0] as unknown as { onUpdate: Update };
    const pan = jest.mocked(usePanGesture).mock.lastCall?.[0] as unknown as { onUpdate: Update };

    await act(async () => {
      pinch.onUpdate({ scaleChange: 2 });
      // Far past the edge: the move stops where the photo ends.
      pan.onUpdate({ changeX: 10_000, changeY: -10_000 });
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

    await waitFor(() => expect(mocked.me.updateAvatar).toHaveBeenCalled());
    // Zoomed ×2 the circle holds 450 pixels; the photo, pushed right and up as far as
    // it goes, shows its bottom-left corner.
    expect(ImageEditor.cropImage).toHaveBeenCalledWith(
      'file:///photo.jpg',
      expect.objectContaining({ offset: { x: 0, y: 450 }, size: { width: 450, height: 450 } }),
    );
  });

  it('says why a photo was not kept, and stays', async () => {
    mocked.me.updateAvatar.mockRejectedValue(new ApiError(422, 'photo_invalid', 'Bu fotoğraf kullanılamıyor.'));
    const navigation = await renderEditor();

    await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

    expect(await screen.findByText('Fotoğraf kaydedilemedi')).toBeOnTheScreen();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('picks another photo in place of this one', async () => {
    jest.mocked(launchImageLibrary).mockResolvedValueOnce({
      assets: [{ uri: 'file:///other.jpg', width: 800, height: 1000 }],
    });
    const navigation = await renderEditor();

    await fireEvent.press(screen.getByRole('button', { name: 'Başka fotoğraf seç' }));

    await waitFor(() =>
      expect(navigation.setParams).toHaveBeenCalledWith({ uri: 'file:///other.jpg', width: 800, height: 1000 }),
    );
    expect(launchImageLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ mediaType: 'photo', selectionLimit: 1, assetRepresentationMode: 'compatible' }),
    );
  });

  it('refuses a photo too small to be a portrait', async () => {
    jest.mocked(launchImageLibrary).mockResolvedValueOnce({
      assets: [{ uri: 'file:///tiny.jpg', width: 100, height: 90 }],
    });
    const navigation = await renderEditor();

    await fireEvent.press(screen.getByRole('button', { name: 'Başka fotoğraf seç' }));

    expect(await screen.findByText('Fotoğraf açılamadı')).toBeOnTheScreen();
    expect(navigation.setParams).not.toHaveBeenCalled();
  });
});
