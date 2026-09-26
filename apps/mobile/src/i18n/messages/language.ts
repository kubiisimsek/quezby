import type { Locale } from '@quezby/types';

/**
 * The language picker — Ayarlar's "Dil" row and the welcome's small button.
 * The languages themselves are named in their own words (`LOCALE_NAMES`), not
 * here. `restart*` asks before a change that reloads the game (to or from
 * Arabic, which reads the other way).
 */
const tr = {
  title: 'Dil',
  /** Each language's name in this one — under its own name in the picker. */
  names: { tr: 'Türkçe', en: 'İngilizce', de: 'Almanca', ar: 'Arapça', fr: 'Fransızca', es: 'İspanyolca' } satisfies Record<Locale, string>,
  description: 'Oyun seçtiğin dilde konuşur.',
  change: 'Dili değiştir',
  restartTitle: 'Oyunu yeniden başlat',
  restartBody: (language: string) => `Oyun ${language} için kapanıp yeniden açılır.`,
  restart: 'Yeniden başlat',
  cancel: 'Vazgeç',
};

export type LanguageMessages = typeof tr;

const en: LanguageMessages = {
  title: 'Language',
  names: { tr: 'Turkish', en: 'English', de: 'German', ar: 'Arabic', fr: 'French', es: 'Spanish' },
  description: 'The game speaks the language you pick.',
  change: 'Change language',
  restartTitle: 'Restart the game',
  restartBody: (language) => `The game closes and opens again in ${language}.`,
  restart: 'Restart',
  cancel: 'Cancel',
};

const de: LanguageMessages = {
  title: 'Sprache',
  names: { tr: 'Türkisch', en: 'Englisch', de: 'Deutsch', ar: 'Arabisch', fr: 'Französisch', es: 'Spanisch' },
  description: 'Das Spiel spricht die Sprache, die du wählst.',
  change: 'Sprache ändern',
  restartTitle: 'Spiel neu starten',
  restartBody: (language) => `Das Spiel schließt sich und startet auf ${language} neu.`,
  restart: 'Neu starten',
  cancel: 'Abbrechen',
};

const ar: LanguageMessages = {
  title: 'اللغة',
  names: { tr: 'التركية', en: 'الإنجليزية', de: 'الألمانية', ar: 'العربية', fr: 'الفرنسية', es: 'الإسبانية' },
  description: 'تتحدث اللعبة باللغة التي تختارها.',
  change: 'تغيير اللغة',
  restartTitle: 'إعادة تشغيل اللعبة',
  restartBody: (language) => `ستُغلق اللعبة وتُفتح من جديد بلغة ‎${language}‎.`,
  restart: 'إعادة التشغيل',
  cancel: 'إلغاء',
};

const fr: LanguageMessages = {
  title: 'Langue',
  names: { tr: 'Turc', en: 'Anglais', de: 'Allemand', ar: 'Arabe', fr: 'Français', es: 'Espagnol' },
  description: 'Le jeu parle la langue que tu choisis.',
  change: 'Changer de langue',
  restartTitle: 'Redémarrer le jeu',
  restartBody: (language) => `Le jeu va se fermer et se rouvrir pour passer à ${language}.`,
  restart: 'Redémarrer',
  cancel: 'Annuler',
};

const es: LanguageMessages = {
  title: 'Idioma',
  names: { tr: 'Turco', en: 'Inglés', de: 'Alemán', ar: 'Árabe', fr: 'Francés', es: 'Español' },
  description: 'El juego habla el idioma que elijas.',
  change: 'Cambiar idioma',
  restartTitle: 'Reiniciar el juego',
  restartBody: (language) => `El juego se cerrará y se abrirá de nuevo en ${language}.`,
  restart: 'Reiniciar',
  cancel: 'Cancelar',
};

export const language: Record<Locale, LanguageMessages> = { tr, en, de, ar, fr, es };
