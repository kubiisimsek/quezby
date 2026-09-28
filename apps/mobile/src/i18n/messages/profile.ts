import { groupDigits } from '@quezby/config';
import type { Locale } from '@quezby/types';

import { iso } from '@/i18n/format';
import { plural } from '@/i18n/plural';

/**
 * The profile: the player's card, the guest's nudge to keep the account, the
 * statistics, the name and delete sheets, and Ayarlar. `name` is always a
 * player's name as `handle` writes it (`@ekin`); `ways` a list `t.fmt.list`
 * has already joined ("Apple ve e-posta").
 */
const tr = {
  hero: {
    ribbon: 'PROFİL',
    guest: 'Misafir hesap',
    linked: (ways: string) => `${ways} ile bağlı`,
  },
  /**
   * Under "Hesabını koru" (`t.auth.keepAccount`), out front on a guest's
   * profile and in Ayarlar: the ways this build offers — `t.auth.ways.email`
   * for email — then why.
   */
  keepHint: (ways: string) => `${ways} bağla; telefon değişse de skorların kaybolmaz.`,
  /**
   * The lifetime counts. The ones a player card shows too — Tur, Post,
   * Beğeni, Mükemmel — are `t.friends.sheet.stats`, the highest combo is
   * `t.result.stats.maxCombo`, and the periods of the places are
   * `t.board.summit.periods`.
   */
  stats: {
    title: 'İstatistikler',
    failed: 'İstatistikler yüklenemedi',
    retry: 'Tekrar dene',
    swipes: 'Kaydırma',
    bestReaction: 'En iyi tepki',
    milliseconds: (ms: string) => `${ms} ms`,
    playTime: 'Oyun süresi',
  },
  combos: {
    title: 'İsimli kombolar',
    empty: 'Henüz isimli kombo yapmadın. Nasıl yapıldıkları Yardım’da.',
  },
  liked: {
    title: 'En çok beğendiğin',
    empty: 'Arkadaşlarının postlarını beğendikçe en sevdiklerin burada görünür.',
    times: (count: number) => `${groupDigits(count, 'tr')} kez`,
  },
  /** The portrait's slab and what it opens. */
  photo: {
    change: 'Fotoğrafını değiştir',
    add: 'Fotoğraf ekle',
    title: 'Profil fotoğrafı',
    pick: 'Galeriden seç',
    pickHint: 'Kare olarak kırparsın; herkes görür.',
    remove: 'Fotoğrafı kaldır',
    removeHint: 'Yerine baş harflerin görünür.',
    failed: 'Fotoğraf açılamadı',
  },
  /** Framing the photo before it is saved. */
  avatarEditor: {
    title: 'Fotoğrafın',
    tagline: 'Sürükle, iki parmakla büyüt',
    save: 'Kaydet',
    another: 'Başka fotoğraf seç',
    failed: 'Fotoğraf kaydedilemedi',
    frame: 'Fotoğrafının dairede görünen kısmı',
  },
  /** The one pick of a name, over the automatic one; it saves with the sheet's own "Kaydet". */
  pickName: {
    title: 'Adını seç',
    description: (name: string) =>
      `Şimdilik ${name} olarak görünüyorsun. Seçtiğin ad bütün skorlarında görünür ve bir daha değişmez.`,
    descriptionNoName: 'Seçtiğin ad bütün skorlarında görünür ve bir daha değişmez.',
  },
  deleteAccount: {
    title: 'Hesabı sil',
    description: 'Bu geri alınamaz: adın, skorların ve sıralamadaki yerin silinir.',
    submit: 'Hesabı kalıcı olarak sil',
    confirm: (name: string) => `Onay için ${name} yaz`,
    mismatch: 'Onaylamak için kullanıcı adını aynen yaz.',
  },
  /**
   * Ayarlar: the game's settings, Yardım, and the account's doors. A door
   * is called what it opens: Yardım is `t.help.title`, Adını seç
   * `pickName.title`, Giriş yolları `t.auth.ways.title`, Hesabını koru
   * `t.auth.keepAccount`, Hesabı sil `deleteAccount.title`; the gear on the
   * card is `settings.title`.
   */
  settings: {
    title: 'Ayarlar',
    game: 'Oyun',
    haptics: 'Titreşim',
    hapticsOn: 'Her kaydırmada ve hatada titrer.',
    hapticsOff: 'Oyun sessizce oynanır.',
    analytics: 'Kullanım verisi',
    analyticsOn: 'Hangi ekranlara girdiğini ve ne kadar oynadığını sayarız.',
    analyticsOff: 'Yalnızca oyunun çalışması için gereken cihaz bilgisi gider.',
    helpHint: 'Postlar, puanlar, ligler ve hesabın.',
    social: 'Arkadaşlar',
    notifications: 'Bildirimler',
    notificationsHint: 'İstekler, VS ve mesajlar',
    blocked: 'Engellenenler',
    blockedHint: 'Engellediğin oyuncular',
    account: 'Hesap',
    pickNameHint: (name: string) => `Şimdilik ${name} · bir kez seçersin`,
    noName: 'Henüz bir adın yok',
    /** A picked name, locked — never "değiştir". */
    name: 'Kullanıcı adın',
    nameLocked: (name: string) => `${name} · kalıcı`,
    waysLinked: (ways: string) => `${ways} bağlı`,
    signOut: 'Çıkış yap',
    signOutHint: (ways: string) => `Tekrar ${ways} ile girebilirsin.`,
    deleteHint: 'Skorların ve adın kalıcı olarak silinir.',
  },
};

