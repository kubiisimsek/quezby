import type { Locale } from '@quezby/types';

import { iso } from '@/i18n/format';
import { plural } from '@/i18n/plural';

/**
 * VS: the sheet that sends one, the result of a VS run, and the lobby's
 * notice for a VS waiting for the player. `name` is a friend's name as `handle`
 * writes it (`@ekin`).
 */
const tr = {
  /** The sheet that starts a VS — its one gold "Oyna" plays first. */
  sheet: {
    title: 'VS',
    you: 'SEN',
    rules: {
      seed: 'Aynı akış; ikinize de birer hak.',
      first: (name: string) => `Önce sen oynarsın; skorun ${name} oynayana kadar gizli kalır.`,
      time: 'Arkadaşının oynamak için süresi var; dolarsa VS kimseye sayılmaz.',
      counts: 'VS hiçbir sıralamaya, lige ya da istatistiğe yazılmaz.',
    },
    play: 'Oyna',
  },
  /** A VS run's end, from the API's answer. */
  result: {
    sent: 'VS GÖNDERİLDİ',
    sentBody: (name: string) => `${name} oynayınca sonuç mesaj kutuna düşer. Skorun o zamana kadar gizli.`,
    won: 'KAZANDIN!',
    lost: 'KAYBETTİN',
    draw: 'BERABERE',
    you: 'Sen',
    invalid: 'geçersiz',
    unfinished: 'bitmedi',
    voidTitle: 'VS gönderilmedi',
    voidBody: 'Bu tur geçersiz sayıldı; VS arkadaşına gitmedi.',
    closed: 'Bu VS kapandı.',
    h2h: (wins: number, losses: number) => `Aranızda ${wins} – ${losses}`,
    rematch: 'Rövanş',
    toThread: 'Mesajlara dön',
  },
  /** The lobby's notice for each VS waiting for the player: ✓ plays it, ✗ turns it down. */
  notice: {
    eyebrow: 'SENİ BEKLEYEN VS',
    title: (name: string) => `${name} sana VS attı`,
    /** The notice's body, which opens the conversation. */
    label: (name: string) => `${name} sana VS attı, sohbeti aç`,
    /** Past the three the lobby shows. */
    more: (_count: number, count: string) => `${count} VS daha`,
  },
  hud: (name: string) => `VS · ${name}`,
};

export type VsMessages = typeof tr;

const en: VsMessages = {
  sheet: {
    title: 'VS',
    you: 'YOU',
    rules: {
      seed: 'The same feed, one go each.',
      first: (name) => `You play first; your score stays hidden until ${name} plays.`,
      time: 'Your friend has a while to play; if it runs out, the VS counts for nobody.',
      counts: 'A VS never counts on a board, a league or your stats.',
    },
    play: 'Play',
  },
  result: {
    sent: 'VS SENT',
    sentBody: (name) => `Once ${name} plays, the result lands in your inbox. Your score stays hidden till then.`,
    won: 'YOU WON!',
    lost: 'YOU LOST',
    draw: 'DRAW',
    you: 'You',
    invalid: 'invalid',
    unfinished: 'unfinished',
    voidTitle: 'VS not sent',
    voidBody: "This run didn't count, so the VS didn't go to your friend.",
    closed: 'This VS is closed.',
    h2h: (wins, losses) => `Between you: ${wins} – ${losses}`,
    rematch: 'Rematch',
    toThread: 'Back to chat',
  },
  notice: {
    eyebrow: 'VS WAITING FOR YOU',
    title: (name) => `${name} sent you a VS`,
    label: (name) => `${name} sent you a VS, open the chat`,
    more: (_count, count) => `${count} more VS`,
  },
  hud: (name) => `VS · ${name}`,
};

const de: VsMessages = {
  sheet: {
    title: 'VS',
    you: 'DU',
    rules: {
      seed: 'Derselbe Feed, für jeden ein Versuch.',
      first: (name) => `Du spielst zuerst; deine Punkte bleiben verborgen, bis ${name} gespielt hat.`,
      time: 'Dein Freund hat eine Weile Zeit; läuft sie ab, zählt das VS für niemanden.',
      counts: 'Ein VS zählt nie für Ranglisten, Liga oder Statistik.',
    },
    play: 'Spielen',
  },
  result: {
    sent: 'VS GESCHICKT',
    sentBody: (name) => `Sobald ${name} spielt, landet das Ergebnis in deinem Postfach. Bis dahin bleiben deine Punkte verborgen.`,
    won: 'GEWONNEN!',
    lost: 'VERLOREN',
    draw: 'UNENTSCHIEDEN',
    you: 'Du',
    invalid: 'ungültig',
    unfinished: 'nicht beendet',
    voidTitle: 'VS nicht geschickt',
    voidBody: 'Diese Runde zählte nicht, deshalb ging das VS nicht an deinen Freund.',
    closed: 'Dieses VS ist geschlossen.',
    h2h: (wins, losses) => `Zwischen euch: ${wins} – ${losses}`,
    rematch: 'Revanche',
    toThread: 'Zurück zum Chat',
  },
  notice: {
    eyebrow: 'EIN VS WARTET AUF DICH',
    title: (name) => `${name} hat dir ein VS geschickt`,
    label: (name) => `${name} hat dir ein VS geschickt, Chat öffnen`,
    more: (_count, count) => `${count} weitere VS`,
  },
  hud: (name) => `VS · ${name}`,
};

