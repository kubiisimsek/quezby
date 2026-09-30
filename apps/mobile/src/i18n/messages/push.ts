import type { Locale } from '@quezby/types';

/**
 * Push notifications: the new player's step that asks for them, the card
 * that shows wherever they are off, and Ayarlar → Bildirimler. What a
 * notification says is the API's (`lang/{locale}/push.php`), in the
 * player's language.
 */
const tr = {
  /** A new player's step after their name: the system's question comes behind "Bildirimleri aç". */
  onboarding: {
    eyebrow: 'BİLDİRİMLER',
    title: 'Haberin olsun mu?',
    body: 'Bildirimleri açarsan oyunda kaçırdığın hiçbir şey olmaz. Reklam yok.',
    kinds: {
      friends: 'Biri seni arkadaş olarak eklediğinde',
      vs: 'Bir arkadaşın sana VS attığında ve VS bittiğinde',
      messages: 'Arkadaşların sana mesaj gönderdiğinde',
    },
    allow: 'Bildirimleri aç',
    later: 'Şimdi değil',
  },
  /**
   * Where notifications are off — the inbox, a conversation, a VS just sent:
   * never asked → the system's question; turned down → the phone's settings.
   */
  nudge: {
    title: 'Bildirimler kapalı',
    body: 'Sana VS atılınca ya da isteğin kabul edilince haberin olmaz.',
    blocked: 'Telefonunun ayarlarından aç; VS’ler ve istekler sana ulaşsın.',
    vs: (name: string) => `${name} oynayınca haberin olsun diye bildirimleri aç.`,
    allow: 'Bildirimleri aç',
    openSettings: 'Ayarları aç',
    hide: 'Gizle',
  },
  /** Ayarlar → Bildirimler. */
  settings: {
    title: 'Bildirimler',
    description: 'Hangi haberler telefonuna gelsin?',
    friends: 'Arkadaşlık',
    friendsHint: 'Gelen istekler ve kabul edilenler',
    vs: 'VS',
    vsHint: 'Davetler ve sonuçlar',
    messages: 'Hazır mesajlar',
    messagesHint: 'Arkadaşlarının gönderdikleri',
    off: 'Bildirimler telefonunun ayarlarında kapalı.',
    openSettings: 'Ayarları aç',
    allow: 'Bildirimlere izin ver',
    unavailable: 'Bu sürümde bildirimler henüz açık değil.',
    failed: 'Ayar kaydedilemedi',
  },
};

export type PushMessages = typeof tr;

const en: PushMessages = {
  onboarding: {
    eyebrow: 'NOTIFICATIONS',
    title: 'Want to know when it happens?',
    body: 'Turn on notifications and you won’t miss a thing in the game. No ads.',
    kinds: {
      friends: 'When someone adds you as a friend',
      vs: 'When a friend sends you a VS, and when a VS ends',
      messages: 'When your friends send you a message',
    },
    allow: 'Turn on notifications',
    later: 'Not now',
  },
  nudge: {
    title: 'Notifications are off',
    body: 'You won’t know when you get a VS or a friend accepts your request.',
    blocked: 'Turn them on in your phone’s settings so VS and requests reach you.',
    vs: (name) => `Turn on notifications to know when ${name} plays.`,
    allow: 'Turn on notifications',
    openSettings: 'Open settings',
    hide: 'Hide',
  },
  settings: {
    title: 'Notifications',
    description: 'What should reach your phone?',
    friends: 'Friends',
    friendsHint: 'Requests you get and ones accepted',
    vs: 'VS',
    vsHint: 'Invites and results',
    messages: 'Quick messages',
    messagesHint: 'What your friends send you',
    off: 'Notifications are off in your phone’s settings.',
    openSettings: 'Open settings',
    allow: 'Allow notifications',
    unavailable: 'Notifications aren’t on in this version yet.',
    failed: 'Couldn’t save the setting',
  },
};