export type ProfileMessages = typeof tr;

const en: ProfileMessages = {
  hero: {
    ribbon: 'PROFILE',
    guest: 'Guest account',
    linked: (ways) => `Linked with ${ways}`,
  },
  keepHint: (ways) => `Link ${ways} and your scores stay with you, even on a new phone.`,
  stats: {
    title: 'Stats',
    failed: "Couldn't load your stats",
    retry: 'Try again',
    swipes: 'Swipes',
    bestReaction: 'Best reaction',
    milliseconds: (ms) => `${ms} ms`,
    playTime: 'Play time',
  },
  combos: {
    title: 'Named combos',
    empty: "You haven't pulled off a named combo yet. Help shows you how.",
  },
  liked: {
    title: 'Your most liked',
    empty: "Like your friends' posts and your favorites show up here.",
    times: (count) => {
      const n = groupDigits(count, 'en');
      return plural('en', count, { one: `${n} time`, other: `${n} times` });
    },
  },
  photo: {
    change: 'Change your photo',
    add: 'Add a photo',
    title: 'Profile photo',
    pick: 'Choose from library',
    pickHint: 'You crop it square; everyone sees it.',
    remove: 'Remove photo',
    removeHint: 'Your initials show instead.',
    failed: "Couldn't open the photo",
  },
  avatarEditor: {
    title: 'Your photo',
    tagline: 'Drag it, pinch to zoom',
    save: 'Save',
    another: 'Choose another photo',
    failed: "Couldn't save the photo",
    frame: 'The part of your photo inside the circle',
  },
  pickName: {
    title: 'Pick your name',
    description: (name) =>
      `For now you show up as ${name}. The name you pick appears on all your scores and never changes.`,
    descriptionNoName: 'The name you pick appears on all your scores and never changes.',
  },
  deleteAccount: {
    title: 'Delete account',
    description:
      "This can't be undone: your name, your scores and your place in the rankings are deleted.",
    submit: 'Delete account permanently',
    confirm: (name) => `Type ${name} to confirm`,
    mismatch: 'Type your username exactly as it is to confirm.',
  },
  settings: {
    title: 'Settings',
    game: 'Game',
    haptics: 'Vibration',
    hapticsOn: 'Vibrates on every swipe and every mistake.',
    hapticsOff: 'The game plays without vibration.',
    analytics: 'Usage data',
    analyticsOn: 'We count which screens you open and how long you play.',
    analyticsOff: 'Only the device info the game needs to run is sent.',
    helpHint: 'Posts, points, leagues and your account.',
    social: 'Friends',
    notifications: 'Notifications',
    notificationsHint: 'Requests, VS and messages',
    blocked: 'Blocked players',
    blockedHint: 'Players you blocked',
    account: 'Account',
    pickNameHint: (name) => `For now ${name} · you pick once`,
    noName: "You don't have a name yet",
    name: 'Your username',
    nameLocked: (name) => `${name} · permanent`,
    waysLinked: (ways) => `${ways} linked`,
    signOut: 'Sign out',
    signOutHint: (ways) => `You can sign back in with ${ways}.`,
    deleteHint: 'Your scores and your name are deleted for good.',
  },
};

