import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SHRINK_TO_FIT } from '@/i18n/native';
import { Icon, type IconName } from '@/ui/icons';
import { DEPTH, FONT, RADIUS, SPACE, embossed, lh, useTheme } from '@/ui/theme';

/**
 * One surface, two to four views of it — the boards' periods — as a game's
 * tab strip: a dark groove with the chosen view raised out of it as a
 * magenta slab. An optional count rides in the segment.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon?: IconName; count?: number }>;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        segmented.track,
        { backgroundColor: theme.well, borderColor: theme.outline },
      ]}
    >
      {options.map((option) => {
        const on = option.value === value;
        const ink = on ? theme.onBrand : theme.inkMuted;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              segmented.item,
              on
                ? {
                    backgroundColor: theme.primary,
                    borderBottomColor: theme.primaryLip,
                    borderColor: theme.outline,
                  }
                : { borderColor: 'transparent', borderBottomColor: 'transparent' },
              { opacity: pressed && !on ? 0.7 : 1 },
            ]}
          >
            {on ? (
              <View
                pointerEvents="none"
                style={[segmented.hi, { backgroundColor: theme.primaryHi }]}
              />
            ) : null}
            {option.icon ? (
              <Icon name={option.icon} size={15} color={ink} strokeWidth={2.6} />
            ) : null}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit={SHRINK_TO_FIT}
              style={[segmented.label, { color: ink }, on ? embossed(1.5) : null]}
            >
              {option.label}
            </Text>
            {option.count === undefined ? null : (
              <View
                style={[
                  segmented.count,
                  { backgroundColor: on ? theme.primaryLip : theme.fill },
                ]}
              >
                <Text style={[segmented.countText, { color: ink }]}>
                  {option.count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const segmented = StyleSheet.create({
  track: {
    borderRadius: RADIUS.control + 2,
    borderWidth: DEPTH.outline,
    flexDirection: 'row',
    gap: 3,
    padding: 3,
  },
  item: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + 3,
    borderRadius: RADIUS.control - 2,
    borderWidth: DEPTH.outline,
    flex: 1,
    flexDirection: 'row',
    gap: SPACE.xs,
    justifyContent: 'center',
    minHeight: 40,
    overflow: 'hidden',
    paddingHorizontal: SPACE.xs,
  },
  hi: { height: '48%', left: 0, position: 'absolute', right: 0, top: 0 },
  label: { fontFamily: FONT.display, fontSize: 14, lineHeight: lh(18) },
  count: {
    borderRadius: RADIUS.pill,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countText: { fontFamily: FONT.display, fontSize: 11, lineHeight: lh(14), textAlign: 'center' },
});
