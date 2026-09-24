import { usernameChecklist, USERNAME_MAX_LENGTH } from '@quezby/config';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { UsernameCheck } from '@/hooks/useUsernameCheck';
import { Icon } from '@/ui/icons';
import { Field, Txt } from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

/**
 * A username as it is typed: the rules ticking off under it, and whether the
 * API has it free — all before anything is sent. The box is uncontrolled and
 * case is folded by the rules, not in the box: a controlled input re-set on
 * every keystroke drops the keys that arrive before the round trip returns.
 */
export function UsernameField({
  value,
  onChange,
  check,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  check: UsernameCheck;
  autoFocus?: boolean;
}) {
  const theme = useTheme();
  const checklist = usernameChecklist(value);

  const trailing =
    check.state === 'checking' ? (
      <ActivityIndicator size="small" color={theme.inkFaint} />
    ) : check.state === 'available' || check.state === 'current' ? (
      <Icon name="check" size={18} color={theme.ok} strokeWidth={2.4} />
    ) : check.state === 'invalid' || check.state === 'taken' ? (
      <Icon name="alert" size={18} color={theme.bad} />
    ) : null;

  const error =
    check.state === 'invalid' || check.state === 'taken' ? check.message : undefined;
  const hint =
    check.state === 'available'
      ? `@${check.normalized} senin olabilir.`
      : check.state === 'current'
        ? 'Şu anki adın.'
        : check.state === 'unknown'
        ? 'Uygunluk şu an kontrol edilemedi; kaydederken yeniden denenecek.'
        : 'Sıralamada herkes seni bu adla görecek.';

  return (
    <View style={styles.block}>
      <Field
        label="Kullanıcı adı"
        icon="account"
        defaultValue={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        maxLength={USERNAME_MAX_LENGTH + 5}
        autoFocus={autoFocus}
        placeholder="ornek.kullanici"
        trailing={trailing}
        error={error}
        hint={hint}
      />
      <View style={styles.rules}>
        {checklist.map((item) => (
          <View key={item.rule} style={styles.rule}>
            <Icon
              name={item.met ? 'check' : 'close'}
              size={13}
              color={item.met ? theme.ok : theme.inkFaint}
              strokeWidth={2.4}
            />
            <Txt variant="meta" tone={item.met ? 'ok' : 'faint'}>
              {item.rule}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: SPACE.md },
  rules: { gap: SPACE.xs, paddingHorizontal: SPACE.xs },
  rule: { alignItems: 'center', flexDirection: 'row', gap: SPACE.sm },
});
