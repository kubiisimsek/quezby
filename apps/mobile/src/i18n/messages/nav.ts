import type { Locale } from '@quezby/types';

/** The dock's five slots, and the screens that stand before the game: an update, no connection. */
const tr = {
  tabs: {
    leaderboard: 'Zirve',
    league: 'Lig',
    play: 'Oyna',
    friends: 'Arkadaşlar',
    profile: 'Profil',
  },
  updateTitle: 'Güncelleme gerekli',
  updateBody: (minVersion: string) =>
    `Bu sürüm (${minVersion} altı) artık desteklenmiyor. Oynamaya devam etmek için güncelle.`,
  openStore: 'Mağazada aç',
  offlineTitle: 'Bağlanamadık',
  retry: 'Tekrar dene',
};

export type NavMessages = typeof tr;

const en: NavMessages = {
  tabs: { leaderboard: 'Summit', league: 'League', play: 'Play', friends: 'Friends', profile: 'Profile' },
  updateTitle: 'Update required',
  updateBody: (minVersion) =>
    `This version (below ${minVersion}) is no longer supported. Update to keep playing.`,
  openStore: 'Open the store',
  offlineTitle: "Couldn't connect",
  retry: 'Try again',
};

const de: NavMessages = {
  tabs: { leaderboard: 'Gipfel', league: 'Liga', play: 'Spielen', friends: 'Freunde', profile: 'Profil' },
  updateTitle: 'Update erforderlich',
  updateBody: (minVersion) =>
    `Diese Version (unter ${minVersion}) wird nicht mehr unterstützt. Aktualisiere, um weiterzuspielen.`,
  openStore: 'Im Store öffnen',
  offlineTitle: 'Keine Verbindung',
  retry: 'Noch mal versuchen',
};

const ar: NavMessages = {
  tabs: { leaderboard: 'القمة', league: 'الدوري', play: 'العب', friends: 'الأصدقاء', profile: 'الملف' },
  updateTitle: 'التحديث مطلوب',
  updateBody: (minVersion) =>
    `هذا الإصدار (أقدم من ‎${minVersion}‎) لم يعد مدعومًا. حدّث اللعبة لتواصل اللعب.`,
  openStore: 'افتح المتجر',
  offlineTitle: 'تعذّر الاتصال',
  retry: 'حاول مجددًا',
};

const fr: NavMessages = {
  tabs: { leaderboard: 'Sommet', league: 'Ligue', play: 'Jouer', friends: 'Amis', profile: 'Profil' },
  updateTitle: 'Mise à jour requise',
  updateBody: (minVersion) =>
    `Cette version (antérieure à ${minVersion}) n'est plus prise en charge. Mets à jour pour continuer à jouer.`,
  openStore: 'Ouvrir le store',
  offlineTitle: 'Connexion impossible',
  retry: 'Réessayer',
};

const es: NavMessages = {
  tabs: { leaderboard: 'Cumbre', league: 'Liga', play: 'Jugar', friends: 'Amigos', profile: 'Perfil' },
  updateTitle: 'Actualización necesaria',
  updateBody: (minVersion) =>
    `Esta versión (anterior a ${minVersion}) ya no es compatible. Actualiza para seguir jugando.`,
  openStore: 'Abrir la tienda',
  offlineTitle: 'No pudimos conectar',
  retry: 'Reintentar',
};

export const nav: Record<Locale, NavMessages> = { tr, en, de, ar, fr, es };
