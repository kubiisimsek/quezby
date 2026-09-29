import type { Locale } from '@quezby/types';

import { iso } from '@/i18n/format';
import { plural } from '@/i18n/plural';

const NBSP = ' ';

/** The three ways to play from the lobby. A VS is played from a friend. */
export type PlayMode = 'daily' | 'free' | 'rated';

/**
 * The game's modes: Günlük (the day's feed), Normal (play as much as you
 * like) and Dereceli — the only one that plays for Elo, open once enough
 * Normal and Günlük games are played. The sheet the lobby's Oyna opens, its
 * tiles' lines, the HUD's pill, the way in and the moment it opens. The day's
 * rule is `t.daily.rule`; Elo's words are `t.rating`.
 */
const tr = {
  /** The sheet Oyna opens. */
  sheet: 'Mod seç',
  names: { daily: 'Günlük', free: 'Normal', rated: 'Dereceli' } satisfies Record<PlayMode, string>,
  /** Under a mode's name: what it plays for. */
  lines: {
    free: 'Skorun Zirve’ye yazılır',
    dailyPlayed: 'Bugünkü hakkını kullandın',
    rated: (target: string) => `Elo için oyna · Hedef ${target}`,
    /** Once the rating has made Dereceli harder. */
    ratedAt: (difficulty: string, target: string) => `Zorluk ${difficulty} · Hedef ${target}`,
  },
  /** The locked tile, read aloud. */
  lockedLabel: (remaining: number) => `Dereceli, kilitli: ${remaining} oyun kaldı`,
  /** The pill in the HUD of a rated run. */
  hud: 'Dereceli',
  /** A notice's name while Dereceli is shut. */
  ribbon: 'DERECELİ',
  lockedTitle: (remaining: number) => `Dereceli’ye ${remaining} oyun kaldı`,
  lockedBody: (required: number) => `Dereceli, ${required} Normal ya da Günlük oyundan sonra açılır.`,
  opened: {
    title: 'Dereceli açıldı!',
    body: (required: number) => `İlk ${required} dereceli oyunun Elo’nu belirler.`,
  },
  play: 'Dereceli oyna',
  playNormal: 'Normal oyna',
};

export type ModeMessages = typeof tr;

const en: ModeMessages = {
  sheet: 'Pick a mode',
  names: { daily: 'Daily', free: 'Normal', rated: 'Ranked' },
  lines: {
    free: 'Your score goes on the Summit',
    dailyPlayed: "You've used today's shot",
    rated: (target) => `Play for Elo · Target ${target}`,
    ratedAt: (difficulty, target) => `Difficulty ${difficulty} · Target ${target}`,
  },
  lockedLabel: (remaining) =>
    plural('en', remaining, { one: 'Ranked, locked: 1 game to go', other: `Ranked, locked: ${remaining} games to go` }),
  hud: 'Ranked',
  ribbon: 'RANKED',
  lockedTitle: (remaining) =>
    plural('en', remaining, { one: '1 game to Ranked', other: `${remaining} games to Ranked` }),
  lockedBody: (required) => `Ranked opens after ${required} Normal or Daily games.`,
  opened: {
    title: 'Ranked is open!',
    body: (required) => `Your first ${required} ranked games set your Elo.`,
  },
  play: 'Play Ranked',
  playNormal: 'Play Normal',
};

const de: ModeMessages = {
  sheet: 'Modus wählen',
  names: { daily: 'Täglich', free: 'Normal', rated: 'Gewertet' },
  lines: {
    free: 'Dein Score kommt auf den Gipfel',
    dailyPlayed: 'Dein Versuch für heute ist verbraucht',
    rated: (target) => `Spiel um Elo · Ziel ${target}`,
    ratedAt: (difficulty, target) => `Schwierigkeit ${difficulty} · Ziel ${target}`,
  },
  lockedLabel: (remaining) =>
    plural('de', remaining, {
      one: 'Gewertet, gesperrt: noch 1 Spiel',
      other: `Gewertet, gesperrt: noch ${remaining} Spiele`,
    }),
  hud: 'Gewertet',
  ribbon: 'GEWERTET',
  lockedTitle: (remaining) =>
    plural('de', remaining, { one: 'Noch 1 Spiel bis Gewertet', other: `Noch ${remaining} Spiele bis Gewertet` }),
  lockedBody: (required) => `Gewertet öffnet sich nach ${required} normalen oder täglichen Spielen.`,
  opened: {
    title: 'Gewertet ist offen!',
    body: (required) => `Deine ersten ${required} gewerteten Spiele bestimmen dein Elo.`,
  },
  play: 'Gewertet spielen',
  playNormal: 'Normal spielen',
};

