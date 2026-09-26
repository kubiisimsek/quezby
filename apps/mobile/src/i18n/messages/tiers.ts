import type { LeagueTier, Locale } from '@quezby/types';

/** The league tiers, capitalised as names, and a tier's league: "Altın lig". */
function tiersOf(names: Record<LeagueTier, string>, league: (name: string) => string) {
  return {
    names,
    league: (tier: LeagueTier) => league(names[tier]),
  };
}

const tr = tiersOf(
  { bronze: 'Bronz', silver: 'Gümüş', gold: 'Altın', platinum: 'Platin', diamond: 'Elmas' },
  (name) => `${name} lig`,
);

export type TierMessages = typeof tr;

const en: TierMessages = tiersOf(
  { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum', diamond: 'Diamond' },
  (name) => `${name} league`,
);

const de: TierMessages = tiersOf(
  { bronze: 'Bronze', silver: 'Silber', gold: 'Gold', platinum: 'Platin', diamond: 'Diamant' },
  (name) => `${name}-Liga`,
);

const ar: TierMessages = tiersOf(
  { bronze: 'البرونز', silver: 'الفضة', gold: 'الذهب', platinum: 'البلاتين', diamond: 'الماس' },
  (name) => `دوري ${name}`,
);

const fr: TierMessages = tiersOf(
  { bronze: 'Bronze', silver: 'Argent', gold: 'Or', platinum: 'Platine', diamond: 'Diamant' },
  (name) => `Ligue ${name}`,
);

const es: TierMessages = tiersOf(
  { bronze: 'Bronce', silver: 'Plata', gold: 'Oro', platinum: 'Platino', diamond: 'Diamante' },
  (name) => `Liga ${name}`,
);

export const tiers: Record<Locale, TierMessages> = { tr, en, de, ar, fr, es };
