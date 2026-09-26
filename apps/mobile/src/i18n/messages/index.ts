import type { Locale } from '@quezby/types';

import { formatsFor, type Formats } from '@/i18n/format';

import { auth } from './auth';
import { board } from './board';
import { bonus } from './bonus';
import { consent } from './consent';
import { daily } from './daily';
import { device } from './device';
import { errors } from './errors';
import { friends } from './friends';
import { game } from './game';
import { help } from './help';
import { home } from './home';
import { kit } from './kit';
import { language } from './language';
import { league } from './league';
import { nav } from './nav';
import { profile } from './profile';
import { reels } from './reels';
import { result } from './result';
import { tiers } from './tiers';
import { username } from './username';
import { usernameRules } from './usernameRules';
import { welcome } from './welcome';

/**
 * Every word the game says, in one language — `useT()` hands the current one
 * to a screen. One file per area of the game holds its lines in all six
 * languages side by side; Turkish is the source and fixes the shape, so a
 * line missing in any language does not compile.
 */
const AREAS = {
  auth,
  board,
  bonus,
  consent,
  daily,
  device,
  errors,
  friends,
  game,
  help,
  home,
  kit,
  language,
  league,
  nav,
  profile,
  reels,
  result,
  tiers,
  username,
  usernameRules,
  welcome,
};

type Areas = typeof AREAS;

export type Messages = { [Area in keyof Areas]: Areas[Area]['tr'] } & {
  /** Numbers, times and lists the language's way. */
  fmt: Formats;
  locale: Locale;
};

function catalog(locale: Locale): Messages {
  const areas = Object.fromEntries(
    Object.entries(AREAS).map(([area, lines]) => [area, lines[locale]]),
  ) as { [Area in keyof Areas]: Areas[Area]['tr'] };
  return { ...areas, fmt: formatsFor(locale), locale };
}

export const CATALOGS: Readonly<Record<Locale, Messages>> = {
  tr: catalog('tr'),
  en: catalog('en'),
  de: catalog('de'),
  ar: catalog('ar'),
  fr: catalog('fr'),
  es: catalog('es'),
};
