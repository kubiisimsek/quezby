import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSaveAvatar } from '@/hooks/useAvatar';
import { useT } from '@/i18n';
import { cropRect } from '@/lib/avatar';
import { messageFor } from '@/lib/errors';
import { pickPhoto } from '@/lib/photoPicker';
import type { RootStackParamList } from '@/navigation/types';
import { Button, Callout, Screen, TopBar } from '@/ui/kit';
import { DEPTH, SPACE, useTheme } from '@/ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AvatarEditor'>;

/** How far in a photo can be pulled: four times its short side filling the circle. */
const MAX_ZOOM = 4;

/** The circle's rim, outside the square the photo is cut from. */
const RIM = DEPTH.outline + 2;

/**
 * Framing the profile photo: the picked photo fills a circle the size of the
 * portrait-to-be; one finger moves it, two zoom it, and it never shows past
 * its own edge. Kaydet cuts out what is in the circle, squeezes it to fit the
 * API's 100 KB and makes it the photo; the other slab picks another one.
 */
export function AvatarEditorScreen({ navigation, route }: Props) {
  const { uri, width, height } = route.params;
  const theme = useTheme();
  const t = useT();
  const words = t.profile.avatarEditor;
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const frame = Math.min(window.width - SPACE.xl * 2, 320);
  const base = frame / Math.min(width, height);
  const save = useSaveAvatar();
  const [pickFailed, setPickFailed] = useState(false);

  const zoom = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  // Another photo starts centred, unzoomed.
  useEffect(() => {
    zoom.value = 1;
    x.value = 0;
    y.value = 0;
  }, [uri, x, y, zoom]);

  const pan = usePanGesture({
    onUpdate: (event) => {
      'worklet';
      const limitX = Math.max(0, (width * base * zoom.value - frame) / 2);
      const limitY = Math.max(0, (height * base * zoom.value - frame) / 2);
      x.value = Math.min(limitX, Math.max(-limitX, x.value + event.changeX));
      y.value = Math.min(limitY, Math.max(-limitY, y.value + event.changeY));
    },
  });
  const pinch = usePinchGesture({
    onUpdate: (event) => {
      'worklet';
      zoom.value = Math.min(MAX_ZOOM, Math.max(1, zoom.value * event.scaleChange));
      const limitX = Math.max(0, (width * base * zoom.value - frame) / 2);
      const limitY = Math.max(0, (height * base * zoom.value - frame) / 2);
      x.value = Math.min(limitX, Math.max(-limitX, x.value));
      y.value = Math.min(limitY, Math.max(-limitY, y.value));
    },
  });
  const gesture = useSimultaneousGestures(pan, pinch);

  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: zoom.value }],
  }));

  const another = async () => {
    setPickFailed(false);
    try {
      const photo = await pickPhoto();
      if (photo) navigation.setParams(photo);
    } catch {
      setPickFailed(true);
    }
  };

  const keep = () => {
    const rect = cropRect({ width, height, frame, zoom: zoom.value, x: x.value, y: y.value });
    save.mutate({ uri, rect }, { onSuccess: () => navigation.goBack() });
  };

  return (
    <Screen>
      <TopBar title={words.title} subtitle={words.tagline} onBack={() => navigation.goBack()} />
      <View style={styles.stage}>
        <GestureDetector gesture={gesture}>
          <View
            accessible
            accessibilityLabel={words.frame}
            style={[
              styles.frame,
              {
                borderColor: theme.outline,
                borderRadius: frame / 2 + RIM,
                height: frame + RIM * 2,
                width: frame + RIM * 2,
              },
            ]}
          >
            <Animated.Image
              source={{ uri }}
              resizeMode="cover"
              style={[
                styles.photo,
                {
                  height: height * base,
                  left: (frame - width * base) / 2,
                  top: (frame - height * base) / 2,
                  width: width * base,
                },
                photoStyle,
              ]}
            />
          </View>
        </GestureDetector>
      </View>
      <View style={[styles.dock, { paddingBottom: insets.bottom + SPACE.lg }]}>
        {save.isError ? (
          <Callout tone="bad" title={words.failed}>
            {messageFor(save.error, t)}
          </Callout>
        ) : null}
        {pickFailed ? <Callout tone="bad">{t.profile.photo.failed}</Callout> : null}
        <Button label={words.save} icon="check" tone="primary" loading={save.isPending} onPress={keep} />
        <Button label={words.another} icon="image" tone="ghost" size="md" disabled={save.isPending} onPress={() => void another()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  frame: { borderWidth: RIM, overflow: 'hidden' },
  photo: { position: 'absolute' },
  dock: { gap: SPACE.sm, paddingHorizontal: SPACE.xl },
});