const ar: VsMessages = {
  sheet: {
    title: 'تحدٍّ',
    you: 'أنت',
    rules: {
      seed: 'الخلاصة نفسها، ومحاولة واحدة لكل منكما.',
      first: (name) => `تلعب أولًا؛ وتبقى نتيجتك مخفية حتى يلعب ${name}.`,
      time: 'لدى صديقك مهلة للعب؛ وإن انتهت فلا يُحتسب التحدي لأحد.',
      counts: 'لا يُحتسب التحدي في أي ترتيب أو دوري أو إحصاءات.',
    },
    play: 'العب',
  },
  result: {
    sent: 'أُرسل التحدي',
    sentBody: (name) => `عندما يلعب ${name} تصل النتيجة إلى صندوق رسائلك. وتبقى نتيجتك مخفية حتى ذلك الحين.`,
    won: 'فزت!',
    lost: 'خسرت',
    draw: 'تعادل',
    you: 'أنت',
    invalid: 'غير صالحة',
    unfinished: 'لم تكتمل',
    voidTitle: 'لم يُرسل التحدي',
    voidBody: 'لم تُحتسب هذه الجولة، فلم يصل التحدي إلى صديقك.',
    closed: 'أُغلق هذا التحدي.',
    h2h: (wins, losses) => `بينكما: ${wins} – ${losses}`,
    rematch: 'مباراة ثأر',
    toThread: 'عد إلى المحادثة',
  },
  notice: {
    eyebrow: 'تحدٍّ بانتظارك',
    title: (name) => `${iso(name)} أرسل لك تحديًا`,
    label: (name) => `${iso(name)} أرسل لك تحديًا، افتح المحادثة`,
    more: (count, text) =>
      plural('ar', count, {
        one: 'تحدٍّ آخر',
        two: 'تحدّيان آخران',
        few: `${text} تحديات أخرى`,
        many: `${text} تحديًا آخر`,
        other: `${text} تحدٍّ آخر`,
      }),
  },
  hud: (name) => `تحدٍّ · ${name}`,
};

const fr: VsMessages = {
  sheet: {
    title: 'VS',
    you: 'TOI',
    rules: {
      seed: 'Le même fil, une chance chacun.',
      first: (name) => `Tu joues en premier ; ton score reste caché jusqu’à ce que ${name} joue.`,
      time: 'Ton ami a un moment pour jouer ; s’il le laisse passer, le VS ne compte pour personne.',
      counts: 'Un VS ne compte jamais au classement, en ligue ni dans tes stats.',
    },
    play: 'Jouer',
  },
  result: {
    sent: 'VS ENVOYÉ',
    sentBody: (name) => `Dès que ${name} joue, le résultat arrive dans ta boîte. Ton score reste caché d’ici là.`,
    won: 'GAGNÉ !',
    lost: 'PERDU',
    draw: 'MATCH NUL',
    you: 'Toi',
    invalid: 'invalide',
    unfinished: 'inachevée',
    voidTitle: 'VS non envoyé',
    voidBody: 'Cette partie n’a pas compté, le VS n’est pas parti chez ton ami.',
    closed: 'Ce VS est fermé.',
    h2h: (wins, losses) => `Entre vous : ${wins} – ${losses}`,
    rematch: 'Revanche',
    toThread: 'Retour à la discussion',
  },
  notice: {
    eyebrow: 'UN VS T’ATTEND',
    title: (name) => `${name} t’a lancé un VS`,
    label: (name) => `${name} t’a lancé un VS, ouvrir la discussion`,
    more: (_count, count) => `${count} VS de plus`,
  },
  hud: (name) => `VS · ${name}`,
};

const es: VsMessages = {
  sheet: {
    title: 'VS',
    you: 'TÚ',
    rules: {
      seed: 'El mismo feed, un intento para cada uno.',
      first: (name) => `Juegas primero; tu puntuación queda oculta hasta que ${name} juegue.`,
      time: 'Tu amigo tiene un tiempo para jugar; si se acaba, el VS no cuenta para nadie.',
      counts: 'Un VS nunca cuenta en clasificaciones, ligas ni estadísticas.',
    },
    play: 'Jugar',
  },
  result: {
    sent: 'VS ENVIADO',
    sentBody: (name) => `Cuando ${name} juegue, el resultado llegará a tu buzón. Hasta entonces tu puntuación queda oculta.`,
    won: '¡GANASTE!',
    lost: 'PERDISTE',
    draw: 'EMPATE',
    you: 'Tú',
    invalid: 'no válida',
    unfinished: 'sin terminar',
    voidTitle: 'VS no enviado',
    voidBody: 'Esta partida no contó, así que el VS no llegó a tu amigo.',
    closed: 'Este VS está cerrado.',
    h2h: (wins, losses) => `Entre ustedes: ${wins} – ${losses}`,
    rematch: 'Revancha',
    toThread: 'Volver al chat',
  },
  notice: {
    eyebrow: 'UN VS TE ESPERA',
    title: (name) => `${name} te mandó un VS`,
    label: (name) => `${name} te mandó un VS, abrir el chat`,
    more: (_count, count) => `${count} VS más`,
  },
  hud: (name) => `VS · ${name}`,
};

export const vs: Record<Locale, VsMessages> = { tr, en, de, ar, fr, es };