const de: PushMessages = {
  onboarding: {
    eyebrow: 'MITTEILUNGEN',
    title: 'Willst du Bescheid wissen?',
    body: 'Mit Mitteilungen verpasst du im Spiel nichts mehr. Keine Werbung.',
    kinds: {
      friends: 'Wenn dich jemand als Freund hinzufügt',
      vs: 'Wenn dir ein Freund ein VS schickt und wenn ein VS endet',
      messages: 'Wenn dir deine Freunde eine Nachricht schicken',
    },
    allow: 'Mitteilungen einschalten',
    later: 'Nicht jetzt',
  },
  nudge: {
    title: 'Mitteilungen sind aus',
    body: 'Du erfährst nicht, wenn du ein VS bekommst oder deine Anfrage angenommen wird.',
    blocked: 'Schalte sie in den Einstellungen deines Handys ein, damit VS und Anfragen dich erreichen.',
    vs: (name) => `Schalte Mitteilungen ein, um zu erfahren, wann ${name} spielt.`,
    allow: 'Mitteilungen einschalten',
    openSettings: 'Einstellungen öffnen',
    hide: 'Ausblenden',
  },
  settings: {
    title: 'Mitteilungen',
    description: 'Was soll auf dein Handy kommen?',
    friends: 'Freunde',
    friendsHint: 'Neue Anfragen und angenommene',
    vs: 'VS',
    vsHint: 'Einladungen und Ergebnisse',
    messages: 'Schnellnachrichten',
    messagesHint: 'Was deine Freunde dir schicken',
    off: 'Mitteilungen sind in den Einstellungen deines Handys aus.',
    openSettings: 'Einstellungen öffnen',
    allow: 'Mitteilungen erlauben',
    unavailable: 'Mitteilungen sind in dieser Version noch nicht an.',
    failed: 'Einstellung konnte nicht gespeichert werden',
  },
};

const ar: PushMessages = {
  onboarding: {
    eyebrow: 'الإشعارات',
    title: 'هل تريد أن تعرف أولًا بأول؟',
    body: 'فعّل الإشعارات ولن يفوتك شيء في اللعبة. بلا إعلانات.',
    kinds: {
      friends: 'حين يضيفك أحدهم صديقًا',
      vs: 'حين يرسل إليك صديق تحديًا، وحين ينتهي التحدي',
      messages: 'حين يرسل إليك أصدقاؤك رسالة',
    },
    allow: 'فعّل الإشعارات',
    later: 'ليس الآن',
  },
  nudge: {
    title: 'الإشعارات متوقفة',
    body: 'لن تعرف حين يصلك تحدٍّ أو حين يُقبل طلبك.',
    blocked: 'فعّلها من إعدادات هاتفك لتصلك التحديات والطلبات.',
    vs: (name) => `فعّل الإشعارات لتعرف حين يلعب ${name}.`,
    allow: 'فعّل الإشعارات',
    openSettings: 'افتح الإعدادات',
    hide: 'إخفاء',
  },
  settings: {
    title: 'الإشعارات',
    description: 'ما الذي يصل إلى هاتفك؟',
    friends: 'الأصدقاء',
    friendsHint: 'الطلبات الواردة والمقبولة',
    vs: 'التحديات',
    vsHint: 'الدعوات والنتائج',
    messages: 'الرسائل الجاهزة',
    messagesHint: 'ما يرسله إليك أصدقاؤك',
    off: 'الإشعارات مغلقة في إعدادات هاتفك.',
    openSettings: 'افتح الإعدادات',
    allow: 'اسمح بالإشعارات',
    unavailable: 'الإشعارات غير متاحة في هذا الإصدار بعد.',
    failed: 'تعذّر حفظ الإعداد',
  },
};

const fr: PushMessages = {
  onboarding: {
    eyebrow: 'NOTIFICATIONS',
    title: 'Tu veux être prévenu ?',
    body: 'Active les notifications et tu ne rates plus rien du jeu. Pas de pub.',
    kinds: {
      friends: 'Quand quelqu’un t’ajoute en ami',
      vs: 'Quand un ami t’envoie un VS, et quand un VS se termine',
      messages: 'Quand tes amis t’envoient un message',
    },
    allow: 'Activer les notifications',
    later: 'Pas maintenant',
  },
  nudge: {
    title: 'Les notifications sont désactivées',
    body: 'Tu ne sauras pas quand tu reçois un VS ou quand ta demande est acceptée.',
    blocked: 'Active-les dans les réglages de ton téléphone pour recevoir VS et demandes.',
    vs: (name) => `Active les notifications pour savoir quand ${name} joue.`,
    allow: 'Activer les notifications',
    openSettings: 'Ouvrir les réglages',
    hide: 'Masquer',
  },
  settings: {
    title: 'Notifications',
    description: 'Qu’est-ce qui doit arriver sur ton téléphone ?',
    friends: 'Amis',
    friendsHint: 'Demandes reçues et acceptées',
    vs: 'VS',
    vsHint: 'Invitations et résultats',
    messages: 'Messages rapides',
    messagesHint: 'Ce que tes amis t’envoient',
    off: 'Les notifications sont désactivées dans les réglages de ton téléphone.',
    openSettings: 'Ouvrir les réglages',
    allow: 'Autoriser les notifications',
    unavailable: 'Les notifications ne sont pas encore actives dans cette version.',
    failed: 'Impossible d’enregistrer le réglage',
  },
};

