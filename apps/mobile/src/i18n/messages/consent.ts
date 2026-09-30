import type { Locale } from '@quezby/types';

/**
 * The one question about usage analytics (`ConsentCard`): a new account's
 * step once it is in, and once in the lobby of a phone that predates it. It says what is counted
 * and what never leaves the phone, and never says "tracking". The switch in
 * Ayarlar that changes the answer later has its own words.
 */
const tr = {
  ribbon: 'SENİN SEÇİMİN',
  title: 'Oyunu birlikte geliştirelim mi?',
  body: 'İzin verirsen hangi ekranlara girdiğini ve ne kadar oynadığını sayarız; oyunu buna göre iyileştiririz. Adın, e-postan ya da konumun gönderilmez.',
  later: 'Kararını Ayarlar’dan istediğin zaman değiştirirsin.',
  deny: 'İzin verme',
  allow: 'İzin ver',
};

export type ConsentMessages = typeof tr;

const en: ConsentMessages = {
  ribbon: 'YOUR CHOICE',
  title: 'Shall we improve the game together?',
  body: 'If you allow it, we count which screens you open and how long you play, and use that to make the game better. Your name, email and location are never sent.',
  later: 'You can change your mind anytime in Settings.',
  deny: "Don't allow",
  allow: 'Allow',
};

const de: ConsentMessages = {
  ribbon: 'DEINE WAHL',
  title: 'Wollen wir das Spiel gemeinsam verbessern?',
  body: 'Wenn du es erlaubst, zählen wir, welche Bildschirme du aufrufst und wie lange du spielst, und machen das Spiel damit besser. Dein Name, deine E-Mail und dein Standort werden nie gesendet.',
  later: 'Du kannst deine Entscheidung jederzeit in den Einstellungen ändern.',
  deny: 'Nicht erlauben',
  allow: 'Erlauben',
};

const ar: ConsentMessages = {
  ribbon: 'اختيارك',
  title: 'هل نطوّر اللعبة معًا؟',
  body: 'إن سمحت، نحصي الشاشات التي تفتحها والمدة التي تلعبها، ونحسّن اللعبة على هذا الأساس. لا يُرسَل اسمك ولا بريدك الإلكتروني ولا موقعك.',
  later: 'يمكنك تغيير قرارك في أي وقت من الإعدادات.',
  deny: 'عدم السماح',
  allow: 'السماح',
};

const fr: ConsentMessages = {
  ribbon: 'TON CHOIX',
  title: 'On améliore le jeu ensemble ?',
  body: 'Si tu acceptes, on compte les écrans que tu ouvres et combien de temps tu joues, pour améliorer le jeu. Ton nom, ton e-mail et ta position ne sont jamais envoyés.',
  later: "Tu peux changer d'avis à tout moment dans Réglages.",
  deny: 'Refuser',
  allow: 'Autoriser',
};

const es: ConsentMessages = {
  ribbon: 'TU ELECCIÓN',
  title: '¿Mejoramos el juego juntos?',
  body: 'Si lo permites, contamos qué pantallas abres y cuánto tiempo juegas, y así mejoramos el juego. Tu nombre, tu correo y tu ubicación nunca se envían.',
  later: 'Puedes cambiar tu decisión cuando quieras en Ajustes.',
  deny: 'No permitir',
  allow: 'Permitir',
};

const ja: ConsentMessages = {
  ribbon: 'あなたが決める',
  title: '一緒にゲームをよくしませんか？',
  body: '許可すると、開いた画面とプレイ時間をカウントして、ゲームの改善に役立てます。名前、メールアドレス、位置情報が送られることはありません。',
  later: 'あとからいつでも設定で変更できます。',
  deny: '許可しない',
  allow: '許可する',
};

const ko: ConsentMessages = {
  ribbon: '당신의 선택',
  title: '함께 게임을 더 좋게 만들어 볼까요?',
  body: '허용하면 어떤 화면을 여는지, 얼마나 플레이하는지 세어서 게임을 더 좋게 만드는 데 써요. 이름, 이메일, 위치는 절대 전송되지 않아요.',
  later: '설정에서 언제든지 바꿀 수 있어요.',
  deny: '허용 안 함',
  allow: '허용',
};

export const consent: Record<Locale, ConsentMessages> = { tr, en, de, ar, fr, es, ja, ko };