const de: ProfileMessages = {
  hero: {
    ribbon: 'PROFIL',
    guest: 'Gastkonto',
    linked: (ways) => `Verknüpft mit ${ways}`,
  },
  keepHint: (ways) =>
    `Verknüpf ${ways} mit deinem Konto, dann bleiben deine Scores auch auf einem neuen Handy erhalten.`,
  stats: {
    title: 'Statistiken',
    failed: 'Statistiken konnten nicht geladen werden',
    retry: 'Noch mal versuchen',
    swipes: 'Wischer',
    bestReaction: 'Beste Reaktion',
    milliseconds: (ms) => `${ms} ms`,
    playTime: 'Spielzeit',
  },
  combos: {
    title: 'Spezialkombos',
    empty: 'Du hast noch keine Spezialkombo geschafft. Wie das geht, steht in der Hilfe.',
  },
  liked: {
    title: 'Am meisten gelikt',
    empty: 'Like die Posts deiner Freunde – deine Favoriten erscheinen dann hier.',
    times: (count) => `${groupDigits(count, 'de')}-mal`,
  },
  photo: {
    change: 'Foto ändern',
    add: 'Foto hinzufügen',
    title: 'Profilfoto',
    pick: 'Aus der Mediathek wählen',
    pickHint: 'Du schneidest es quadratisch zu; alle sehen es.',
    remove: 'Foto entfernen',
    removeHint: 'Stattdessen erscheinen deine Initialen.',
    failed: 'Foto konnte nicht geöffnet werden',
  },
  avatarEditor: {
    title: 'Dein Foto',
    tagline: 'Ziehen, mit zwei Fingern zoomen',
    save: 'Speichern',
    another: 'Anderes Foto wählen',
    failed: 'Foto konnte nicht gespeichert werden',
    frame: 'Der Teil deines Fotos im Kreis',
  },
  pickName: {
    title: 'Wähle deinen Namen',
    description: (name) =>
      `Im Moment erscheinst du als ${name}. Dein gewählter Name steht bei all deinen Scores und bleibt für immer.`,
    descriptionNoName: 'Dein gewählter Name steht bei all deinen Scores und bleibt für immer.',
  },
  deleteAccount: {
    title: 'Konto löschen',
    description:
      'Das lässt sich nicht rückgängig machen: Dein Name, deine Scores und deine Plätze in den Ranglisten werden gelöscht.',
    submit: 'Konto endgültig löschen',
    confirm: (name) => `Gib zur Bestätigung ${name} ein`,
    mismatch: 'Gib zur Bestätigung deinen Namen genau so ein, wie er ist.',
  },
  settings: {
    title: 'Einstellungen',
    game: 'Spiel',
    haptics: 'Vibration',
    hapticsOn: 'Vibriert bei jedem Wischen und jedem Fehler.',
    hapticsOff: 'Das Spiel läuft ohne Vibration.',
    analytics: 'Nutzungsdaten',
    analyticsOn: 'Wir zählen, welche Bildschirme du öffnest und wie lange du spielst.',
    analyticsOff: 'Es werden nur die Geräteinfos gesendet, die das Spiel zum Laufen braucht.',
    helpHint: 'Posts, Punkte, Ligen und dein Konto.',
    social: 'Freunde',
    notifications: 'Mitteilungen',
    notificationsHint: 'Anfragen, VS und Nachrichten',
    blocked: 'Blockiert',
    blockedHint: 'Spieler, die du blockiert hast',
    account: 'Konto',
    pickNameHint: (name) => `Vorerst ${name} · du wählst nur einmal`,
    noName: 'Du hast noch keinen Namen',
    name: 'Dein Name',
    nameLocked: (name) => `${name} · dauerhaft`,
    waysLinked: (ways) => `${ways} verknüpft`,
    signOut: 'Abmelden',
    signOutHint: (ways) => `Du kannst dich wieder mit ${ways} anmelden.`,
    deleteHint: 'Deine Scores und dein Name werden endgültig gelöscht.',
  },
};