const es: PushMessages = {
  onboarding: {
    eyebrow: 'NOTIFICACIONES',
    title: '¿Quieres enterarte?',
    body: 'Activa las notificaciones y no te perderás nada del juego. Sin anuncios.',
    kinds: {
      friends: 'Cuando alguien te agrega como amigo',
      vs: 'Cuando un amigo te manda un VS, y cuando un VS termina',
      messages: 'Cuando tus amigos te mandan un mensaje',
    },
    allow: 'Activar notificaciones',
    later: 'Ahora no',
  },
  nudge: {
    title: 'Las notificaciones están desactivadas',
    body: 'No sabrás cuándo recibes un VS o cuándo aceptan tu solicitud.',
    blocked: 'Actívalas en los ajustes de tu móvil para que te lleguen los VS y las solicitudes.',
    vs: (name) => `Activa las notificaciones para saber cuándo juega ${name}.`,
    allow: 'Activar notificaciones',
    openSettings: 'Abrir ajustes',
    hide: 'Ocultar',
  },
  settings: {
    title: 'Notificaciones',
    description: '¿Qué quieres que llegue a tu móvil?',
    friends: 'Amigos',
    friendsHint: 'Solicitudes recibidas y aceptadas',
    vs: 'VS',
    vsHint: 'Invitaciones y resultados',
    messages: 'Mensajes rápidos',
    messagesHint: 'Lo que te mandan tus amigos',
    off: 'Las notificaciones están desactivadas en los ajustes de tu móvil.',
    openSettings: 'Abrir ajustes',
    allow: 'Permitir notificaciones',
    unavailable: 'Las notificaciones aún no están activas en esta versión.',
    failed: 'No se pudo guardar el ajuste',
  },
};

const ja: PushMessages = {
  onboarding: {
    eyebrow: '通知',
    title: 'お知らせを受け取る？',
    body: '通知をオンにすれば、ゲームの出来事を見逃しません。広告は届きません。',
    kinds: {
      friends: 'だれかがあなたをフレンドに追加したとき',
      vs: 'フレンドからVSが届いたとき、VSが終わったとき',
      messages: 'フレンドからメッセージが届いたとき',
    },
    allow: '通知をオンにする',
    later: 'あとで',
  },
  nudge: {
    title: '通知がオフです',
    body: 'VSが届いたときや、申請が承認されたときに気づけません。',
    blocked: 'スマホの設定で通知をオンにすると、VSや申請が届くようになります。',
    vs: (name) => `${name}がプレイしたらわかるように、通知をオンにしよう。`,
    allow: '通知をオンにする',
    openSettings: '設定を開く',
    hide: '非表示',
  },
  settings: {
    title: '通知',
    description: 'どのお知らせをスマホに届けますか？',
    friends: 'フレンド',
    friendsHint: '届いた申請と承認',
    vs: 'VS',
    vsHint: '招待と結果',
    messages: '定型メッセージ',
    messagesHint: 'フレンドから届いたもの',
    off: 'スマホの設定で通知がオフになっています。',
    openSettings: '設定を開く',
    allow: '通知を許可',
    unavailable: 'このバージョンでは通知はまだ使えません。',
    failed: '設定を保存できませんでした',
  },
};

const ko: PushMessages = {
  onboarding: {
    eyebrow: '알림',
    title: '소식을 받아 볼까요?',
    body: '알림을 켜면 게임에서 놓치는 게 없어요. 광고는 없어요.',
    kinds: {
      friends: '누군가 나를 친구로 추가했을 때',
      vs: '친구가 VS를 보냈을 때, VS가 끝났을 때',
      messages: '친구가 메시지를 보냈을 때',
    },
    allow: '알림 켜기',
    later: '나중에',
  },
  nudge: {
    title: '알림이 꺼져 있어요',
    body: 'VS를 받거나 친구가 요청을 수락해도 알 수 없어요.',
    blocked: '휴대폰 설정에서 알림을 켜야 VS와 요청을 받을 수 있어요.',
    vs: (name) => `${name} 님이 플레이하면 알 수 있게 알림을 켜세요.`,
    allow: '알림 켜기',
    openSettings: '설정 열기',
    hide: '숨기기',
  },
  settings: {
    title: '알림',
    description: '어떤 소식을 휴대폰으로 받을까요?',
    friends: '친구',
    friendsHint: '받은 요청과 수락된 요청',
    vs: 'VS',
    vsHint: '초대와 결과',
    messages: '빠른 메시지',
    messagesHint: '친구가 보낸 메시지',
    off: '휴대폰 설정에서 알림이 꺼져 있어요.',
    openSettings: '설정 열기',
    allow: '알림 허용',
    unavailable: '이 버전에서는 아직 알림을 사용할 수 없어요.',
    failed: '설정을 저장할 수 없어요',
  },
};

export const push: Record<Locale, PushMessages> = { tr, en, de, ar, fr, es, ja, ko };
