import type { Locale } from '@quezby/types';

import { formatsFor, handle, iso, type Formats } from '@/i18n/format';
import { plural } from '@/i18n/plural';

/** Each language's numbers, for the lines that count something. */
const fmt: Record<Locale, Formats> = {
  tr: formatsFor('tr'),
  en: formatsFor('en'),
  de: formatsFor('de'),
  ar: formatsFor('ar'),
  fr: formatsFor('fr'),
  es: formatsFor('es'),
};

/**
 * Finding and following players: the Arkadaşlar tab, a player's card over
 * any board, and a friends board with nobody on it but you.
 */
const tr = {
  /** The Arkadaşlar tab. */
  search: {
    title: 'Arkadaşlar',
    tagline: 'Oyuncu ara, takip et, yarış',
    field: 'Kullanıcı adı',
    placeholder: 'ör. ekin',
    tooShort: (min: number) => `Aramak için en az ${min} karakter yaz.`,
    tabs: { following: 'Takip ettiklerin', followers: 'Takipçilerin' },
    failed: 'Arama yapılamadı',
    nobody: 'Kimse bulunamadı',
    /** Nobody's name starts with what was typed. */
    nobodyHint: (term: string) => `Adı “${term}” ile başlayan bir oyuncu yok. Yazdığını kontrol et.`,
    followingHint: 'Yukarıdan bir oyuncu ara ve takip et; arkadaş sıralamalarında onu da görürsün.',
    noFollowers: 'Henüz takipçin yok',
    /** Ends on your own name, for your friends to look up. */
    noFollowersHint: (name: string) =>
      `Seni takip edenler burada görünür. Adını arkadaşlarına söyle: ${handle(name)}`,
    listFailed: 'Liste yüklenemedi',
    more: 'Daha fazla',
    retry: 'Tekrar dene',
  },
  /** Said on the Arkadaşlar tab and on an empty friends board. */
  notFollowing: 'Henüz kimseyi takip etmiyorsun',
  follow: 'Takip et',
  unfollow: 'Takibi bırak',
  /** The way to the Arkadaşlar tab — a board's search button, an empty friends board. */
  find: 'Oyuncu ara',
  /** A player's card, opened from any row. */
  sheet: {
    failed: 'Oyuncu yüklenemedi',
    you: 'Sen',
    followsYou: 'Seni takip ediyor',
    counts: (followers: number, following: number) =>
      `${fmt.tr.score(followers)} takipçi · ${fmt.tr.score(following)} takip`,
    stats: {
      weekly: 'Bu hafta',
      all: 'Tüm zamanlar',
      runs: 'Tur',
      posts: 'Post',
      likes: 'Beğeni',
      perfects: 'Mükemmel',
    },
  },
  /** The season best on a player card. */
  best: {
    title: 'Sezon rekoru',
    said: (value: string) => `Sezon rekoru: ${value}`,
  },
  /** A friends board with nobody on it but you. */
  empty: {
    waiting: 'Takip ettiklerin henüz oynamadı',
    waitingHint: 'Onlar oynadıkça burada seninle yarışacaklar.',
    play: 'Oyna',
    noneHint: 'Takip ettiğin oyuncular burada seninle yarışır.',
  },
};

export type FriendsMessages = typeof tr;

const en: FriendsMessages = {
  search: {
    title: 'Friends',
    tagline: 'Find players, follow, race',
    field: 'Username',
    placeholder: 'e.g. ekin',
    tooShort: (min) =>
      plural('en', min, {
        one: 'Type at least 1 character to search.',
        other: `Type at least ${min} characters to search.`,
      }),
    tabs: { following: 'Following', followers: 'Followers' },
    failed: "Couldn't search",
    nobody: 'No one found',
    nobodyHint: (term) => `No player's name starts with “${term}”. Check what you typed.`,
    followingHint: "Search for players above and follow them; you'll see them on your friends boards too.",
    noFollowers: 'No followers yet',
    noFollowersHint: (name) =>
      `Players who follow you show up here. Tell your friends your name: ${handle(name)}`,
    listFailed: "Couldn't load the list",
    more: 'Show more',
    retry: 'Try again',
  },
  notFollowing: "You're not following anyone yet",
  follow: 'Follow',
  unfollow: 'Unfollow',
  find: 'Find players',
  sheet: {
    failed: "Couldn't load this player",
    you: 'You',
    followsYou: 'Follows you',
    counts: (followers, following) =>
      `${plural('en', followers, {
        one: '1 follower',
        other: `${fmt.en.score(followers)} followers`,
      })} · ${fmt.en.score(following)} following`,
    stats: {
      weekly: 'This week',
      all: 'All time',
      runs: 'Runs',
      posts: 'Posts',
      likes: 'Likes',
      perfects: 'Perfect',
    },
  },
  best: {
    title: 'Season record',
    said: (value) => `Season record: ${value}`,
  },
  empty: {
    waiting: "The players you follow haven't played yet",
    waitingHint: "As they play, they'll race you here.",
    play: 'Play',
    noneHint: 'Players you follow race you here.',
  },
};

