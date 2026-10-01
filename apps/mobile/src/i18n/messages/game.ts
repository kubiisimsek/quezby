import { groupDigits } from '@quezby/config';
import type { Verdict } from '@quezby/engine';
import type { Locale } from '@quezby/types';

import { iso } from '@/i18n/format';
import { plural } from '@/i18n/plural';

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
    /** A blind move (`RULES.blindMs`): the wrong post, swiped or double-tapped too soon to have looked. */
    blind: 'Bakmadan!',
    /** Under it, from the second blind move in a row, what the penalty was multiplied by: 2, 4. */
    penalty: (times: number) => `Ceza x${times}`,
  },
  /** The head-up display over the post (Hud). */
  hud: {
    meter: 'Dopamin',
    level: (level: number) => `Seviye ${level}`,
    close: 'Oyundan çık',
  },
  /**
   * A post's own chrome (ReelCard and the formats in `game/formats`); its
   * captions and a format's words are the content catalog's.
   */
  post: {
    share: 'Paylaş',
    holdMeter: 'Basılı tut · yeşilde bırak',
    /** Under a chat screenshot's contact. */
    online: 'çevrimiçi',
    /** A poll's ribbon and how many voted. */
    poll: 'ANKET',
    votes: (count: number) => `${groupDigits(count, 'tr')} oy`,
    /** A receipt's number, under the shop, and its last line. */
    receipt: (number: string) => `FİŞ NO ${number}`,
    total: 'TOPLAM',
    /** A big number's ribbon, when the post has none of its own. */
    didYouKnow: 'BİLİYOR MUYDUN?',
    /** How long ago a notification came: now, minutes, hours. */
    ago: (minutes: number) =>
      minutes === 0 ? 'şimdi' : minutes < 60 ? `${minutes} dk` : `${Math.floor(minutes / 60)} sa`,
    /** A chart's x axis: the week from Monday, and half a year from January. */
    days: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] as readonly string[],
    months: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz'] as readonly string[],
    /** A security camera's corner. */
    rec: 'REC',
    camera: (n: number) => `KAM ${n}`,
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
    blind: 'Didn’t look!',
    penalty: (times) => `Penalty x${times}`,
  },
  hud: {
    meter: 'Dopamine',
    level: (level) => `Level ${level}`,
    close: 'Leave the game',
  },
  post: {
    share: 'Share',
    holdMeter: 'Hold · let go in the green',
    online: 'online',
    poll: 'POLL',
    votes: (count) => plural('en', count, { one: '1 vote', other: `${groupDigits(count, 'en')} votes` }),
    receipt: (number) => `RECEIPT #${number}`,
    total: 'TOTAL',
    didYouKnow: 'DID YOU KNOW?',
    ago: (minutes) =>
      minutes === 0 ? 'now' : minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h`,
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    rec: 'REC',
    camera: (n) => `CAM ${n}`,
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
    blind: 'Blind gewischt!',
    penalty: (times) => `Strafe x${times}`,
  },
  hud: {
    meter: 'Dopamin',
    level: (level) => `Level ${level}`,
    close: 'Spiel verlassen',
  },
  post: {
    share: 'Teilen',
    holdMeter: 'Halten · im Grünen loslassen',
    online: 'online',
    poll: 'UMFRAGE',
    votes: (count) => plural('de', count, { one: '1 Stimme', other: `${groupDigits(count, 'de')} Stimmen` }),
    receipt: (number) => `BON-NR. ${number}`,
    total: 'SUMME',
    didYouKnow: 'WUSSTEST DU SCHON?',
    ago: (minutes) =>
      minutes === 0 ? 'jetzt' : minutes < 60 ? `${minutes} Min.` : `${Math.floor(minutes / 60)} Std.`,
    days: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
    months: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun'],
    rec: 'REC',
    camera: (n) => `KAM ${n}`,
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
    blind: 'دون أن تنظر!',
    penalty: (times) => `العقوبة ${iso(`x${times}`)}`,
  },
  hud: {
    meter: 'الدوبامين',
    level: (level) => `المستوى ${level}`,
    close: 'الخروج من اللعبة',
  },
  post: {
    share: 'مشاركة',
    holdMeter: 'اضغط مطولًا · ارفع في الأخضر',
    online: 'متصل الآن',
    poll: 'استطلاع',
    votes: (count) => {
      const n = groupDigits(count, 'ar');
      return plural('ar', count, {
        zero: `${n} صوت`,
        one: 'صوت واحد',
        two: 'صوتان',
        few: `${n} أصوات`,
        many: `${n} صوتًا`,
        other: `${n} صوت`,
      });
    },
    receipt: (number) => `فاتورة رقم ${iso(number)}`,
    total: 'المجموع',
    didYouKnow: 'هل تعلم؟',
    ago: (minutes) =>
      minutes === 0 ? 'الآن' : minutes < 60 ? `${minutes} د` : `${Math.floor(minutes / 60)} س`,
    days: ['إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت', 'أحد'],
    months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
    rec: 'تسجيل',
    camera: (n) => `كاميرا ${n}`,
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
    blind: 'Sans regarder !',
    penalty: (times) => `Pénalité x${times}`,
  },
  hud: {
    meter: 'Dopamine',
    level: (level) => `Niveau ${level}`,
    close: 'Quitter la partie',
  },
  post: {
    share: 'Partager',
    holdMeter: 'Reste appuyé · relâche dans le vert',
    online: 'en ligne',
    poll: 'SONDAGE',
    votes: (count) =>
      plural('fr', count, {
        one: `${groupDigits(count, 'fr')} vote`,
        many: `${groupDigits(count, 'fr')} de votes`,
        other: `${groupDigits(count, 'fr')} votes`,
      }),
    receipt: (number) => `TICKET N° ${number}`,
    total: 'TOTAL',
    didYouKnow: 'LE SAVAIS-TU ?',
    ago: (minutes) =>
      minutes === 0 ? 'maintenant' : minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h`,
    days: ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'],
    months: ['janv', 'févr', 'mars', 'avr', 'mai', 'juin'],
    rec: 'REC',
    camera: (n) => `CAM ${n}`,
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
    blind: '¡Sin mirar!',
    penalty: (times) => `Penalización x${times}`,
  },
  hud: {
    meter: 'Dopamina',
    level: (level) => `Nivel ${level}`,
    close: 'Salir de la partida',
  },
  post: {
    share: 'Compartir',
    holdMeter: 'Mantén · suelta en el verde',
    online: 'en línea',
    poll: 'ENCUESTA',
    votes: (count) =>
      plural('es', count, {
        one: '1 voto',
        many: `${groupDigits(count, 'es')} de votos`,
        other: `${groupDigits(count, 'es')} votos`,
      }),
    receipt: (number) => `TICKET N.º ${number}`,
    total: 'TOTAL',
    didYouKnow: '¿LO SABÍAS?',
    ago: (minutes) =>
      minutes === 0 ? 'ahora' : minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h`,
    days: ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'],
    months: ['ene', 'feb', 'mar', 'abr', 'may', 'jun'],
    rec: 'REC',
    camera: (n) => `CÁM ${n}`,
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

const ja: GameMessages = {
  verdicts: {
    hit: '',
    perfect: 'パーフェクト！',
    timeout: '時間切れ！',
    wrong: '操作ミス',
    holdEarly: '早すぎ',
    holdLate: '遅すぎ',
    caught: 'つかまった！',
    drained: 'ドーパミン切れ',
  },
  feedback: {
    combo: (combo) => `${combo} コンボ`,
    bonus: (toast, points) => `${toast} +${points}`,
    blind: '見てないでしょ！',
    penalty: (times) => `ペナルティ x${times}`,
  },
  hud: {
    meter: 'ドーパミン',
    level: (level) => `レベル${level}`,
    close: 'ゲームをやめる',
  },
  post: {
    share: 'シェア',
    holdMeter: '長押し · 緑で離す',
    online: 'オンライン',
    poll: 'アンケート',
    votes: (count) => `${groupDigits(count, 'ja')}票`,
    receipt: (number) => `レシート No.${number}`,
    total: '合計',
    didYouKnow: '知ってた？',
    ago: (minutes) =>
      minutes === 0 ? 'たった今' : minutes < 60 ? `${minutes}分前` : `${Math.floor(minutes / 60)}時間前`,
    days: ['月', '火', '水', '木', '金', '土', '日'],
    months: ['1月', '2月', '3月', '4月', '5月', '6月'],
    rec: 'REC',
    camera: (n) => `カメラ${n}`,
  },
  coach: {
    ribbon: (step, of) => `新しい投稿 · ${step}/${of}`,
    start: 'わかった',
  },
  screen: {
    preparing: 'フィードを準備中…',
    verifying: 'スコアを確認中…',
    getReady: '親指をスタンバイ',
    dailyPlayed: '今日のフィードはプレイ済みです',
    cannotStart: 'プレイを開始できませんでした',
    unreachable: 'サーバーにつながりませんでした。',
    retry: 'もう一度試す',
    offline: 'オフライン練習',
    cancel: 'キャンセル',
  },
  actions: {
    dailyBoard: '今日のランキング',
  },
};

const ko: GameMessages = {
  verdicts: {
    hit: '',
    perfect: '퍼펙트!',
    timeout: '시간 초과!',
    wrong: '잘못된 동작',
    holdEarly: '너무 빨라요',
    holdLate: '너무 늦었어요',
    caught: '걸렸어요!',
    drained: '도파민 고갈',
  },
  feedback: {
    combo: (combo) => `${combo} 콤보`,
    bonus: (toast, points) => `${toast} +${points}`,
    blind: '안 보고 했죠!',
    penalty: (times) => `페널티 x${times}`,
  },
  hud: {
    meter: '도파민',
    level: (level) => `레벨 ${level}`,
    close: '게임 나가기',
  },
  post: {
    share: '공유',
    holdMeter: '길게 누르기 · 초록색에서 떼기',
    online: '온라인',
    poll: '투표',
    votes: (count) => `${groupDigits(count, 'ko')}표`,
    receipt: (number) => `영수증 No.${number}`,
    total: '합계',
    didYouKnow: '알고 있었나요?',
    ago: (minutes) =>
      minutes === 0 ? '방금' : minutes < 60 ? `${minutes}분 전` : `${Math.floor(minutes / 60)}시간 전`,
    days: ['월', '화', '수', '목', '금', '토', '일'],
    months: ['1월', '2월', '3월', '4월', '5월', '6월'],
    rec: 'REC',
    camera: (n) => `카메라 ${n}`,
  },
  coach: {
    ribbon: (step, of) => `새 게시물 · ${step}/${of}`,
    start: '알겠어요',
  },
  screen: {
    preparing: '피드를 준비하고 있어요…',
    verifying: '점수 확인 중…',
    getReady: '엄지를 준비하세요',
    dailyPlayed: '오늘의 피드를 이미 플레이했어요',
    cannotStart: '게임을 시작할 수 없어요',
    unreachable: '서버에 연결할 수 없어요.',
    retry: '다시 시도',
    offline: '오프라인 연습',
    cancel: '취소',
  },
  actions: {
    dailyBoard: '오늘의 랭킹',
  },
};

export const game: Record<Locale, GameMessages> = { tr, en, de, ar, fr, es, ja, ko };
