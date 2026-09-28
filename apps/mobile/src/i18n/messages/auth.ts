import type { Locale } from '@quezby/types';

/**
 * Accounts: signing back in (`login`), an email and password to keep one
 * (`credentials`), the ways in attached to it (`ways`), Apple and Google
 * themselves (`social`), and a new guest's "Hesabını koru" step (`protect`).
 * Apple and Google are the companies' names in every language and come in as
 * `provider`; their buttons' own words are the kit's.
 */
const tr = {
  /** The email field, and its tile among the ways in. */
  email: 'E-posta',
  password: 'Şifre',
  /** Attach a way in to a guest account: the step, the sheet and the email form. */
  keepAccount: 'Hesabını koru',
  keepWithEmail: 'E-postayla koru',
  /** Apple or Google, just attached. */
  linked: (provider: string) => `${provider} bağlandı`,
  login: {
    title: 'Tekrar hoş geldin',
    intro:
      'Hesabını Apple, Google ya da e-postayla koruduysan buradan dönebilirsin. Skorların ve kullanıcı adın seninle gelir.',
    orEmail: 'ya da e-postayla',
    missing: 'E-postanı ve şifreni yaz.',
    submit: 'Giriş yap',
  },
  credentials: {
    title: 'E-posta bağla',
    guestBody: 'Bu hesap şu an yalnızca bu telefonda. E-posta bağlarsan başka cihazdan da girersin.',
    body: 'Bu e-posta ve şifreyle de girersin.',
    guestSubmit: 'Hesabı koru',
    submit: 'E-postayı bağla',
    invalid: 'Geçerli bir e-posta ve en az 8 karakterlik bir şifre yaz.',
    passwordHint: 'En az 8 karakter.',
  },
  ways: {
    /** Once the account is kept: "Giriş yolları". A guest's sheet is `keepAccount`. */
    title: 'Giriş yolları',
    guestBody:
      'Bu hesap şu an yalnızca bu telefonda. Bir giriş yolu bağla; telefon değişse de skorların, ligin ve arkadaşların seninle gelir.',
    body: 'Hesabına bu yollarla girersin. Birini kaldırmak için başka bir yol bağlı kalmalı.',
    linkedBody: (provider: string) => `Artık bu hesaba ${provider} ile de girersin.`,
    attached: 'Bağlı yollar',
    attachedTag: 'Bağlı',
    unlink: 'Bağı kaldır',
    addAnother: 'Başka bir yol bağla',
    addEmail: 'E-posta ve şifre bağla',
    /** The email as a way in, inside a sentence or a list: "Apple ve e-posta". */
    email: 'e-posta',
  },
  social: {
    failed: (provider: string) => `${provider} ile giriş şu an yapılamadı. Biraz sonra tekrar dene.`,
  },
  protect: {
    body: 'Bu hesap şu an yalnızca bu telefonda. Bir giriş yolu bağla; telefonun değişse de adın, skorların ve ligin seninle gelsin.',
    emailLinked: 'E-posta bağlandı',
    wayLinked: 'Giriş yolu bağlandı',
    keptBody: 'Hesabın artık korunuyor. Başka bir telefondan da girebilirsin.',
    continue: 'Devam et',
    /** After the API's own line: the Apple or Google account is another player's. */
    identityTaken: (problem: string) =>
      `${problem} O hesapla oynamak istersen ona geçebilirsin; bu yeni hesap burada kalır.`,
    switchTo: (provider: string) => `${provider} hesabıma geç`,
    notNow: 'Şimdi değil',
  },
};

export type AuthMessages = typeof tr;