const de: FriendsMessages = {
  search: {
    title: 'Freunde',
    tagline: 'Spieler finden, folgen, antreten',
    field: 'Benutzername',
    placeholder: 'z. B. ekin',
    tooShort: (min) => `Gib mindestens ${min} Zeichen ein, um zu suchen.`,
    tabs: { following: 'Folge ich', followers: 'Follower' },
    failed: 'Suche fehlgeschlagen',
    nobody: 'Niemand gefunden',
    nobodyHint: (term) => `Kein Spielername beginnt mit „${term}“. Prüf deine Eingabe.`,
    followingHint:
      'Such oben nach Spielern und folge ihnen – dann siehst du sie auch in deinen Freunde-Ranglisten.',
    noFollowers: 'Noch keine Follower',
    noFollowersHint: (name) =>
      `Wer dir folgt, erscheint hier. Sag deinen Freunden deinen Namen: ${handle(name)}`,
    listFailed: 'Liste konnte nicht geladen werden',
    more: 'Mehr anzeigen',
    retry: 'Noch mal versuchen',
  },
  notFollowing: 'Du folgst noch niemandem',
  follow: 'Folgen',
  unfollow: 'Entfolgen',
  find: 'Spieler suchen',
  sheet: {
    failed: 'Spieler konnte nicht geladen werden',
    you: 'Du',
    followsYou: 'Folgt dir',
    counts: (followers, following) =>
      `${fmt.de.score(followers)} Follower · folgt ${fmt.de.score(following)}`,
    stats: {
      weekly: 'Diese Woche',
      all: 'Allzeit',
      runs: 'Runden',
      posts: 'Posts',
      likes: 'Likes',
      perfects: 'Perfekt',
    },
  },
  best: {
    title: 'Saisonrekord',
    said: (value) => `Saisonrekord: ${value}`,
  },
  empty: {
    waiting: 'Die Spieler, denen du folgst, haben noch nicht gespielt',
    waitingHint: 'Sobald sie spielen, treten sie hier gegen dich an.',
    play: 'Spielen',
    noneHint: 'Spieler, denen du folgst, treten hier gegen dich an.',
  },
};

const ar: FriendsMessages = {
  search: {
    title: 'الأصدقاء',
    tagline: 'ابحث عن لاعبين، تابعهم، نافسهم',
    field: 'اسم المستخدم',
    placeholder: `مثال: ${iso('ekin')}`,
    tooShort: (min) =>
      plural('ar', min, {
        one: 'اكتب حرفًا واحدًا على الأقل للبحث.',
        two: 'اكتب حرفين على الأقل للبحث.',
        few: `اكتب ${min} أحرف على الأقل للبحث.`,
        many: `اكتب ${min} حرفًا على الأقل للبحث.`,
        other: `اكتب ${min} حرف على الأقل للبحث.`,
      }),
    tabs: { following: 'من تتابعهم', followers: 'متابعوك' },
    failed: 'تعذّر البحث',
    nobody: 'لم نعثر على أحد',
    nobodyHint: (term) => `لا يوجد لاعب يبدأ اسمه بـ«${iso(term)}». تحقّق مما كتبته.`,
    followingHint: 'ابحث عن لاعبين في الأعلى وتابعهم، وستراهم أيضًا في ترتيبات الأصدقاء.',
    noFollowers: 'ليس لديك متابعون بعد',
    noFollowersHint: (name) => `يظهر هنا من يتابعونك. أخبر أصدقاءك باسمك: ${iso(handle(name))}`,
    listFailed: 'تعذّر تحميل القائمة',
    more: 'عرض المزيد',
    retry: 'حاول مجددًا',
  },
  notFollowing: 'لا تتابع أحدًا بعد',
  follow: 'تابِع',
  unfollow: 'إلغاء المتابعة',
  find: 'ابحث عن لاعبين',
  sheet: {
    failed: 'تعذّر تحميل اللاعب',
    you: 'أنت',
    followsYou: 'يتابعك',
    counts: (followers, following) =>
      `${plural('ar', followers, {
        one: 'متابع واحد',
        two: 'متابعان',
        few: `${fmt.ar.score(followers)} متابعين`,
        many: `${fmt.ar.score(followers)} متابعًا`,
        other: `${fmt.ar.score(followers)} متابع`,
      })} · يتابع ${fmt.ar.score(following)}`,
    stats: {
      weekly: 'هذا الأسبوع',
      all: 'كل الأوقات',
      runs: 'الجولات',
      posts: 'المنشورات',
      likes: 'الإعجابات',
      perfects: 'مثالي',
    },
  },
  best: {
    title: 'الرقم القياسي للموسم',
    said: (value) => `الرقم القياسي للموسم: ${value}`,
  },
  empty: {
    waiting: 'من تتابعهم لم يلعبوا بعد',
    waitingHint: 'عندما يلعبون سينافسونك هنا.',
    play: 'العب',
    noneHint: 'اللاعبون الذين تتابعهم ينافسونك هنا.',
  },
};