const ar: ModeMessages = {
  sheet: 'اختر النمط',
  names: { daily: 'يومي', free: 'عادي', rated: 'مصنَّف' },
  lines: {
    free: 'تُسجَّل نتيجتك في القمة',
    dailyPlayed: 'استخدمت محاولة اليوم',
    rated: (target) => `العب من أجل إيلو · الهدف ${iso(target)}`,
    ratedAt: (difficulty, target) => `الصعوبة ${iso(difficulty)} · الهدف ${iso(target)}`,
  },
  lockedLabel: (remaining) =>
    plural('ar', remaining, {
      one: 'المصنَّف مقفل: بقيت مباراة واحدة',
      two: 'المصنَّف مقفل: بقيت مباراتان',
      few: `المصنَّف مقفل: بقيت ${remaining} مباريات`,
      many: `المصنَّف مقفل: بقيت ${remaining} مباراة`,
      other: `المصنَّف مقفل: بقيت ${remaining} مباراة`,
    }),
  hud: 'مصنَّف',
  ribbon: 'مصنَّف',
  lockedTitle: (remaining) =>
    plural('ar', remaining, {
      one: 'مباراة واحدة للوصول إلى المصنَّف',
      two: 'مباراتان للوصول إلى المصنَّف',
      few: `${remaining} مباريات للوصول إلى المصنَّف`,
      many: `${remaining} مباراة للوصول إلى المصنَّف`,
      other: `${remaining} مباراة للوصول إلى المصنَّف`,
    }),
  lockedBody: (required) => `يُفتح اللعب المصنَّف بعد ${required} مباراة عادية أو يومية.`,
  opened: {
    title: 'فُتح اللعب المصنَّف!',
    body: (required) =>
      plural('ar', required, {
        one: 'مباراتك المصنَّفة الأولى تحدد تصنيفك.',
        two: 'أول مباراتين مصنَّفتين لك تحددان تصنيفك.',
        few: `أول ${required} مباريات مصنَّفة لك تحدد تصنيفك.`,
        many: `أول ${required} مباراة مصنَّفة لك تحدد تصنيفك.`,
        other: `أول ${required} مباراة مصنَّفة لك تحدد تصنيفك.`,
      }),
  },
  play: 'العب مصنَّفًا',
  playNormal: 'العب عاديًا',
};

const fr: ModeMessages = {
  sheet: 'Choisis un mode',
  names: { daily: 'Quotidien', free: 'Normal', rated: 'Classé' },
  lines: {
    free: 'Ton score va au Sommet',
    dailyPlayed: 'Tu as utilisé ton essai du jour',
    rated: (target) => `Joue pour l’Elo · Objectif ${target}`,
    ratedAt: (difficulty, target) => `Difficulté ${difficulty} · Objectif ${target}`,
  },
  lockedLabel: (remaining) =>
    plural('fr', remaining, {
      one: `Classé, verrouillé${NBSP}: encore ${remaining} partie`,
      other: `Classé, verrouillé${NBSP}: encore ${remaining} parties`,
    }),
  hud: 'Classé',
  ribbon: 'CLASSÉ',
  lockedTitle: (remaining) =>
    plural('fr', remaining, {
      one: `Encore ${remaining} partie avant le mode classé`,
      other: `Encore ${remaining} parties avant le mode classé`,
    }),
  lockedBody: (required) => `Le mode classé s’ouvre après ${required} parties normales ou quotidiennes.`,
  opened: {
    title: `Le mode classé est ouvert${NBSP}!`,
    body: (required) => `Tes ${required} premières parties classées fixent ton Elo.`,
  },
  play: 'Jouer en classé',
  playNormal: 'Jouer en normal',
};

const es: ModeMessages = {
  sheet: 'Elige un modo',
  names: { daily: 'Diario', free: 'Normal', rated: 'Competitivo' },
  lines: {
    free: 'Tu puntuación va a la Cumbre',
    dailyPlayed: 'Ya usaste tu intento de hoy',
    rated: (target) => `Juega por Elo · Objetivo ${target}`,
    ratedAt: (difficulty, target) => `Dificultad ${difficulty} · Objetivo ${target}`,
  },
  lockedLabel: (remaining) =>
    plural('es', remaining, {
      one: 'Competitivo, bloqueado: falta 1 partida',
      other: `Competitivo, bloqueado: faltan ${remaining} partidas`,
    }),
  hud: 'Competitivo',
  ribbon: 'COMPETITIVO',
  lockedTitle: (remaining) =>
    plural('es', remaining, {
      one: 'Falta 1 partida para Competitivo',
      other: `Faltan ${remaining} partidas para Competitivo`,
    }),
  lockedBody: (required) => `Competitivo se abre después de ${required} partidas normales o diarias.`,
  opened: {
    title: '¡Competitivo abierto!',
    body: (required) => `Tus primeras ${required} partidas competitivas fijan tu Elo.`,
  },
  play: 'Jugar Competitivo',
  playNormal: 'Jugar Normal',
};

export const modes: Record<Locale, ModeMessages> = { tr, en, de, ar, fr, es };
