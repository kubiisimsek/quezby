import type { Verdict } from '@quezby/engine';
import type { Locale } from '@quezby/types';

import { iso } from '@/i18n/format';

/**
 * The run and the screen around it. Inside a run the game speaks in one or
 * two words, read in a glance — a verdict, a ribbon; around it, plainly.
 * The post kinds' and the named combos' own words are `reels` and `bonus`.
 */
const tr = {
  /** What a verdict says over the post (FeedbackLayer). A plain hit says nothing. */
  verdicts: {
    hit: '',
    perfect: 'Mükemmel!',
    timeout: 'Takıldın!',
    wrong: 'Yanlış hareket',
    holdEarly: 'Erken bıraktın',
    holdLate: 'Geç kaldın',
    caught: 'Yakalandın!',
    drained: 'Dopamin bitti',
  } satisfies Record<Verdict, string>,
  /** Under a hit's points, and on a named combo's gold ribbon (FeedbackLayer). */
  feedback: {
    /** `combo` as `t.fmt.combo` writes it: "x1,25 kombo". */
    combo: (combo: string) => `${combo} kombo`,
    /** The combo's toast, then what it paid (`t.fmt.score`): "Kusursuz seviye! +480". */
    bonus: (toast: string, points: string) => `${toast} +${points}`,
  },
  /** The head-up display over the post (Hud). */
  hud: {
    meter: 'Dopamin',
    level: (level: number) => `Seviye ${level}`,
    close: 'Oyundan çık',
  },
  /** A post's own chrome (ReelCard); its captions are the content catalog's. */
  post: {
    share: 'Paylaş',
    holdMeter: 'Basılı tut · yeşilde bırak',
  },
  /** The practice run's card before the first post of each kind (CoachCard). */
  coach: {
    ribbon: (step: number, of: number) => `YENİ POST · ${step}/${of}`,
    start: 'Anladım',
  },
  /** Around the run (GameScreen): getting it ready, the countdown, a run that cannot start. */
  screen: {
    preparing: 'Akış hazırlanıyor…',
    verifying: 'Skorun doğrulanıyor…',
    getReady: 'Başparmağını hazırla',
    dailyPlayed: 'Bugünün akışını oynadın',
    cannotStart: 'Tur başlatılamadı',
    unreachable: 'Sunucuya ulaşılamadı.',
    retry: 'Tekrar dene',
    offline: 'Çevrimdışı antrenman',
    cancel: 'Vazgeç',
  },
  /**
   * The ways on from a daily run — after its result, or when it was already
   * played. The other one, free play, is the lobby's (`t.home.today.free`).
   */
  actions: {
    dailyBoard: 'Günün tablosu',
  },
};

export type GameMessages = typeof tr;

const en: GameMessages = {
  verdicts: {
    hit: '',
    perfect: 'Perfect!',
    timeout: 'Too slow!',
    wrong: 'Wrong move',
    holdEarly: 'Too early',
    holdLate: 'Too late',
    caught: 'Caught!',
    drained: 'Out of dopamine',
  },
  feedback: {
    combo: (combo) => `${combo} combo`,
    bonus: (toast, points) => `${toast} +${points}`,
  },
  hud: {
    meter: 'Dopamine',
    level: (level) => `Level ${level}`,
    close: 'Leave the game',
  },
  post: {
    share: 'Share',
    holdMeter: 'Hold · let go in the green',
  },
  coach: {
    ribbon: (step, of) => `NEW POST · ${step}/${of}`,
    start: 'Got it',
  },
  screen: {
    preparing: 'Getting the feed ready…',
    verifying: 'Verifying your score…',
    getReady: 'Get your thumb ready',
    dailyPlayed: "You've played today's Daily Feed",
    cannotStart: "Couldn't start the run",
    unreachable: "Couldn't reach the server.",
    retry: 'Try again',
    offline: 'Offline training',
    cancel: 'Cancel',
  },
  actions: {
    dailyBoard: "Today's board",
  },
};

const de: GameMessages = {
  verdicts: {
    hit: '',
    perfect: 'Perfekt!',
    timeout: 'Zu langsam!',
    wrong: 'Falsche Geste',
    holdEarly: 'Zu früh',
    holdLate: 'Zu spät',
    caught: 'Erwischt!',
    drained: 'Dopamin leer',
  },
  feedback: {
    combo: (combo) => `${combo} Kombo`,
    bonus: (toast, points) => `${toast} +${points}`,
  },
  hud: {
    meter: 'Dopamin',
    level: (level) => `Level ${level}`,
    close: 'Spiel verlassen',
  },
  post: {
    share: 'Teilen',
    holdMeter: 'Halten · im Grünen loslassen',
  },
  coach: {
    ribbon: (step, of) => `NEUER POST · ${step}/${of}`,
    start: 'Verstanden',
  },
  screen: {
    preparing: 'Der Feed wird vorbereitet…',
    verifying: 'Dein Score wird geprüft…',
    getReady: 'Halt den Daumen bereit',
    dailyPlayed: 'Du hast den Tages-Feed heute gespielt',
    cannotStart: 'Die Runde konnte nicht starten',
    unreachable: 'Server nicht erreichbar.',
    retry: 'Noch mal versuchen',
    offline: 'Offline trainieren',
    cancel: 'Abbrechen',
  },
  actions: {
    dailyBoard: 'Tagesrangliste',
  },
};

