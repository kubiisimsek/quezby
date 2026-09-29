import type { Locale } from '@quezby/types';

/**
 * Accounts: the ways in on a phone with no account (`join`), a new email
 * account (`register`), the emailed code that proves an address (`verify`),
 * a forgotten password (`forgot`), an email and password to keep a guest
 * (`credentials`), the ways in attached to it (`ways`), and Apple and Google
 * themselves (`social`). Apple and Google are the companies' names in every
 * language and come in as `provider`; their buttons' own words are the kit's.
 */
const tr = {
  /** The email field, and its tile among the ways in. */
  email: 'E-posta',
  password: 'Şifre',
  /** A password typed twice, to be sure: a new account, a new password, an email attached. */
  confirmPassword: 'Şifreyi doğrula',
  /** Attach a way in to a guest account: the sheet and the email form. */
  keepAccount: 'Hesabını koru',
  keepWithEmail: 'E-postayla koru',
  /** Apple or Google, just attached. */
  linked: (provider: string) => `${provider} bağlandı`,
  /** The ways in on a phone with no account: signing in, then signing up, Apple, Google, a guest. */
  join: {
    title: 'Giriş yap',
    submit: 'Giriş yap',
    missing: 'E-postanı ve şifreni yaz.',
    forgot: 'Şifremi unuttum',
    noAccount: 'Hesabın yok mu? Kayıt ol',
    or: 'ya da',
    guest: 'Misafir olarak devam et',
  },
  /** A new email account: the code comes before the account. */
  register: {
    title: 'Kayıt ol',
    submit: 'Kayıt ol',
    mismatch: 'Şifreler aynı değil.',
    exists: 'Bu e-postayla bir hesabın var.',
    toLogin: 'Giriş yap',
    haveAccount: 'Hesabın var mı? Giriş yap',
  },
  /** The six-digit code emailed to prove an address: a sign-up, an email attached. */
  verify: {
    title: 'E-postanı doğrula',
    body: (email: string) => `${email} adresine 6 haneli bir kod gönderdik.`,
    code: 'Kod',
    submit: 'Doğrula',
    short: 'Kodun 6 hanesini yaz.',
    resend: 'Kodu tekrar gönder',
    /** The wait before a new code, as the clock shows it: "0:42". */
    resendIn: (time: string) => `Kodu tekrar gönder (${time})`,
    sent: 'Yeni kodu gönderdik.',
    spam: 'Gelmediyse gereksiz klasörüne bak.',
  },
  /** A forgotten password: a code to the account's email, then the new password. */
  forgot: {
    title: 'Şifremi unuttum',
    body: 'Hesabının e-postasını yaz, sana bir kod gönderelim.',
    send: 'Kod gönder',
    email: 'Geçerli bir e-posta yaz.',
    codeBody: (email: string) => `${email} adresine bir kod gönderdik. Kodu ve yeni şifreni yaz.`,
    newPassword: 'Yeni şifre',
    submit: 'Şifreyi değiştir',
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
};

export type AuthMessages = typeof tr;

const en: AuthMessages = {
  email: 'Email',
  password: 'Password',
  confirmPassword: 'Confirm password',
  keepAccount: 'Protect your account',
  keepWithEmail: 'Protect with email',
  linked: (provider) => `${provider} linked`,
  join: {
    title: 'Sign in',
    submit: 'Sign in',
    missing: 'Enter your email and password.',
    forgot: 'Forgot password?',
    noAccount: 'No account yet? Sign up',
    or: 'or',
    guest: 'Continue as guest',
  },
  register: {
    title: 'Sign up',
    submit: 'Sign up',
    mismatch: "Passwords don't match.",
    exists: 'You already have an account with this email.',
    toLogin: 'Sign in',
    haveAccount: 'Have an account? Sign in',
  },
  verify: {
    title: 'Verify your email',
    body: (email) => `We sent a 6-digit code to ${email}.`,
    code: 'Code',
    submit: 'Verify',
    short: 'Enter all 6 digits.',
    resend: 'Send the code again',
    resendIn: (time) => `Send the code again (${time})`,
    sent: 'We sent a new code.',
    spam: 'Not there? Check your spam folder.',
  },
  forgot: {
    title: 'Forgot password',
    body: "Enter your account's email and we'll send you a code.",
    send: 'Send code',
    email: 'Enter a valid email.',
    codeBody: (email) => `We sent a code to ${email}. Enter it and your new password.`,
    newPassword: 'New password',
    submit: 'Change password',
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
};

const de: AuthMessages = {
  email: 'E-Mail',
  password: 'Passwort',
  confirmPassword: 'Passwort bestätigen',
  keepAccount: 'Konto sichern',
  keepWithEmail: 'Mit E-Mail sichern',
  linked: (provider) => `${provider} verknüpft`,
  join: {
    title: 'Anmelden',
    submit: 'Anmelden',
    missing: 'Gib deine E-Mail und dein Passwort ein.',
    forgot: 'Passwort vergessen?',
    noAccount: 'Noch kein Konto? Registrieren',
    or: 'oder',
    guest: 'Als Gast weiterspielen',
  },
  register: {
    title: 'Registrieren',
    submit: 'Registrieren',
    mismatch: 'Die Passwörter stimmen nicht überein.',
    exists: 'Mit dieser E-Mail hast du schon ein Konto.',
    toLogin: 'Anmelden',
    haveAccount: 'Schon ein Konto? Anmelden',
  },
  verify: {
    title: 'Bestätige deine E-Mail',
    body: (email) => `Wir haben einen 6-stelligen Code an ${email} geschickt.`,
    code: 'Code',
    submit: 'Bestätigen',
    short: 'Gib alle 6 Ziffern ein.',
    resend: 'Code erneut senden',
    resendIn: (time) => `Code erneut senden (${time})`,
    sent: 'Wir haben einen neuen Code geschickt.',
    spam: 'Nicht da? Schau in deinen Spam-Ordner.',
  },
  forgot: {
    title: 'Passwort vergessen',
    body: 'Gib die E-Mail deines Kontos ein, dann schicken wir dir einen Code.',
    send: 'Code senden',
    email: 'Gib eine gültige E-Mail ein.',
    codeBody: (email) => `Wir haben einen Code an ${email} geschickt. Gib ihn und dein neues Passwort ein.`,
    newPassword: 'Neues Passwort',
    submit: 'Passwort ändern',
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
};

const ar: AuthMessages = {
  email: 'البريد الإلكتروني',
  password: 'كلمة المرور',
  confirmPassword: 'تأكيد كلمة المرور',
  keepAccount: 'احمِ حسابك',
  keepWithEmail: 'الحماية بالبريد الإلكتروني',
  linked: (provider) => `تم ربط ‎${provider}‎`,
  join: {
    title: 'تسجيل الدخول',
    submit: 'تسجيل الدخول',
    missing: 'اكتب بريدك الإلكتروني وكلمة المرور.',
    forgot: 'نسيت كلمة المرور؟',
    noAccount: 'ليس لديك حساب؟ أنشئ حسابًا',
    or: 'أو',
    guest: 'المتابعة كضيف',
  },
  register: {
    title: 'إنشاء حساب',
    submit: 'إنشاء حساب',
    mismatch: 'كلمتا المرور غير متطابقتين.',
    exists: 'لديك حساب بهذا البريد الإلكتروني.',
    toLogin: 'تسجيل الدخول',
    haveAccount: 'لديك حساب؟ سجّل الدخول',
  },
  verify: {
    title: 'أكّد بريدك الإلكتروني',
    body: (email) => `أرسلنا رمزًا من 6 أرقام إلى ‎${email}‎.`,
    code: 'الرمز',
    submit: 'تأكيد',
    short: 'اكتب الأرقام الستة كلها.',
    resend: 'أعد إرسال الرمز',
    resendIn: (time) => `أعد إرسال الرمز (‎${time}‎)`,
    sent: 'أرسلنا رمزًا جديدًا.',
    spam: 'لم يصل؟ تحقّق من مجلد الرسائل غير المرغوب فيها.',
  },
  forgot: {
    title: 'نسيت كلمة المرور',
    body: 'اكتب البريد الإلكتروني لحسابك وسنرسل إليك رمزًا.',
    send: 'إرسال الرمز',
    email: 'اكتب بريدًا إلكترونيًا صالحًا.',
    codeBody: (email) => `أرسلنا رمزًا إلى ‎${email}‎. اكتبه مع كلمة المرور الجديدة.`,
    newPassword: 'كلمة المرور الجديدة',
    submit: 'تغيير كلمة المرور',
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
};

const fr: AuthMessages = {
  email: 'E-mail',
  password: 'Mot de passe',
  confirmPassword: 'Confirme le mot de passe',
  keepAccount: 'Protège ton compte',
  keepWithEmail: 'Protéger avec un e-mail',
  linked: (provider) => `${provider} lié`,
  join: {
    title: 'Connexion',
    submit: 'Se connecter',
    missing: 'Saisis ton e-mail et ton mot de passe.',
    forgot: 'Mot de passe oublié ?',
    noAccount: "Pas encore de compte ? S'inscrire",
    or: 'ou',
    guest: 'Continuer en invité',
  },
  register: {
    title: "S'inscrire",
    submit: "S'inscrire",
    mismatch: 'Les mots de passe ne correspondent pas.',
    exists: 'Tu as déjà un compte avec cet e-mail.',
    toLogin: 'Se connecter',
    haveAccount: 'Déjà un compte ? Se connecter',
  },
  verify: {
    title: 'Confirme ton e-mail',
    body: (email) => `On a envoyé un code à 6 chiffres à ${email}.`,
    code: 'Code',
    submit: 'Valider',
    short: 'Saisis les 6 chiffres.',
    resend: 'Renvoyer le code',
    resendIn: (time) => `Renvoyer le code (${time})`,
    sent: 'On a envoyé un nouveau code.',
    spam: 'Rien reçu ? Regarde dans tes spams.',
  },
  forgot: {
    title: 'Mot de passe oublié',
    body: "Saisis l'e-mail de ton compte, on t'envoie un code.",
    send: 'Envoyer le code',
    email: 'Saisis un e-mail valide.',
    codeBody: (email) => `On a envoyé un code à ${email}. Saisis-le avec ton nouveau mot de passe.`,
    newPassword: 'Nouveau mot de passe',
    submit: 'Changer le mot de passe',
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
};

const es: AuthMessages = {
  email: 'Correo',
  password: 'Contraseña',
  confirmPassword: 'Confirma la contraseña',
  keepAccount: 'Protege tu cuenta',
  keepWithEmail: 'Proteger con correo',
  linked: (provider) => `${provider} vinculado`,
  join: {
    title: 'Iniciar sesión',
    submit: 'Iniciar sesión',
    missing: 'Escribe tu correo y tu contraseña.',
    forgot: '¿Olvidaste tu contraseña?',
    noAccount: '¿No tienes cuenta? Regístrate',
    or: 'o',
    guest: 'Continuar como invitado',
  },
  register: {
    title: 'Registrarse',
    submit: 'Registrarse',
    mismatch: 'Las contraseñas no coinciden.',
    exists: 'Ya tienes una cuenta con este correo.',
    toLogin: 'Iniciar sesión',
    haveAccount: '¿Ya tienes cuenta? Inicia sesión',
  },
  verify: {
    title: 'Verifica tu correo',
    body: (email) => `Enviamos un código de 6 dígitos a ${email}.`,
    code: 'Código',
    submit: 'Verificar',
    short: 'Escribe los 6 dígitos.',
    resend: 'Reenviar el código',
    resendIn: (time) => `Reenviar el código (${time})`,
    sent: 'Te enviamos un código nuevo.',
    spam: '¿No llegó? Mira en la carpeta de spam.',
  },
  forgot: {
    title: 'Olvidé mi contraseña',
    body: 'Escribe el correo de tu cuenta y te enviaremos un código.',
    send: 'Enviar código',
    email: 'Escribe un correo válido.',
    codeBody: (email) => `Enviamos un código a ${email}. Escríbelo junto con tu nueva contraseña.`,
    newPassword: 'Nueva contraseña',
    submit: 'Cambiar contraseña',
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
};

export const auth: Record<Locale, AuthMessages> = { tr, en, de, ar, fr, es };
