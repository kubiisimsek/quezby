import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import { getLocales } from 'react-native-localize';
import RNRestart from 'react-native-restart';

import { queryClient } from '@/api/queryClient';
import { currentLocale, phoneLocale, useLanguage } from '@/i18n/language';

const KEY = 'quezby.language.v1';
const GUARD = 'quezby.direction.v1';

const phone = (...tags: string[]) =>
  jest.mocked(getLocales).mockReturnValue(
    tags.map((languageTag) => ({
      languageTag,
      languageCode: languageTag.split('-')[0] ?? languageTag,
      countryCode: languageTag.split('-')[1] ?? '',
      isRTL: languageTag.startsWith('ar'),
    })),
  );

/** The phone reads right to left from now on, as after a reload. */
const readingRtl = (rtl: boolean) => {
  Object.defineProperty(I18nManager, 'isRTL', { value: rtl, configurable: true });
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.mocked(RNRestart.restart).mockClear();
  jest.spyOn(I18nManager, 'allowRTL').mockImplementation(() => undefined);
  jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => undefined);
  readingRtl(false);
  phone('tr-TR');
});

afterEach(() => {
  readingRtl(false);
  jest.restoreAllMocks();
});

describe('the language at launch', () => {
  it('is the phone’s on a first launch, and nothing is stored for it', async () => {
    phone('de-AT', 'en-US');

    await useLanguage.getState().hydrate();

    expect(useLanguage.getState()).toMatchObject({ locale: 'de', chosen: null, phase: 'ready' });
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('takes the first of the phone’s languages the game speaks', async () => {
    phone('ja-JP', 'fr-CA', 'de-DE');

    await useLanguage.getState().hydrate();

    expect(currentLocale()).toBe('fr');
  });

  it('is English on a phone that speaks none of the six', async () => {
    phone('ja-JP', 'pt-BR');

    expect(phoneLocale()).toBeNull();
    await useLanguage.getState().hydrate();

    expect(currentLocale()).toBe('en');
  });

  it('is the one picked on this phone, whatever the phone speaks', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ chosen: 'es', device: 'tr', account: 'p1' }));

    await useLanguage.getState().hydrate();

    expect(useLanguage.getState()).toMatchObject({ locale: 'es', chosen: 'es', account: 'p1' });
  });

  it('follows the phone when its language was changed since — the newer wish', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ chosen: 'es', device: 'tr', account: 'p1' }));
    phone('de-DE');

    await useLanguage.getState().hydrate();

    expect(useLanguage.getState()).toMatchObject({ locale: 'de', chosen: 'de', device: 'de' });
    expect(JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}')).toMatchObject({ chosen: 'de', device: 'de' });
  });

  it('turns the app around when the language reads the other way, once', async () => {
    phone('ar-SA');

    await useLanguage.getState().hydrate();

    expect(I18nManager.allowRTL).toHaveBeenCalledWith(true);
    expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);
    expect(RNRestart.restart).toHaveBeenCalledTimes(1);
    expect(useLanguage.getState().phase).toBe('restarting');
  });

  it('never reloads again and again when turning around does not take', async () => {
    phone('ar-SA');
    await useLanguage.getState().hydrate();
    // The reload came back still reading left to right.
    useLanguage.setState({ phase: 'loading' });

    await useLanguage.getState().hydrate();

    expect(RNRestart.restart).toHaveBeenCalledTimes(1);
    expect(useLanguage.getState()).toMatchObject({ locale: 'ar', phase: 'ready' });
  });

  it('forgets the guard once the app reads the right way', async () => {
    await AsyncStorage.setItem(GUARD, JSON.stringify({ to: 'rtl', build: '1.0.0+1' }));
    phone('ar-SA');
    readingRtl(true);

    await useLanguage.getState().hydrate();

    expect(RNRestart.restart).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(GUARD)).toBeNull();
  });
});

describe('choosing a language', () => {
  beforeEach(async () => {
    await useLanguage.getState().hydrate();
  });

  it('changes at once between languages read the same way, and remembers it', async () => {
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    await useLanguage.getState().choose('fr');

    expect(currentLocale()).toBe('fr');
    expect(RNRestart.restart).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalled();
    expect(JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}')).toEqual({
      chosen: 'fr',
      device: 'tr',
      account: null,
    });
  });

  it('reloads the app for Arabic, after the choice is stored', async () => {
    await useLanguage.getState().choose('ar');

    expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);
    expect(RNRestart.restart).toHaveBeenCalledTimes(1);
    expect(JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}')).toMatchObject({ chosen: 'ar' });
  });

  it('always tries a turn the player asked for, even after one that did not take', async () => {
    await AsyncStorage.setItem(GUARD, JSON.stringify({ to: 'rtl', build: '1.0.0+1' }));

    await useLanguage.getState().choose('ar');

    expect(RNRestart.restart).toHaveBeenCalledTimes(1);
  });
});

describe('an account’s language', () => {
  beforeEach(async () => {
    await useLanguage.getState().hydrate();
  });

  it('is taken at once when it reads the same way', async () => {
    const flip = await useLanguage.getState().takeAccount({ id: 'p9', locale: 'de' });

    expect(flip).toBe(false);
    expect(useLanguage.getState()).toMatchObject({ locale: 'de', chosen: 'de', account: 'p9' });
  });

  it('waits for the caller to reload when it reads the other way', async () => {
    const flip = await useLanguage.getState().takeAccount({ id: 'p9', locale: 'ar' });

    expect(flip).toBe(true);
    expect(RNRestart.restart).not.toHaveBeenCalled();
    expect(JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}')).toMatchObject({ chosen: 'ar', account: 'p9' });

    await useLanguage.getState().reload();

    expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);
    expect(RNRestart.restart).toHaveBeenCalledTimes(1);
  });
});
