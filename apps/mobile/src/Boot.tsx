import { useEffect, useState, type ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';

import { startupLocale } from '@/i18n/language';
import { startIn } from '@/i18n/script';
import { arena } from '@/ui/tokens';

/**
 * What the app registers: it reads the language this launch starts in, tells
 * the faces (`startIn`), and only then loads the app — whose style sheets are
 * built once, with the faces of that script: Latin, Japanese or Korean.
 * Nothing it imports may build a style sheet. The wait is a read from the
 * phone's storage, behind the arena's own colour.
 */
export function Boot() {
  const [App, setApp] = useState<ComponentType | null>(null);

  useEffect(() => {
    let alive = true;
    void startupLocale()
      .catch(() => null)
      .then((locale) => {
        if (locale) startIn(locale);
        return import('./App');
      })
      .then((loaded) => {
        if (alive) setApp(() => loaded.default);
      });
    return () => {
      alive = false;
    };
  }, []);

  return App ? <App /> : <View style={styles.wait} />;
}

const styles = StyleSheet.create({
  wait: { backgroundColor: arena.nightDeep, flex: 1 },
});