const ar: ProfileMessages = {
  hero: {
    ribbon: 'الملف',
    guest: 'حساب ضيف',
    linked: (ways) => `مرتبط بـ ${ways}`,
  },
  keepHint: (ways) => `اربط ${ways}، فلا تضيع نتائجك حتى لو تغيّر هاتفك.`,
  stats: {
    title: 'الإحصاءات',
    failed: 'تعذّر تحميل الإحصاءات',
    retry: 'حاول مجددًا',
    swipes: 'السحبات',
    bestReaction: 'أفضل ردّ فعل',
    milliseconds: (ms) => `${ms} مللي ثانية`,
    playTime: 'وقت اللعب',
  },
  combos: {
    title: 'الكومبو الخاصة',
    empty: 'لم تحقق أي كومبو خاص بعد. تجد طريقة ذلك في المساعدة.',
  },
  liked: {
    title: 'الأكثر إعجابًا لديك',
    empty: 'كلما أعجبت بمنشورات أصدقائك ظهرت مفضلاتك هنا.',
    times: (count) => {
      const n = groupDigits(count, 'ar');
      return plural('ar', count, {
        zero: `${n} مرة`,
        one: 'مرة واحدة',
        two: 'مرتان',
        few: `${n} مرات`,
        many: `${n} مرة`,
        other: `${n} مرة`,
      });
    },
  },
  photo: {
    change: 'غيّر صورتك',
    add: 'أضف صورة',
    title: 'صورة الملف الشخصي',
    pick: 'اختر من المعرض',
    pickHint: 'تقصّها مربعة؛ ويراها الجميع.',
    remove: 'أزل الصورة',
    removeHint: 'تظهر الأحرف الأولى من اسمك بدلًا منها.',
    failed: 'تعذّر فتح الصورة',
  },
  avatarEditor: {
    title: 'صورتك',
    tagline: 'اسحبها، وقرّب بإصبعين',
    save: 'احفظ',
    another: 'اختر صورة أخرى',
    failed: 'تعذّر حفظ الصورة',
    frame: 'الجزء الظاهر من صورتك داخل الدائرة',
  },
  pickName: {
    title: 'اختر اسمك',
    description: (name) =>
      `تظهر حاليًا باسم ${iso(name)}. الاسم الذي تختاره يظهر مع كل نتائجك ولن يتغيّر أبدًا.`,
    descriptionNoName: 'الاسم الذي تختاره يظهر مع كل نتائجك ولن يتغيّر أبدًا.',
  },
  deleteAccount: {
    title: 'حذف الحساب',
    description: 'لا يمكن التراجع عن هذا: سيُحذف اسمك ونتائجك ومكانك في الترتيب.',
    submit: 'حذف الحساب نهائيًا',
    confirm: (name) => `اكتب ${iso(name)} للتأكيد`,
    mismatch: 'للتأكيد، اكتب اسم المستخدم كما هو تمامًا.',
  },
  settings: {
    title: 'الإعدادات',
    game: 'اللعبة',
    haptics: 'الاهتزاز',
    hapticsOn: 'يهتز الهاتف مع كل سحبة وكل خطأ.',
    hapticsOff: 'تعمل اللعبة بلا اهتزاز.',
    analytics: 'بيانات الاستخدام',
    analyticsOn: 'نحسب الشاشات التي تفتحها والمدة التي تلعبها.',
    analyticsOff: 'لا تُرسَل إلا معلومات الجهاز اللازمة لعمل اللعبة.',
    helpHint: 'المنشورات والنقاط والدوريات وحسابك.',
    social: 'الأصدقاء',
    notifications: 'الإشعارات',
    notificationsHint: 'الطلبات والتحديات والرسائل',
    blocked: 'المحظورون',
    blockedHint: 'اللاعبون الذين حظرتهم',
    account: 'الحساب',
    pickNameHint: (name) => `حاليًا ${iso(name)} · تختار مرة واحدة فقط`,
    noName: 'ليس لديك اسم بعد',
    name: 'اسم المستخدم',
    nameLocked: (name) => `${iso(name)} · دائم`,
    waysLinked: (ways) => `مرتبط بـ ${ways}`,
    signOut: 'تسجيل الخروج',
    signOutHint: (ways) => `يمكنك الدخول مجددًا باستخدام ${ways}.`,
    deleteHint: 'تُحذف نتائجك واسمك نهائيًا.',
  },
};

