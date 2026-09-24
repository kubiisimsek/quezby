import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/ui/icons';
import {
  Button,
  Callout,
  IconChip,
  Slab,
  Txt,
  buttonColors,
  type ButtonTone,
  type TagTone,
} from '@/ui/kit';
import { ArrowNub } from '@/ui/kit/rows';
import { FADE_OUT, SPRING } from '@/ui/motion';
import { DEPTH, RADIUS, SPACE, shadow, useTheme } from '@/ui/theme';

const SCREEN_H = Dimensions.get('window').height;

/**
 * The app's only overlay.
 *
 * It used to be a `Modal` with `animationType="slide"`, which slides the whole
 * window — scrim included — up from the bottom as one opaque slab. Nothing on
 * screen was actually moving independently, so it read as a screen push rather
 * than an overlay, and it could not respond to a finger at all.
 *
 * Now the two layers move separately and both are driven by the same shared
 * value: the scrim fades while the panel springs, and dragging the header down
 * drives the panel *and* fades the scrim back out in proportion. Let go past a
 * third of the height — or flick it — and it closes.
 */
export function Sheet({
  open,
  onClose,
  onClosed,
  title,
  description,
  toolbar,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /**
   * After the sheet has left the screen entirely. Anything that presents a
   * native screen of its own — a share sheet, another sheet — must wait for
   * this: presented over a sheet that is still dismissing, iOS takes it down
   * together with the sheet.
   */
  onClosed?: () => void;
  title: string;
  description?: string;
  /** Pinned under the title, above the scrolling body — a search field. */
  toolbar?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  /** The modal outlives `open` by one animation, so the exit can be seen. */
  const [mounted, setMounted] = useState(open);
  const entered = useRef(false);
  const wasMounted = useRef(open);
  const closedRef = useRef(onClosed);
  closedRef.current = onClosed;

  // iOS reports the end of a dismissal through `onDismiss`; elsewhere the
  // modal is gone as soon as it unmounts.
  useEffect(() => {
    if (mounted) {
      wasMounted.current = true;
      return;
    }
    if (!wasMounted.current) return;
    wasMounted.current = false;
    if (Platform.OS !== 'ios') closedRef.current?.();
  }, [mounted]);

  const y = useSharedValue(SCREEN_H);
  const height = useSharedValue(SCREEN_H);
  const grabbedAt = useSharedValue(0);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (!entered.current) return;
    entered.current = false;
    y.value = withTiming(height.value, FADE_OUT, (done) => {
      if (done) runOnJS(setMounted)(false);
    });
  }, [open, y, height]);

  /** Entry waits for the first layout so the panel travels its own height and
   *  not the whole screen — a 200pt sheet flying 900pt looks like a rocket. */
  const onLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      const measured = event.nativeEvent.layout.height;
      height.value = measured;
      if (open && !entered.current) {
        entered.current = true;
        y.value = measured;
        y.value = withSpring(0, SPRING);
      }
    },
    [open, y, height],
  );

  const close = useCallback(() => onClose(), [onClose]);

  const drag = Gesture.Pan()
    .onBegin(() => {
      grabbedAt.value = y.value;
    })
    .onUpdate((event) => {
      // Downward only. Rubber-band an upward pull instead of letting the
      // panel lift off the bottom edge and show canvas underneath it.
      const next = grabbedAt.value + event.translationY;
      y.value = next < 0 ? next / 6 : next;
    })
    .onEnd((event) => {
      const past = y.value > height.value * 0.3;
      const flicked = event.velocityY > 900;
      if (past || flicked) {
        runOnJS(close)();
      } else {
        y.value = withSpring(0, SPRING, undefined);
      }
    });

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  /** One value drives both layers, so a half-finished drag is never
   *  a fully dark scrim over a half-gone panel. */
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [0, height.value], [1, 0], 'clamp'),
  }));

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={close}
      onDismiss={() => {
        if (Platform.OS === 'ios') closedRef.current?.();
      }}
      statusBarTranslucent
    >
      <View style={styles.fill}>
        <Animated.View
          style={[styles.fill, { backgroundColor: theme.scrim }, scrimStyle]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kapat"
            style={styles.fill}
            onPress={close}
          />
        </Animated.View>

        <KeyboardAvoidingView
          style={styles.dock}
          pointerEvents="box-none"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View
            onLayout={onLayout}
            style={[
              styles.sheet,
              shadow(theme, 'overlay'),
              {
                backgroundColor: theme.tile,
                borderColor: theme.outline,
                paddingBottom: Math.max(insets.bottom, SPACE.md),
              },
              panelStyle,
            ]}
          >
            <View
              pointerEvents="none"
              style={[styles.edge, { backgroundColor: theme.tileHi }]}
            />
            <GestureDetector gesture={drag}>
              <View style={styles.handle}>
                <View
                  style={[styles.grip, { backgroundColor: theme.lineStrong }]}
                />
                <View style={styles.header}>
                  <View style={styles.headerText}>
                    <Txt variant="title">{title}</Txt>
                    {description ? (
                      <Txt variant="meta" tone="muted">
                        {description}
                      </Txt>
                    ) : null}
                  </View>
                  <Slab
                    colors={buttonColors(theme, 'danger')}
                    radius={12}
                    lip={DEPTH.lipSm}
                    onPress={close}
                    hitSlop={12}
                    accessibilityLabel="Kapat"
                    faceStyle={styles.closeButton}
                  >
                    <Icon name="close" size={18} color={theme.onBrand} strokeWidth={3.2} />
                  </Slab>
                </View>
              </View>
            </GestureDetector>

            {toolbar ? <View style={styles.toolbar}>{toolbar}</View> : null}

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/**
 * A sheet that saves. The field rhythm, the error slot and the confirm
 * live here, so a screen supplies only its `Field`s. A sheet whose save
 * takes something away — deleting an account — confirms in `danger`.
 */
export function FormSheet({
  open,
  onClose,
  onClosed,
  title,
  description,
  onSubmit,
  submitLabel = 'Kaydet',
  submitIcon,
  submitTone = 'primary',
  pending = false,
  disabled = false,
  error,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Once the sheet has fully left — open the next overlay from here. */
  onClosed?: () => void;
  title: string;
  description?: string;
  onSubmit: () => void;
  submitLabel?: string;
  submitIcon?: Parameters<typeof Icon>[0]['name'];
  submitTone?: Extract<ButtonTone, 'primary' | 'danger'>;
  pending?: boolean;
  disabled?: boolean;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      onClosed={onClosed}
      title={title}
      description={description}
      footer={
        <Button
          label={submitLabel}
          icon={submitIcon}
          tone={submitTone}
          onPress={onSubmit}
          loading={pending}
          disabled={disabled}
        />
      }
    >
      <View style={styles.form}>
        {children}
        {error ? <Callout tone="bad">{error}</Callout> : null}
      </View>
    </Sheet>
  );
}

/**
 * A short menu hung off a single control — the header's `+`, where one glyph
 * has to stand for two or three different "add" actions, or a row whose tap
 * offers what can be done with it: share a result, sign out.
 *
 * A sheet rather than a popover because the trigger sits in the top bar and a
 * popover there puts its targets in the hardest part of the screen to reach.
 * An action that changes a record says so with its tone — `bad` for the one
 * that takes something away.
 */
export function ActionSheet({
  open,
  onClose,
  title,
  description,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  actions: Array<{
    label: string;
    hint?: string;
    icon: IconName;
    tone?: TagTone;
    onPress: () => void;
  }>;
}) {
  const theme = useTheme();
  const chosen = useRef<(() => void) | null>(null);

  /** Runs the chosen action once, whichever of the two signals comes first. */
  const runChosen = useCallback(() => {
    const action = chosen.current;
    chosen.current = null;
    action?.();
  }, []);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onClosed={runChosen}
      title={title}
      description={description}
    >
      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => {
              // The action runs once the menu is off the screen, so a share
              // sheet or the next sheet never opens over one still leaving.
              // The timer is the fallback for a platform that never says so.
              chosen.current = action.onPress;
              onClose();
              setTimeout(runChosen, 650);
            }}
            style={({ pressed }) => [
              styles.action,
              {
                backgroundColor: theme.raised,
                borderColor: theme.outline,
                transform: [{ translateY: pressed ? 3 : 0 }],
              },
            ]}
          >
            <IconChip
              icon={action.icon}
              tone={action.tone ?? 'primary'}
              size="md"
            />
            <View style={styles.flex}>
              <Txt
                variant="heading"
                tone={action.tone === 'bad' ? 'bad' : 'ink'}
              >
                {action.label}
              </Txt>
              {action.hint ? (
                <Txt variant="meta" tone="muted">
                  {action.hint}
                </Txt>
              ) : null}
            </View>
            <ArrowNub />
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  dock: { bottom: 0, left: 0, position: 'absolute', right: 0 },
  actions: { gap: SPACE.ms },
  action: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + DEPTH.lipSm,
    borderRadius: RADIUS.panel,
    borderWidth: DEPTH.outline,
    flexDirection: 'row',
    gap: SPACE.md,
    padding: SPACE.lg,
  },
  sheet: {
    borderBottomWidth: 0,
    borderTopLeftRadius: RADIUS.overlay,
    borderTopRightRadius: RADIUS.overlay,
    borderWidth: DEPTH.outline + 0.5,
    maxHeight: SCREEN_H * 0.9,
    overflow: 'hidden',
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.sm,
  },
  edge: {
    height: 3,
    left: RADIUS.overlay,
    position: 'absolute',
    right: RADIUS.overlay,
    top: 2,
    borderRadius: RADIUS.pill,
  },
  handle: { paddingBottom: SPACE.ms },
  grip: {
    alignSelf: 'center',
    borderRadius: RADIUS.pill,
    height: 4,
    marginBottom: SPACE.md,
    opacity: 0.7,
    width: 40,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: SPACE.md,
  },
  headerText: { flex: 1, gap: SPACE.xxs },
  closeButton: { height: 36, width: 36 },
  toolbar: { paddingBottom: SPACE.ms },
  body: { flexShrink: 1 },
  bodyContent: { paddingBottom: SPACE.md, paddingTop: SPACE.xs },
  form: { gap: SPACE.lg },
  footer: { paddingTop: SPACE.ms },
});