const en: AuthMessages = {
  email: 'Email',
  password: 'Password',
  keepAccount: 'Protect your account',
  keepWithEmail: 'Protect with email',
  linked: (provider) => `${provider} linked`,
  login: {
    title: 'Welcome back',
    intro:
      'If you protected your account with Apple, Google or email, sign back in here. Your scores and username come with you.',
    orEmail: 'or with email',
    missing: 'Enter your email and password.',
    submit: 'Sign in',
  },
  credentials: {
    title: 'Link an email',
    guestBody: 'This account only lives on this phone for now. Link an email to sign in from other devices too.',
    body: "You'll be able to sign in with this email and password too.",
    guestSubmit: 'Protect account',
    submit: 'Link email',
    invalid: 'Enter a valid email and a password of at least 8 characters.',
    passwordHint: 'At least 8 characters.',
  },
  ways: {
    title: 'Sign-in methods',
    guestBody:
      'This account only lives on this phone for now. Link a sign-in method and your scores, league and friends come with you, even to a new phone.',
    body: 'These are the ways into your account. To remove one, another must stay linked.',
    linkedBody: (provider) => `You can now sign in to this account with ${provider} too.`,
    attached: 'Linked methods',
    attachedTag: 'Linked',
    unlink: 'Unlink',
    addAnother: 'Link another method',
    addEmail: 'Link email and password',
    email: 'email',
  },
  social: {
    failed: (provider) => `Couldn't sign in with ${provider} right now. Try again in a bit.`,
  },
  protect: {
    body: 'This account only lives on this phone for now. Link a sign-in method so your name, scores and league come with you, even to a new phone.',
    emailLinked: 'Email linked',
    wayLinked: 'Sign-in method linked',
    keptBody: 'Your account is protected now. You can sign in from another phone too.',
    continue: 'Continue',
    identityTaken: (problem) =>
      `${problem} To play with that account, you can switch to it; this new one stays here.`,
    switchTo: (provider) => `Switch to my ${provider} account`,
    notNow: 'Not now',
  },
};

const de: AuthMessages = {
  email: 'E-Mail',
  password: 'Passwort',
  keepAccount: 'Konto sichern',
  keepWithEmail: 'Mit E-Mail sichern',
  linked: (provider) => `${provider} verknüpft`,
  login: {
    title: 'Willkommen zurück',
    intro:
      'Hast du dein Konto mit Apple, Google oder E-Mail gesichert, meldest du dich hier wieder an. Deine Scores und dein Name kommen mit.',
    orEmail: 'oder mit E-Mail',
    missing: 'Gib deine E-Mail und dein Passwort ein.',
    submit: 'Anmelden',
  },
  credentials: {
    title: 'E-Mail verknüpfen',
    guestBody:
      'Dieses Konto gibt es gerade nur auf diesem Handy. Verknüpf eine E-Mail, dann kommst du auch von anderen Geräten rein.',
    body: 'Dann meldest du dich auch mit dieser E-Mail und diesem Passwort an.',
    guestSubmit: 'Konto sichern',
    submit: 'E-Mail verknüpfen',
    invalid: 'Gib eine gültige E-Mail und ein Passwort mit mindestens 8 Zeichen ein.',
    passwordHint: 'Mindestens 8 Zeichen.',
  },
  ways: {
    title: 'Anmeldewege',
    guestBody:
      'Dieses Konto gibt es gerade nur auf diesem Handy. Verknüpf einen Anmeldeweg – dann nimmst du Scores, Liga und Freunde auch auf ein neues Handy mit.',
    body: 'Mit diesen Wegen meldest du dich an. Um einen zu entfernen, muss ein anderer verknüpft bleiben.',
    linkedBody: (provider) => `Jetzt kannst du dich auch mit ${provider} anmelden.`,
    attached: 'Verknüpfte Wege',
    attachedTag: 'Verknüpft',
    unlink: 'Verknüpfung lösen',
    addAnother: 'Weiteren Weg verknüpfen',
    addEmail: 'E-Mail und Passwort verknüpfen',
    email: 'E-Mail',
  },
  social: {
    failed: (provider) => `Die Anmeldung mit ${provider} klappt gerade nicht. Versuch es gleich noch mal.`,
  },
  protect: {
    body: 'Dieses Konto gibt es gerade nur auf diesem Handy. Verknüpf einen Anmeldeweg, damit Name, Scores und Liga auch auf ein neues Handy mitkommen.',
    emailLinked: 'E-Mail verknüpft',
    wayLinked: 'Anmeldeweg verknüpft',
    keptBody: 'Dein Konto ist jetzt gesichert. Du kannst dich auch auf einem anderen Handy anmelden.',
    continue: 'Weiter',
    identityTaken: (problem) =>
      `${problem} Willst du mit diesem Konto spielen, kannst du dorthin wechseln; dieses neue Konto bleibt hier.`,
    switchTo: (provider) => `Zu meinem ${provider}-Konto wechseln`,
    notNow: 'Nicht jetzt',
  },
};

