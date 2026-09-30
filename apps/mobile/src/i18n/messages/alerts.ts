import type { Locale, NotificationKind } from '@quezby/types';

import { iso } from '@/i18n/format';

/**
 * The bell on the lobby and its list, Bildirimler: what happened among
 * friends — a request, a friend who accepted yours, a VS and what became of
 * it. `name` is a player's name as `handle` writes it (`@ekin`). Ribbons are
 * typed in capitals.
 */
const tr = {
  title: 'Bildirimler',
  tagline: 'İstekler ve VS',
  empty: 'Henüz bildirim yok',
  emptyHint: 'Arkadaşlık istekleri ve VS’ler burada görünür.',
  failed: 'Bildirimler yüklenemedi',
  retry: 'Tekrar dene',
  /** Over each notice, what kind it is. */
  kinds: {
    friend_request: 'ARKADAŞLIK İSTEĞİ',
    friends: 'YENİ ARKADAŞ',
    vs_invite: 'VS',
    vs_result: 'VS SONUCU',
    vs_declined: 'VS',
    vs_expired: 'VS',
  } satisfies Record<NotificationKind, string>,
  lines: {
    friendRequest: (name: string) => `${name} sana arkadaşlık isteği gönderdi`,
    friends: (name: string) => `${name} isteğini kabul etti`,
    vsInvite: (name: string) => `${name} sana VS attı`,
    won: (name: string) => `${name} ile VS’i kazandın`,
    lost: (name: string) => `${name} ile VS’i kaybettin`,
    draw: (name: string) => `${name} ile VS berabere bitti`,
    finished: (name: string) => `${name} ile VS bitti`,
    declined: (name: string) => `${name} VS’ini reddetti`,
    expired: (name: string) => `${name} VS’ine zamanında bakmadı`,
  },
  /** Read aloud for a notice the player has not seen yet. */
  fresh: 'Yeni',
};

export type AlertsMessages = typeof tr;

const en: AlertsMessages = {
  title: 'Notifications',
  tagline: 'Requests and VS',
  empty: 'No notifications yet',
  emptyHint: 'Friend requests and VS show up here.',
  failed: "Couldn't load your notifications",
  retry: 'Try again',
  kinds: {
    friend_request: 'FRIEND REQUEST',
    friends: 'NEW FRIEND',
    vs_invite: 'VS',
    vs_result: 'VS RESULT',
    vs_declined: 'VS',
    vs_expired: 'VS',
  },
  lines: {
    friendRequest: (name) => `${name} sent you a friend request`,
    friends: (name) => `${name} accepted your request`,
    vsInvite: (name) => `${name} sent you a VS`,
    won: (name) => `You won the VS with ${name}`,
    lost: (name) => `You lost the VS with ${name}`,
    draw: (name) => `Your VS with ${name} was a draw`,
    finished: (name) => `Your VS with ${name} is over`,
    declined: (name) => `${name} turned down your VS`,
    expired: (name) => `${name} didn't play your VS in time`,
  },
  fresh: 'New',
};

const de: AlertsMessages = {
  title: 'Mitteilungen',
  tagline: 'Anfragen und VS',
  empty: 'Noch keine Mitteilungen',
  emptyHint: 'Freundschaftsanfragen und VS erscheinen hier.',
  failed: 'Deine Mitteilungen konnten nicht geladen werden',
  retry: 'Nochmal versuchen',
  kinds: {
    friend_request: 'FREUNDSCHAFTSANFRAGE',
    friends: 'NEUER FREUND',
    vs_invite: 'VS',
    vs_result: 'VS-ERGEBNIS',
    vs_declined: 'VS',
    vs_expired: 'VS',
  },
  lines: {
    friendRequest: (name) => `${name} hat dir eine Freundschaftsanfrage geschickt`,
    friends: (name) => `${name} hat deine Anfrage angenommen`,
    vsInvite: (name) => `${name} hat dir ein VS geschickt`,
    won: (name) => `Du hast das VS gegen ${name} gewonnen`,
    lost: (name) => `Du hast das VS gegen ${name} verloren`,
    draw: (name) => `Dein VS gegen ${name} endete unentschieden`,
    finished: (name) => `Dein VS gegen ${name} ist vorbei`,
    declined: (name) => `${name} hat dein VS abgelehnt`,
    expired: (name) => `${name} hat dein VS nicht rechtzeitig gespielt`,
  },
  fresh: 'Neu',
};

const ar: AlertsMessages = {
  title: 'الإشعارات',
  tagline: 'الطلبات والتحديات',
  empty: 'لا إشعارات بعد',
  emptyHint: 'تظهر هنا طلبات الصداقة والتحديات.',
  failed: 'تعذّر تحميل إشعاراتك',
  retry: 'أعد المحاولة',
  kinds: {
    friend_request: 'طلب صداقة',
    friends: 'صديق جديد',
    vs_invite: 'تحدٍّ',
    vs_result: 'نتيجة التحدي',
    vs_declined: 'تحدٍّ',
    vs_expired: 'تحدٍّ',
  },
  lines: {
    friendRequest: (name) => `${iso(name)} أرسل لك طلب صداقة`,
    friends: (name) => `${iso(name)} قبل طلبك`,
    vsInvite: (name) => `${iso(name)} أرسل لك تحديًا`,
    won: (name) => `فزت في التحدي مع ${iso(name)}`,
    lost: (name) => `خسرت التحدي مع ${iso(name)}`,
    draw: (name) => `انتهى تحديك مع ${iso(name)} بالتعادل`,
    finished: (name) => `انتهى تحديك مع ${iso(name)}`,
    declined: (name) => `${iso(name)} رفض تحديك`,
    expired: (name) => `${iso(name)} لم يلعب تحديك في الوقت`,
  },
  fresh: 'جديد',
};

