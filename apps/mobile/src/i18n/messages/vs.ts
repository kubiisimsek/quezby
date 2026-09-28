import type { Locale } from '@quezby/types';

import { plural } from '@/i18n/plural';

/**
 * VS: the sheet that sends one, the result of a VS run, and the lobby's door
 * to a VS waiting for the player. `name` is a friend's name as `handle`
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
  /** The lobby's door while a friend's VS waits for the player. */
  lobby: {
    eyebrow: 'SENİ BEKLEYEN VS',
    /** One line on the lobby's door: short enough for its Rubik title. */
    title: (count: number) => (count === 1 ? 'Sıra sende' : `${count} VS seni bekliyor`),
  },
  /** Over the game while a VS run is played. */
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
  lobby: {
    eyebrow: 'VS WAITING FOR YOU',
    title: (count) => plural('en', count, { one: 'Your turn', other: `${count} VS waiting` }),
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
  lobby: {
    eyebrow: 'EIN VS WARTET AUF DICH',
    title: (count) => plural('de', count, { one: 'Du bist dran', other: `${count} VS warten` }),
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
  lobby: {
    eyebrow: 'تحدٍّ بانتظارك',
    title: (count) =>
      plural('ar', count, {
        one: 'دورك الآن',
        two: 'تحدّيان بانتظارك',
        few: `${count} تحديات بانتظارك`,
        many: `${count} تحديًا بانتظارك`,
        other: `${count} تحدٍّ بانتظارك`,
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
  lobby: {
    eyebrow: 'UN VS T’ATTEND',
    title: (count) => plural('fr', count, { one: 'À toi de jouer', other: `${count} VS t’attendent` }),
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
  lobby: {
    eyebrow: 'UN VS TE ESPERA',
    title: (count) => plural('es', count, { one: 'Te toca', other: `${count} VS te esperan` }),
  },
  hud: (name) => `VS · ${name}`,
};

export const vs: Record<Locale, VsMessages> = { tr, en, de, ar, fr, es };