const fr: ProfileMessages = {
  hero: {
    ribbon: 'PROFIL',
    guest: 'Compte invité',
    linked: (ways) => `Lié à ${ways}`,
  },
  keepHint: (ways) =>
    `Lie ${ways} à ton compte : tes scores te suivent même sur un nouveau téléphone.`,
  stats: {
    title: 'Statistiques',
    failed: 'Impossible de charger tes statistiques',
    retry: 'Réessayer',
    swipes: 'Swipes',
    bestReaction: 'Meilleure réaction',
    milliseconds: (ms) => `${ms} ms`,
    playTime: 'Temps de jeu',
  },
  combos: {
    title: 'Combos spéciaux',
    empty: "Tu n'as encore réussi aucun combo spécial. L'Aide explique comment faire.",
  },
  liked: {
    title: 'Les plus likés',
    empty: 'Like les posts de tes amis et tes favoris apparaîtront ici.',
    times: (count) => `${groupDigits(count, 'fr')} fois`,
  },
  photo: {
    change: 'Changer ta photo',
    add: 'Ajouter une photo',
    title: 'Photo de profil',
    pick: 'Choisir dans la galerie',
    pickHint: 'Tu la recadres en carré ; tout le monde la voit.',
    remove: 'Retirer la photo',
    removeHint: 'Tes initiales s’affichent à la place.',
    failed: 'Impossible d’ouvrir la photo',
  },
  avatarEditor: {
    title: 'Ta photo',
    tagline: 'Fais-la glisser, pince pour zoomer',
    save: 'Enregistrer',
    another: 'Choisir une autre photo',
    failed: 'Impossible d’enregistrer la photo',
    frame: 'La partie de ta photo dans le cercle',
  },
  pickName: {
    title: 'Choisis ton nom',
    description: (name) =>
      `Pour l'instant, tu apparais comme ${name}. Le nom choisi s'affiche sur tous tes scores et ne change plus jamais.`,
    descriptionNoName: "Le nom choisi s'affiche sur tous tes scores et ne change plus jamais.",
  },
  deleteAccount: {
    title: 'Supprimer le compte',
    description:
      "C'est irréversible : ton nom, tes scores et ta place au classement sont supprimés.",
    submit: 'Supprimer définitivement le compte',
    confirm: (name) => `Écris ${name} pour confirmer`,
    mismatch: 'Pour confirmer, écris ton pseudo exactement.',
  },
  settings: {
    title: 'Réglages',
    game: 'Jeu',
    haptics: 'Vibrations',
    hapticsOn: 'Vibre à chaque swipe et à chaque erreur.',
    hapticsOff: 'Le jeu se joue sans vibrations.',
    analytics: "Données d'utilisation",
    analyticsOn: 'On compte les écrans que tu ouvres et combien de temps tu joues.',
    analyticsOff: "Seules les infos de l'appareil nécessaires au jeu sont envoyées.",
    helpHint: 'Posts, points, ligues et ton compte.',
    social: 'Amis',
    notifications: 'Notifications',
    notificationsHint: 'Demandes, VS et messages',
    blocked: 'Joueurs bloqués',
    blockedHint: 'Les joueurs que tu as bloqués',
    account: 'Compte',
    pickNameHint: (name) => `Pour l'instant ${name} · un seul choix`,
    noName: "Tu n'as pas encore de nom",
    name: 'Ton pseudo',
    nameLocked: (name) => `${name} · définitif`,
    waysLinked: (ways) => `Connecté avec ${ways}`,
    signOut: 'Se déconnecter',
    signOutHint: (ways) => `Tu pourras te reconnecter avec ${ways}.`,
    deleteHint: 'Tes scores et ton nom sont supprimés définitivement.',
  },
};

