import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { IconButton } from '@/ui/kit/buttons';
import { Txt } from '@/ui/kit/text';
import { SPACE } from '@/ui/theme';

/**
 * A screen's head, drawn on the arena instead of in a navigation bar: its
 * name in Rubik on a hard shadow, a back slab when it was pushed, and one
 * action on the right. Games do not have app headers; this is the whole of
 * the chrome.
 */
export function TopBar({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  /** A pushed screen's way back — a slab with an arrow. */
  onBack?: () => void;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const t = useT();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + SPACE.sm }]}>
      {onBack ? <IconButton icon="back" label={t.kit.topBar.back} onPress={onBack} /> : null}
      <View style={styles.titles}>
        <Txt variant="display" numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="meta" tone="muted" numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACE.md,
    paddingBottom: SPACE.md,
    paddingHorizontal: SPACE.xl,
  },
  titles: { flex: 1, gap: 1 },
});
