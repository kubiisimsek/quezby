import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Txt } from '@/ui/kit/text';
import { Icon, type IconName } from '@/ui/icons';
import { CONTROL, DEPTH, RADIUS, SPACE, TYPE, useTheme } from '@/ui/theme';

export function Field({
  label,
  hint,
  error,
  icon,
  trailing,
  style,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  icon?: IconName;
  /** A control inside the well, after the text — a password's eye. */
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  const focus = useSharedValue(0);

  /** A well cut into the tile; the ring lights magenta while you type. */
  const ring = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focus.value,
      [0, 1],
      [
        error ? theme.badLine : theme.outline,
        error ? theme.bad : theme.primary,
      ],
    ),
    backgroundColor: interpolateColor(
      focus.value,
      [0, 1],
      [theme.sunken, theme.nightDeep],
    ),
  }));

  return (
    <View style={styles.field}>
      <Txt variant="micro" tone={error ? 'bad' : 'muted'}>
        {label}
      </Txt>
      <Animated.View style={[styles.inputWrap, ring]}>
        {icon ? <Icon name={icon} size={17} color={theme.inkFaint} strokeWidth={2.4} /> : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.inkFaint}
          {...props}
          onFocus={(event) => {
            focus.value = withTiming(1, { duration: 160 });
            onFocus?.(event);
          }}
          onBlur={(event) => {
            focus.value = withTiming(0, { duration: 160 });
            onBlur?.(event);
          }}
          style={[styles.input, TYPE.body, { color: theme.ink }, style]}
        />
        {trailing}
      </Animated.View>
      {error ? (
        <Txt variant="meta" tone="bad">
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="meta" tone="faint">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

/**
 * A password, with an eye to show what was typed. On a phone keyboard a
 * mistyped password is the commonest reason a first sign-in fails, and a
 * new one is typed blind twice otherwise.
 */
export function PasswordField({
  isNew = false,
  ...props
}: Omit<TextInputProps, 'secureTextEntry'> & {
  label: string;
  hint?: string;
  error?: string;
  /** A password being chosen, so the keychain offers to save it. */
  isNew?: boolean;
}) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  return (
    <Field
      icon="lock"
      autoCapitalize="none"
      autoCorrect={false}
      textContentType={isNew ? 'newPassword' : 'password'}
      autoComplete={isNew ? 'new-password' : 'current-password'}
      {...props}
      secureTextEntry={!visible}
      trailing={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
          hitSlop={10}
          onPress={() => setVisible((value) => !value)}
        >
          <Icon
            name={visible ? 'eyeOff' : 'eye'}
            size={18}
            color={theme.inkFaint}
          />
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  field: { gap: SPACE.sm },
  inputWrap: {
    alignItems: 'center',
    borderRadius: RADIUS.control,
    borderWidth: DEPTH.outline,
    flexDirection: 'row',
    gap: SPACE.ms,
    minHeight: CONTROL.lg,
    paddingHorizontal: SPACE.lg,
  },
  input: { flex: 1, paddingVertical: SPACE.ms },
});
