import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import { getLocales } from 'react-native-localize';
import RNRestart from 'react-native-restart';

import { queryClient } from '@/api/queryClient';
import { currentLocale, phoneLocale, startupLocale, useLanguage } from '@/i18n/language';
import { startIn } from '@/i18n/script';

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
  startIn('tr');
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
    phone('zh-CN', 'fr-CA', 'de-DE');

    await useLanguage.getState().hydrate();

    expect(currentLocale()).toBe('fr');
  });

  it('speaks Japanese and Korean on a phone that does', async () => {
    phone('ja-JP', 'en-US');
    expect(phoneLocale()).toBe('ja');

    phone('ko-KR');
    expect(phoneLocale()).toBe('ko');
  });

  it('is English on a phone that speaks none of the eight', async () => {
    phone('zh-CN', 'pt-BR');

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

describe('the language a launch starts in, read before the app loads', () => {
  it('is the one the launch will speak: picked here, else the phone’s', async () => {
    phone('ko-KR');
    expect(await startupLocale()).toBe('ko');

    await AsyncStorage.setItem(KEY, JSON.stringify({ chosen: 'ja', device: 'ko', account: null }));
    expect(await startupLocale()).toBe('ja');
  });

  it('follows a phone whose own language changed since the pick, as hydrate does', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ chosen: 'ja', device: 'tr', account: null }));
    phone('ko-KR');

    expect(await startupLocale()).toBe('ko');
    await useLanguage.getState().hydrate();
    expect(currentLocale()).toBe('ko');
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

  it('reloads the app for Japanese or Korean, set in faces of their own', async () => {
    await useLanguage.getState().choose('ja');

    expect(RNRestart.restart).toHaveBeenCalledWith('faces:ja');
    expect(useLanguage.getState().phase).toBe('restarting');
    expect(I18nManager.forceRTL).not.toHaveBeenCalled();
    expect(JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}')).toMatchObject({ chosen: 'ja' });
  });

  it('reloads back to Latin faces from Japanese', async () => {
    startIn('ja');

    await useLanguage.getState().choose('en');

    expect(RNRestart.restart).toHaveBeenCalledWith('faces:en');
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

  it('waits for the caller to reload when it needs other faces', async () => {
    const reload = await useLanguage.getState().takeAccount({ id: 'p9', locale: 'ko' });

    expect(reload).toBe(true);
    expect(useLanguage.getState().phase).toBe('restarting');
    expect(RNRestart.restart).not.toHaveBeenCalled();

    await useLanguage.getState().reload();

    expect(RNRestart.restart).toHaveBeenCalledWith('faces:ko');
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
