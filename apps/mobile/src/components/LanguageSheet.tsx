import { LOCALES, LOCALE_NAMES, isRtl } from '@quezby/config';
import type { Locale } from '@quezby/types';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLanguage, useT } from '@/i18n';
import { IS_RTL } from '@/i18n/native';
import { Icon } from '@/ui/icons';
import { Button, Divider, Panel, Txt } from '@/ui/kit';
import { AnimatedPressable, common } from '@/ui/kit/shared';
import { usePressScale } from '@/ui/motion';
import { Sheet } from '@/ui/sheet';
import { ARABIC_FONT, LATIN_FONT, RADIUS, SPACE, TYPE, useTheme, withAlpha } from '@/ui/theme';

/**
 * The six languages, each written in its own words and its own script —
 * whatever the game speaks now — with its name in the current language
 * under it. A language read the same way changes at once, the sheet still
 * open; one read the other way (to or from Arabic) asks first, because the
 * game closes and opens again to turn around.
 */
export function LanguageSheet({
  open,
  onClose,
  onClosed,
}: {
  open: boolean;
  onClose: () => void;
  onClosed?: () => void;
}) {
  const t = useT();
  const current = useLanguage((state) => state.locale);
  const [turning, setTurning] = useState<Locale | null>(null);

  const pick = (locale: Locale) => {
    if (locale === current) return;
    if (isRtl(locale) !== IS_RTL) {
      setTurning(locale);
      return;
    }
    void useLanguage.getState().choose(locale);
  };

  const close = () => {
    setTurning(null);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      onClosed={onClosed}
      title={t.language.title}
      description={t.language.description}
    >
      {turning ? (
        <Panel tone="sunken" elevation="flat" style={styles.confirm}>
          <Txt variant="title">{t.language.restartTitle}</Txt>
          <Txt variant="body" tone="muted">
            {t.language.restartBody(t.language.names[turning])}
          </Txt>
          <Button
            label={t.language.restart}
            tone="primary"
            icon="refresh"
            onPress={() => void useLanguage.getState().choose(turning)}
          />
          <Button label={t.language.cancel} tone="ghost" onPress={() => setTurning(null)} />
        </Panel>
      ) : (
        <Panel tone="sunken" elevation="flat" style={styles.group}>
          {LOCALES.map((locale, index) => (
            <View key={locale}>
              {index > 0 ? <Divider /> : null}
              <LanguageRow
                locale={locale}
                translated={t.language.names[locale]}
                chosen={locale === current}
                onPress={() => pick(locale)}
              />
            </View>
          ))}
        </Panel>
      )}
    </Sheet>
  );
}

/** A language's own name, set in a face that carries its script. */
function nameStyle(locale: Locale) {
  return isRtl(locale) ? styles.arabicName : styles.latinName;
}

function LanguageRow({
  locale,
  translated,
  chosen,
  onPress,
}: {
  locale: Locale;
  translated: string;
  chosen: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const press = usePressScale(0.985);
  const own = LOCALE_NAMES[locale];

  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityState={{ checked: chosen }}
      accessibilityLabel={own === translated ? own : `${own}, ${translated}`}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.row, press.style]}
    >
      <View
        style={[
          styles.code,
          { backgroundColor: chosen ? theme.ok : withAlpha(theme.onBrand, 0.08), borderColor: theme.outline },
        ]}
      >
        <Txt variant="label" tone={chosen ? 'onSolid' : 'muted'} style={styles.codeText}>
          {locale.toUpperCase()}
        </Txt>
      </View>
      <View style={common.flex}>
        <Txt variant="heading" style={nameStyle(locale)}>
          {own}
        </Txt>
        {own === translated ? null : (
          <Txt variant="meta" tone="muted">
            {translated}
          </Txt>
        )}
      </View>
      {chosen ? <Icon name="check" size={20} color={theme.ok} strokeWidth={2.8} /> : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: 0, paddingVertical: SPACE.xs },
  confirm: { gap: SPACE.md, padding: SPACE.lg },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACE.md,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.ms,
  },
  code: {
    alignItems: 'center',
    borderRadius: RADIUS.control,
    borderWidth: 2,
    height: 34,
    justifyContent: 'center',
    width: 44,
  },
  // The code is Latin in every language: its own face, never spaced out in Arabic.
  codeText: { fontFamily: LATIN_FONT.displayBold, letterSpacing: 0.6 },
  latinName: { fontFamily: LATIN_FONT.semibold, lineHeight: TYPE.heading.lineHeight },
  // Cairo's letters climb and hang further than Latin ones: more room for the line.
  arabicName: { fontFamily: ARABIC_FONT.bold, fontSize: 17, lineHeight: 28 },
});