const ar: AuthMessages = {
  email: 'البريد الإلكتروني',
  password: 'كلمة المرور',
  keepAccount: 'احمِ حسابك',
  keepWithEmail: 'الحماية بالبريد الإلكتروني',
  linked: (provider) => `تم ربط ‎${provider}‎`,
  login: {
    title: 'مرحبًا بعودتك',
    intro:
      'إن كنت قد حميت حسابك باستخدام Apple أو Google أو البريد الإلكتروني فعُد إليه من هنا. ستنتقل معك نتائجك واسم المستخدم الخاص بك.',
    orEmail: 'أو بالبريد الإلكتروني',
    missing: 'اكتب بريدك الإلكتروني وكلمة المرور.',
    submit: 'تسجيل الدخول',
  },
  credentials: {
    title: 'ربط بريد إلكتروني',
    guestBody:
      'هذا الحساب موجود على هذا الهاتف فقط حاليًا. إذا ربطت بريدًا إلكترونيًا فستدخل إليه من أجهزة أخرى أيضًا.',
    body: 'ستتمكن من الدخول بهذا البريد الإلكتروني وكلمة المرور أيضًا.',
    guestSubmit: 'حماية الحساب',
    submit: 'ربط البريد الإلكتروني',
    invalid: 'اكتب بريدًا إلكترونيًا صالحًا وكلمة مرور من 8 أحرف على الأقل.',
    passwordHint: '8 أحرف على الأقل.',
  },
  ways: {
    title: 'طرق تسجيل الدخول',
    guestBody:
      'هذا الحساب موجود على هذا الهاتف فقط حاليًا. اربط طريقة لتسجيل الدخول، وستنتقل معك نتائجك ودوريك وأصدقاؤك حتى لو تغيّر هاتفك.',
    body: 'تدخل إلى حسابك بهذه الطرق. لإزالة إحداها يجب أن تبقى طريقة أخرى مربوطة.',
    linkedBody: (provider) => `يمكنك الآن الدخول إلى هذا الحساب باستخدام ‎${provider}‎ أيضًا.`,
    attached: 'الطرق المربوطة',
    attachedTag: 'مربوط',
    unlink: 'إلغاء الربط',
    addAnother: 'اربط طريقة أخرى',
    addEmail: 'ربط بريد إلكتروني وكلمة مرور',
    email: 'البريد الإلكتروني',
  },
  social: {
    failed: (provider) =>
      `تعذّر تسجيل الدخول باستخدام ‎${provider}‎ الآن. حاول مرة أخرى بعد قليل.`,
  },
  protect: {
    body: 'هذا الحساب موجود على هذا الهاتف فقط حاليًا. اربط طريقة لتسجيل الدخول لينتقل معك اسمك ونتائجك ودوريك حتى لو تغيّر هاتفك.',
    emailLinked: 'تم ربط البريد الإلكتروني',
    wayLinked: 'تم ربط طريقة تسجيل الدخول',
    keptBody: 'حسابك محميّ الآن. يمكنك الدخول إليه من هاتف آخر أيضًا.',
    continue: 'متابعة',
    identityTaken: (problem) =>
      `${problem} إن أردت اللعب بذلك الحساب فيمكنك الانتقال إليه، ويبقى هذا الحساب الجديد هنا.`,
    switchTo: (provider) => `الانتقال إلى حسابي على ‎${provider}‎`,
    notNow: 'ليس الآن',
  },
};