const fr: AlertsMessages = {
  title: 'Notifications',
  tagline: 'Demandes et VS',
  empty: 'Pas encore de notifications',
  emptyHint: "Les demandes d'ami et les VS s'affichent ici.",
  failed: 'Impossible de charger tes notifications',
  retry: 'Réessayer',
  kinds: {
    friend_request: "DEMANDE D'AMI",
    friends: 'NOUVEL AMI',
    vs_invite: 'VS',
    vs_result: 'RÉSULTAT DU VS',
    vs_declined: 'VS',
    vs_expired: 'VS',
  },
  lines: {
    friendRequest: (name) => `${name} t’a envoyé une demande d'ami`,
    friends: (name) => `${name} a accepté ta demande`,
    vsInvite: (name) => `${name} t’a lancé un VS`,
    won: (name) => `Tu as gagné le VS contre ${name}`,
    lost: (name) => `Tu as perdu le VS contre ${name}`,
    draw: (name) => `Ton VS contre ${name} s’est fini sur un match nul`,
    finished: (name) => `Ton VS contre ${name} est terminé`,
    declined: (name) => `${name} a refusé ton VS`,
    expired: (name) => `${name} n’a pas joué ton VS à temps`,
  },
  fresh: 'Nouveau',
};

const es: AlertsMessages = {
  title: 'Notificaciones',
  tagline: 'Solicitudes y VS',
  empty: 'Aún no hay notificaciones',
  emptyHint: 'Aquí aparecen las solicitudes de amistad y los VS.',
  failed: 'No se pudieron cargar tus notificaciones',
  retry: 'Reintentar',
  kinds: {
    friend_request: 'SOLICITUD DE AMISTAD',
    friends: 'NUEVO AMIGO',
    vs_invite: 'VS',
    vs_result: 'RESULTADO DEL VS',
    vs_declined: 'VS',
    vs_expired: 'VS',
  },
  lines: {
    friendRequest: (name) => `${name} te envió una solicitud de amistad`,
    friends: (name) => `${name} aceptó tu solicitud`,
    vsInvite: (name) => `${name} te mandó un VS`,
    won: (name) => `Ganaste el VS contra ${name}`,
    lost: (name) => `Perdiste el VS contra ${name}`,
    draw: (name) => `Tu VS contra ${name} terminó en empate`,
    finished: (name) => `Tu VS contra ${name} terminó`,
    declined: (name) => `${name} rechazó tu VS`,
    expired: (name) => `${name} no jugó tu VS a tiempo`,
  },
  fresh: 'Nuevo',
};

const ja: AlertsMessages = {
  title: '通知',
  tagline: '申請とVS',
  empty: 'まだ通知はありません',
  emptyHint: 'フレンド申請やVSはここに表示されます。',
  failed: '通知を読み込めませんでした',
  retry: '再試行',
  kinds: {
    friend_request: 'フレンド申請',
    friends: '新しいフレンド',
    vs_invite: 'VS',
    vs_result: 'VSの結果',
    vs_declined: 'VS',
    vs_expired: 'VS',
  },
  lines: {
    friendRequest: (name) => `${name}からフレンド申請が届きました`,
    friends: (name) => `${name}が申請を承認しました`,
    vsInvite: (name) => `${name}からVSが届きました`,
    won: (name) => `${name}とのVSに勝ちました`,
    lost: (name) => `${name}とのVSに負けました`,
    draw: (name) => `${name}とのVSは引き分けでした`,
    finished: (name) => `${name}とのVSが終わりました`,
    declined: (name) => `${name}がVSを断りました`,
    expired: (name) => `${name}は時間内にVSをプレイしませんでした`,
  },
  fresh: '新着',
};

const ko: AlertsMessages = {
  title: '알림',
  tagline: '요청과 VS',
  empty: '아직 알림이 없어요',
  emptyHint: '친구 요청과 VS가 여기에 표시돼요.',
  failed: '알림을 불러올 수 없어요',
  retry: '다시 시도',
  kinds: {
    friend_request: '친구 요청',
    friends: '새 친구',
    vs_invite: 'VS',
    vs_result: 'VS 결과',
    vs_declined: 'VS',
    vs_expired: 'VS',
  },
  lines: {
    friendRequest: (name) => `${name} 님이 친구 요청을 보냈어요`,
    friends: (name) => `${name} 님이 요청을 수락했어요`,
    vsInvite: (name) => `${name} 님이 VS를 보냈어요`,
    won: (name) => `${name} 님과의 VS에서 이겼어요`,
    lost: (name) => `${name} 님과의 VS에서 졌어요`,
    draw: (name) => `${name} 님과의 VS가 무승부로 끝났어요`,
    finished: (name) => `${name} 님과의 VS가 끝났어요`,
    declined: (name) => `${name} 님이 VS를 거절했어요`,
    expired: (name) => `${name} 님이 시간 안에 VS를 플레이하지 않았어요`,
  },
  fresh: '새 알림',
};

export const alerts: Record<Locale, AlertsMessages> = { tr, en, de, ar, fr, es, ja, ko };