const fr: FriendsMessages = {
  search: {
    title: 'Amis',
    tagline: 'Trouve des joueurs, suis-les, affronte-les',
    field: 'Pseudo',
    placeholder: 'ex. : ekin',
    tooShort: (min) =>
      plural('fr', min, {
        one: `Écris au moins ${min} caractère pour chercher.`,
        other: `Écris au moins ${min} caractères pour chercher.`,
      }),
    tabs: { following: 'Suivis', followers: 'Abonnés' },
    failed: 'Recherche impossible',
    nobody: 'Aucun joueur trouvé',
    nobodyHint: (term) => `Aucun pseudo ne commence par « ${term} ». Vérifie ce que tu as tapé.`,
    followingHint:
      'Cherche des joueurs ci-dessus et suis-les ; tu les verras aussi dans tes classements entre amis.',
    noFollowers: "Pas encore d'abonnés",
    noFollowersHint: (name) =>
      `Tes abonnés apparaissent ici. Donne ton pseudo à tes amis : ${handle(name)}`,
    listFailed: 'Impossible de charger la liste',
    more: 'Voir plus',
    retry: 'Réessayer',
  },
  notFollowing: 'Tu ne suis encore personne',
  follow: 'Suivre',
  unfollow: 'Ne plus suivre',
  find: 'Chercher des joueurs',
  sheet: {
    failed: 'Impossible de charger ce joueur',
    you: 'Toi',
    followsYou: 'Te suit',
    counts: (followers, following) =>
      `${plural('fr', followers, {
        one: `${fmt.fr.score(followers)} abonné`,
        other: `${fmt.fr.score(followers)} abonnés`,
      })} · ${plural('fr', following, {
        one: `${fmt.fr.score(following)} suivi`,
        other: `${fmt.fr.score(following)} suivis`,
      })}`,
    stats: {
      weekly: 'Cette semaine',
      all: 'Depuis toujours',
      runs: 'Parties',
      posts: 'Posts',
      likes: 'Likes',
      perfects: 'Parfait',
    },
  },
  best: {
    title: 'Record de la saison',
    said: (value) => `Record de la saison : ${value}`,
  },
  empty: {
    waiting: "Les joueurs que tu suis n'ont pas encore joué",
    waitingHint: "Dès qu'ils joueront, ils t'affronteront ici.",
    play: 'Jouer',
    noneHint: "Les joueurs que tu suis t'affrontent ici.",
  },
};

const es: FriendsMessages = {
  search: {
    title: 'Amigos',
    tagline: 'Busca jugadores, síguelos, compite',
    field: 'Nombre de usuario',
    placeholder: 'p. ej. ekin',
    tooShort: (min) =>
      plural('es', min, {
        one: 'Escribe al menos 1 carácter para buscar.',
        other: `Escribe al menos ${min} caracteres para buscar.`,
      }),
    tabs: { following: 'Siguiendo', followers: 'Seguidores' },
    failed: 'No se pudo buscar',
    nobody: 'No se encontró a nadie',
    nobodyHint: (term) =>
      `Ningún jugador tiene un nombre que empiece por «${term}». Revisa lo que escribiste.`,
    followingHint:
      'Busca jugadores arriba y síguelos; también los verás en tus clasificaciones de amigos.',
    noFollowers: 'Aún no tienes seguidores',
    noFollowersHint: (name) =>
      `Aquí aparecen quienes te siguen. Dile tu nombre a tus amigos: ${handle(name)}`,
    listFailed: 'No se pudo cargar la lista',
    more: 'Ver más',
    retry: 'Reintentar',
  },
  notFollowing: 'Aún no sigues a nadie',
  follow: 'Seguir',
  unfollow: 'Dejar de seguir',
  find: 'Buscar jugadores',
  sheet: {
    failed: 'No se pudo cargar el jugador',
    you: 'Tú',
    followsYou: 'Te sigue',
    counts: (followers, following) =>
      `${plural('es', followers, {
        one: '1 seguidor',
        other: `${fmt.es.score(followers)} seguidores`,
      })} · ${plural('es', following, {
        one: '1 seguido',
        other: `${fmt.es.score(following)} seguidos`,
      })}`,
    stats: {
      weekly: 'Esta semana',
      all: 'Histórico',
      runs: 'Partidas',
      posts: 'Posts',
      likes: 'Me gusta',
      perfects: 'Perfecto',
    },
  },
  best: {
    title: 'Récord de la temporada',
    said: (value) => `Récord de la temporada: ${value}`,
  },
  empty: {
    waiting: 'Los jugadores que sigues aún no han jugado',
    waitingHint: 'Cuando jueguen, competirán contigo aquí.',
    play: 'Jugar',
    noneHint: 'Los jugadores que sigues compiten contigo aquí.',
  },
};

export const friends: Record<Locale, FriendsMessages> = { tr, en, de, ar, fr, es };