const fr: AuthMessages = {
  email: 'E-mail',
  password: 'Mot de passe',
  keepAccount: 'Protège ton compte',
  keepWithEmail: 'Protéger avec un e-mail',
  linked: (provider) => `${provider} lié`,
  login: {
    title: 'Content de te revoir',
    intro:
      'Si tu as protégé ton compte avec Apple, Google ou un e-mail, tu peux le retrouver ici. Tes scores et ton pseudo te suivent.',
    orEmail: 'ou avec un e-mail',
    missing: 'Saisis ton e-mail et ton mot de passe.',
    submit: 'Se connecter',
  },
  credentials: {
    title: 'Lier un e-mail',
    guestBody:
      "Pour l'instant, ce compte n'existe que sur ce téléphone. Lie un e-mail pour te connecter aussi depuis un autre appareil.",
    body: 'Tu pourras aussi te connecter avec cet e-mail et ce mot de passe.',
    guestSubmit: 'Protéger le compte',
    submit: "Lier l'e-mail",
    invalid: "Saisis un e-mail valide et un mot de passe d'au moins 8 caractères.",
    passwordHint: 'Au moins 8 caractères.',
  },
  ways: {
    title: 'Moyens de connexion',
    guestBody:
      "Pour l'instant, ce compte n'existe que sur ce téléphone. Lie un moyen de connexion : même sur un nouveau téléphone, tes scores, ta ligue et tes amis te suivent.",
    body: 'Tu te connectes à ton compte avec ces moyens. Pour en retirer un, un autre doit rester lié.',
    linkedBody: (provider) => `Tu peux maintenant aussi te connecter à ce compte avec ${provider}.`,
    attached: 'Moyens liés',
    attachedTag: 'Lié',
    unlink: 'Dissocier',
    addAnother: 'Lier un autre moyen',
    addEmail: 'Lier e-mail et mot de passe',
    email: 'e-mail',
  },
  social: {
    failed: (provider) => `Connexion avec ${provider} impossible pour le moment. Réessaie un peu plus tard.`,
  },
  protect: {
    body: "Pour l'instant, ce compte n'existe que sur ce téléphone. Lie un moyen de connexion pour garder ton nom, tes scores et ta ligue, même sur un nouveau téléphone.",
    emailLinked: 'E-mail lié',
    wayLinked: 'Moyen de connexion lié',
    keptBody: 'Ton compte est maintenant protégé. Tu peux aussi te connecter depuis un autre téléphone.',
    continue: 'Continuer',
    identityTaken: (problem) =>
      `${problem} Pour jouer avec ce compte-là, tu peux passer dessus ; ce nouveau compte reste ici.`,
    switchTo: (provider) => `Passer à mon compte ${provider}`,
    notNow: 'Pas maintenant',
  },
};

const es: AuthMessages = {
  email: 'Correo',
  password: 'Contraseña',
  keepAccount: 'Protege tu cuenta',
  keepWithEmail: 'Proteger con correo',
  linked: (provider) => `${provider} vinculado`,
  login: {
    title: 'Hola de nuevo',
    intro:
      'Si protegiste tu cuenta con Apple, Google o tu correo, puedes volver desde aquí. Tus puntuaciones y tu nombre de usuario vienen contigo.',
    orEmail: 'o con tu correo',
    missing: 'Escribe tu correo y tu contraseña.',
    submit: 'Iniciar sesión',
  },
  credentials: {
    title: 'Vincular correo',
    guestBody:
      'Por ahora, esta cuenta solo está en este teléfono. Si vinculas un correo, también podrás entrar desde otro dispositivo.',
    body: 'También podrás entrar con este correo y esta contraseña.',
    guestSubmit: 'Proteger la cuenta',
    submit: 'Vincular el correo',
    invalid: 'Escribe un correo válido y una contraseña de al menos 8 caracteres.',
    passwordHint: 'Al menos 8 caracteres.',
  },
  ways: {
    title: 'Métodos de acceso',
    guestBody:
      'Por ahora, esta cuenta solo está en este teléfono. Vincula un método de acceso: aunque cambies de teléfono, tus puntuaciones, tu liga y tus amigos vienen contigo.',
    body: 'Entras a tu cuenta con estos métodos. Para quitar uno, otro debe seguir vinculado.',
    linkedBody: (provider) => `Ahora también puedes entrar a esta cuenta con ${provider}.`,
    attached: 'Métodos vinculados',
    attachedTag: 'Vinculado',
    unlink: 'Desvincular',
    addAnother: 'Vincular otro método',
    addEmail: 'Vincular correo y contraseña',
    email: 'correo',
  },
  social: {
    failed: (provider) => `No se pudo iniciar sesión con ${provider} ahora. Inténtalo de nuevo en un rato.`,
  },
  protect: {
    body: 'Por ahora, esta cuenta solo está en este teléfono. Vincula un método de acceso para que tu nombre, tus puntuaciones y tu liga te acompañen aunque cambies de teléfono.',
    emailLinked: 'Correo vinculado',
    wayLinked: 'Método de acceso vinculado',
    keptBody: 'Tu cuenta ya está protegida. También puedes entrar desde otro teléfono.',
    continue: 'Continuar',
    identityTaken: (problem) =>
      `${problem} Si quieres jugar con esa cuenta, puedes cambiarte a ella; esta cuenta nueva se queda aquí.`,
    switchTo: (provider) => `Cambiar a mi cuenta de ${provider}`,
    notNow: 'Ahora no',
  },
};

export const auth: Record<Locale, AuthMessages> = { tr, en, de, ar, fr, es };