const ar: GameMessages = {
  verdicts: {
    hit: '',
    perfect: 'مثالي!',
    timeout: 'انتهى الوقت!',
    wrong: 'حركة خاطئة',
    holdEarly: 'رفعت مبكرًا',
    holdLate: 'تأخرت',
    caught: 'أمسكناك!',
    drained: 'نفد الدوبامين',
  },
  feedback: {
    combo: (combo) => `كومبو ${iso(combo)}`,
    bonus: (toast, points) => `${toast} ${iso(`+${points}`)}`,
  },
  hud: {
    meter: 'الدوبامين',
    level: (level) => `المستوى ${level}`,
    close: 'الخروج من اللعبة',
  },
  post: {
    share: 'مشاركة',
    holdMeter: 'اضغط مطولًا · ارفع في الأخضر',
  },
  coach: {
    ribbon: (step, of) => `منشور جديد · ${iso(`${step}/${of}`)}`,
    start: 'فهمت',
  },
  screen: {
    preparing: 'جارٍ تجهيز الخلاصة…',
    verifying: 'جارٍ التحقق من نتيجتك…',
    getReady: 'جهّز إبهامك',
    dailyPlayed: 'لعبت خلاصة اليوم',
    cannotStart: 'تعذّر بدء الجولة',
    unreachable: 'تعذّر الوصول إلى الخادم.',
    retry: 'حاول مجددًا',
    offline: 'تدرّب دون اتصال',
    cancel: 'إلغاء',
  },
  actions: {
    dailyBoard: 'ترتيب اليوم',
  },
};

const fr: GameMessages = {
  verdicts: {
    hit: '',
    perfect: 'Parfait !',
    timeout: 'Temps écoulé !',
    wrong: 'Mauvais geste',
    holdEarly: 'Trop tôt',
    holdLate: 'Trop tard',
    caught: 'Touché !',
    drained: 'Plus de dopamine',
  },
  feedback: {
    combo: (combo) => `combo ${combo}`,
    bonus: (toast, points) => `${toast} +${points}`,
  },
  hud: {
    meter: 'Dopamine',
    level: (level) => `Niveau ${level}`,
    close: 'Quitter la partie',
  },
  post: {
    share: 'Partager',
    holdMeter: 'Reste appuyé · relâche dans le vert',
  },
  coach: {
    ribbon: (step, of) => `NOUVEAU POST · ${step}/${of}`,
    start: 'Compris',
  },
  screen: {
    preparing: 'Préparation du fil…',
    verifying: 'Vérification de ton score…',
    getReady: 'Prépare ton pouce',
    dailyPlayed: 'Tu as joué le Fil du jour',
    cannotStart: 'Impossible de lancer la partie',
    unreachable: 'Impossible de joindre le serveur.',
    retry: 'Réessayer',
    offline: "S'entraîner hors ligne",
    cancel: 'Annuler',
  },
  actions: {
    dailyBoard: 'Classement du jour',
  },
};

const es: GameMessages = {
  verdicts: {
    hit: '',
    perfect: '¡Perfecto!',
    timeout: '¡Tiempo agotado!',
    wrong: 'Gesto incorrecto',
    holdEarly: 'Muy pronto',
    holdLate: 'Muy tarde',
    caught: '¡Te atrapamos!',
    drained: 'Sin dopamina',
  },
  feedback: {
    combo: (combo) => `combo ${combo}`,
    bonus: (toast, points) => `${toast} +${points}`,
  },
  hud: {
    meter: 'Dopamina',
    level: (level) => `Nivel ${level}`,
    close: 'Salir de la partida',
  },
  post: {
    share: 'Compartir',
    holdMeter: 'Mantén · suelta en el verde',
  },
  coach: {
    ribbon: (step, of) => `POST NUEVO · ${step}/${of}`,
    start: 'Entendido',
  },
  screen: {
    preparing: 'Preparando el feed…',
    verifying: 'Verificando tu puntuación…',
    getReady: 'Prepara el pulgar',
    dailyPlayed: 'Ya jugaste el Feed del día',
    cannotStart: 'No se pudo iniciar la ronda',
    unreachable: 'No se pudo conectar con el servidor.',
    retry: 'Reintentar',
    offline: 'Entrenar sin conexión',
    cancel: 'Cancelar',
  },
  actions: {
    dailyBoard: 'Clasificación del día',
  },
};

export const game: Record<Locale, GameMessages> = { tr, en, de, ar, fr, es };
