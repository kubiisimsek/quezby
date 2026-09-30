import type { Locale } from '@quezby/types';

/** The dock's five slots, and the screens that stand before the game: an update, no connection. */
const tr = {
  tabs: {
    leaderboard: 'Zirve',
    league: 'Lig',
    play: 'Oyna',
    inbox: 'Mesajlar',
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
  tabs: { leaderboard: 'Summit', league: 'League', play: 'Play', inbox: 'Messages', profile: 'Profile' },
  updateTitle: 'Update required',
  updateBody: (minVersion) =>
    `This version (below ${minVersion}) is no longer supported. Update to keep playing.`,
  openStore: 'Open the store',
  offlineTitle: "Couldn't connect",
  retry: 'Try again',
};

const de: NavMessages = {
  tabs: { leaderboard: 'Gipfel', league: 'Liga', play: 'Spielen', inbox: 'Chats', profile: 'Profil' },
  updateTitle: 'Update erforderlich',
  updateBody: (minVersion) =>
    `Diese Version (unter ${minVersion}) wird nicht mehr unterstützt. Aktualisiere, um weiterzuspielen.`,
  openStore: 'Im Store öffnen',
  offlineTitle: 'Keine Verbindung',
  retry: 'Noch mal versuchen',
};

const ar: NavMessages = {
  tabs: { leaderboard: 'القمة', league: 'الدوري', play: 'العب', inbox: 'الرسائل', profile: 'الملف' },
  updateTitle: 'التحديث مطلوب',
  updateBody: (minVersion) =>
    `هذا الإصدار (أقدم من ‎${minVersion}‎) لم يعد مدعومًا. حدّث اللعبة لتواصل اللعب.`,
  openStore: 'افتح المتجر',
  offlineTitle: 'تعذّر الاتصال',
  retry: 'حاول مجددًا',
};

const fr: NavMessages = {
  tabs: { leaderboard: 'Sommet', league: 'Ligue', play: 'Jouer', inbox: 'Messages', profile: 'Profil' },
  updateTitle: 'Mise à jour requise',
  updateBody: (minVersion) =>
    `Cette version (antérieure à ${minVersion}) n'est plus prise en charge. Mets à jour pour continuer à jouer.`,
  openStore: 'Ouvrir le store',
  offlineTitle: 'Connexion impossible',
  retry: 'Réessayer',
};

const es: NavMessages = {
  tabs: { leaderboard: 'Cumbre', league: 'Liga', play: 'Jugar', inbox: 'Mensajes', profile: 'Perfil' },
  updateTitle: 'Actualización necesaria',
  updateBody: (minVersion) =>
    `Esta versión (anterior a ${minVersion}) ya no es compatible. Actualiza para seguir jugando.`,
  openStore: 'Abrir la tienda',
  offlineTitle: 'No pudimos conectar',
  retry: 'Reintentar',
};

const ja: NavMessages = {
  tabs: { leaderboard: 'トップ', league: 'リーグ', play: 'プレイ', inbox: 'メッセージ', profile: 'プロフィール' },
  updateTitle: 'アップデートが必要です',
  updateBody: (minVersion) =>
    `このバージョン（${minVersion}未満）はサポートが終了しました。プレイを続けるにはアップデートしてください。`,
  openStore: 'ストアを開く',
  offlineTitle: '接続できませんでした',
  retry: '再試行',
};

const ko: NavMessages = {
  tabs: { leaderboard: '정상', league: '리그', play: '플레이', inbox: '메시지', profile: '프로필' },
  updateTitle: '업데이트가 필요해요',
  updateBody: (minVersion) =>
    `이 버전(${minVersion} 미만)은 더 이상 지원되지 않아요. 계속 플레이하려면 업데이트하세요.`,
  openStore: '스토어 열기',
  offlineTitle: '연결할 수 없어요',
  retry: '다시 시도',
};

export const nav: Record<Locale, NavMessages> = { tr, en, de, ar, fr, es, ja, ko };