const es: ProfileMessages = {
  hero: {
    ribbon: 'PERFIL',
    guest: 'Cuenta de invitado',
    linked: (ways) => `Vinculada a ${ways}`,
  },
  keepHint: (ways) =>
    `Vincula ${ways} a tu cuenta: tus puntuaciones no se pierden aunque cambies de teléfono.`,
  stats: {
    title: 'Estadísticas',
    failed: 'No se pudieron cargar tus estadísticas',
    retry: 'Reintentar',
    swipes: 'Deslizamientos',
    bestReaction: 'Mejor reacción',
    milliseconds: (ms) => `${ms} ms`,
    playTime: 'Tiempo de juego',
  },
  combos: {
    title: 'Combos especiales',
    empty: 'Aún no has logrado ningún combo especial. En Ayuda te explicamos cómo.',
  },
  liked: {
    title: 'Lo que más te gustó',
    empty: 'Dale me gusta a los posts de tus amigos y tus favoritos aparecerán aquí.',
    times: (count) => {
      const n = groupDigits(count, 'es');
      return plural('es', count, { one: `${n} vez`, other: `${n} veces` });
    },
  },
  photo: {
    change: 'Cambiar tu foto',
    add: 'Añadir una foto',
    title: 'Foto de perfil',
    pick: 'Elegir de la galería',
    pickHint: 'La recortas en cuadrado; todos la ven.',
    remove: 'Quitar la foto',
    removeHint: 'En su lugar se muestran tus iniciales.',
    failed: 'No se pudo abrir la foto',
  },
  avatarEditor: {
    title: 'Tu foto',
    tagline: 'Arrástrala, pellizca para ampliar',
    save: 'Guardar',
    another: 'Elegir otra foto',
    failed: 'No se pudo guardar la foto',
    frame: 'La parte de tu foto dentro del círculo',
  },
  pickName: {
    title: 'Elige tu nombre',
    description: (name) =>
      `Por ahora apareces como ${name}. El nombre que elijas aparece en todas tus puntuaciones y no cambia nunca.`,
    descriptionNoName:
      'El nombre que elijas aparece en todas tus puntuaciones y no cambia nunca.',
  },
  deleteAccount: {
    title: 'Eliminar cuenta',
    description:
      'No se puede deshacer: se borran tu nombre, tus puntuaciones y tu lugar en la clasificación.',
    submit: 'Eliminar la cuenta para siempre',
    confirm: (name) => `Escribe ${name} para confirmar`,
    mismatch: 'Para confirmar, escribe tu nombre de usuario tal cual.',
  },
  settings: {
    title: 'Ajustes',
    game: 'Juego',
    haptics: 'Vibración',
    hapticsOn: 'Vibra con cada deslizamiento y cada error.',
    hapticsOff: 'El juego funciona sin vibración.',
    analytics: 'Datos de uso',
    analyticsOn: 'Contamos qué pantallas abres y cuánto tiempo juegas.',
    analyticsOff:
      'Solo se envía la información del dispositivo que el juego necesita para funcionar.',
    helpHint: 'Posts, puntos, ligas y tu cuenta.',
    social: 'Amigos',
    notifications: 'Notificaciones',
    notificationsHint: 'Solicitudes, VS y mensajes',
    blocked: 'Bloqueados',
    blockedHint: 'Jugadores que bloqueaste',
    account: 'Cuenta',
    pickNameHint: (name) => `Por ahora ${name} · solo eliges una vez`,
    noName: 'Aún no tienes nombre',
    name: 'Tu nombre de usuario',
    nameLocked: (name) => `${name} · permanente`,
    waysLinked: (ways) => `Vinculada a ${ways}`,
    signOut: 'Cerrar sesión',
    signOutHint: (ways) => `Podrás volver a entrar con ${ways}.`,
    deleteHint: 'Tus puntuaciones y tu nombre se borran para siempre.',
  },
};

export const profile: Record<Locale, ProfileMessages> = { tr, en, de, ar, fr, es };
