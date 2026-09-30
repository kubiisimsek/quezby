import type { Locale } from '@quezby/types';

import { handle } from '@/i18n/format';

/**
 * Picking the name: the name screen ("Sana ne diyelim?" right after the
 * practice run) and the field it shares with the profile (`field`). A picked
 * name never changes, and every screen that asks for one says so before it is
 * saved. Why a name is refused, and the checklist under the field, are
 * `usernameRules`.
 */
const tr = {
  onboardingTitle: 'Sana ne diyelim?',
  /** An account from before automatic names: the one question before the game. */
  title: 'Sıralamada adın ne olsun?',
  /** While the account still plays under the name the API gave it. */
  autoName: (name: string) =>
    `Zirvede ve ligde bu adla görünürsün; seçtiğin ad bir daha değişmez. Şimdilik adın ${handle(name)}, istersen sonra Profil’den seçersin.`,
  rules: 'Benzersiz olmalı ve bir daha değişmez. Harf, rakam, nokta ve yıldız kullanabilirsin.',
  pickFirst: 'Önce bir kullanıcı adı seç.',
  save: 'Kaydet',
  skip: 'Şimdilik geç',
  continue: 'Devam',
  field: {
    label: 'Kullanıcı adı',
    /** A name the rules accept, in the language's words. */
    placeholder: 'ornek.kullanici',
    available: (name: string) => `${handle(name)} senin olabilir.`,
    current: 'Şu anki adın.',
    unknown: 'Uygunluk şu an kontrol edilemedi; kaydederken yeniden denenecek.',
    idle: 'Sıralamada herkes seni bu adla görecek.',
  },
};

export type UsernameMessages = typeof tr;

const en: UsernameMessages = {
  onboardingTitle: 'What should we call you?',
  title: "What's your name on the leaderboard?",
  autoName: (name) =>
    `This is the name you'll go by on the Summit and in your league; the name you pick never changes. For now you're ${handle(name)} — you can pick one later from Profile.`,
  rules: 'Your name must be unique and never changes. You can use letters, digits, dots and stars.',
  pickFirst: 'Pick a username first.',
  save: 'Save',
  skip: 'Skip for now',
  continue: 'Continue',
  field: {
    label: 'Username',
    placeholder: 'example.user',
    available: (name) => `${handle(name)} can be yours.`,
    current: 'Your current name.',
    unknown: "Couldn't check availability right now; we'll try again when you save.",
    idle: 'Everyone on the leaderboard will see you by this name.',
  },
};

const de: UsernameMessages = {
  onboardingTitle: 'Wie sollen wir dich nennen?',
  title: 'Wie heißt du in der Rangliste?',
  autoName: (name) =>
    `Unter diesem Namen erscheinst du auf dem Gipfel und in der Liga; dein gewählter Name bleibt für immer. Bis dahin bist du ${handle(name)} – wählen kannst du auch später im Profil.`,
  rules: 'Dein Name muss einzigartig sein und bleibt für immer. Du kannst Buchstaben, Ziffern, Punkte und Sterne verwenden.',
  pickFirst: 'Wähl zuerst einen Namen.',
  save: 'Speichern',
  skip: 'Erst mal überspringen',
  continue: 'Weiter',
  field: {
    label: 'Nutzername',
    placeholder: 'beispiel.name',
    available: (name) => `${handle(name)} kann deiner sein.`,
    current: 'Dein aktueller Name.',
    unknown: 'Verfügbarkeit gerade nicht prüfbar – beim Speichern versuchen wir es noch mal.',
    idle: 'In der Rangliste sehen dich alle unter diesem Namen.',
  },
};

const ar: UsernameMessages = {
  onboardingTitle: 'بماذا نناديك؟',
  title: 'بأي اسم تظهر في الترتيب؟',
  autoName: (name) =>
    `بهذا الاسم تظهر في القمة وفي الدوري؛ الاسم الذي تختاره لن يتغيّر أبدًا. اسمك الآن ‎${handle(name)}‎، ويمكنك أن تختار اسمك لاحقًا من ملفك الشخصي.`,
  rules: 'يجب أن يكون اسمك فريدًا، ولن يتغيّر أبدًا. يمكنك استخدام الأحرف اللاتينية والأرقام والنقطة والنجمة.',
  pickFirst: 'اختر اسم مستخدم أولًا.',
  save: 'حفظ',
  skip: 'تخطَّ الآن',
  continue: 'متابعة',
  field: {
    label: 'اسم المستخدم',
    // Names are Latin letters only, in every language.
    placeholder: 'example.user',
    available: (name) => `يمكن أن يكون ‎${handle(name)}‎ لك.`,
    current: 'اسمك الحالي.',
    unknown: 'تعذّر التحقق من توفّر الاسم الآن؛ سنحاول مجددًا عند الحفظ.',
    idle: 'سيراك الجميع في الترتيب بهذا الاسم.',
  },
};

const fr: UsernameMessages = {
  onboardingTitle: "On t'appelle comment ?",
  title: 'Quel sera ton nom au classement ?',
  autoName: (name) =>
    `C'est sous ce nom que tu apparais au Sommet et dans la ligue ; le nom choisi ne change plus jamais. Pour l'instant, tu es ${handle(name)} : tu pourras en choisir un plus tard depuis ton profil.`,
  rules: 'Ton nom doit être unique et ne change plus jamais. Tu peux utiliser des lettres, des chiffres, des points et des étoiles.',
  pickFirst: "Choisis d'abord un pseudo.",
  save: 'Enregistrer',
  skip: "Passer pour l'instant",
  continue: 'Continuer',
  field: {
    label: 'Pseudo',
    placeholder: 'exemple.pseudo',
    available: (name) => `${handle(name)} peut être à toi.`,
    current: 'Ton pseudo actuel.',
    unknown: "Impossible de vérifier la disponibilité pour l'instant ; on réessaiera à l'enregistrement.",
    idle: 'Au classement, tout le monde te verra sous ce nom.',
  },
};

const es: UsernameMessages = {
  onboardingTitle: '¿Cómo te llamamos?',
  title: '¿Qué nombre quieres en la clasificación?',
  autoName: (name) =>
    `Con este nombre apareces en la Cumbre y en la liga; el nombre que elijas no cambia nunca. Por ahora eres ${handle(name)}; si quieres, elige tu nombre más tarde desde tu perfil.`,
  rules: 'Tu nombre debe ser único y no cambia nunca. Puedes usar letras, números, puntos y asteriscos.',
  pickFirst: 'Primero elige un nombre de usuario.',
  save: 'Guardar',
  skip: 'Saltar por ahora',
  continue: 'Continuar',
  field: {
    label: 'Nombre de usuario',
    placeholder: 'ejemplo.usuario',
    available: (name) => `${handle(name)} puede ser tuyo.`,
    current: 'Tu nombre actual.',
    unknown: 'No se pudo comprobar la disponibilidad ahora; lo intentaremos de nuevo al guardar.',
    idle: 'En la clasificación, todos te verán con este nombre.',
  },
};

const ja: UsernameMessages = {
  onboardingTitle: 'なんて呼べばいい？',
  title: 'ランキングでの名前は？',
  autoName: (name) =>
    `トップとリーグではこの名前で表示されます。選んだ名前はあとから変更できません。今は${handle(name)}です。あとでプロフィールから選べます。`,
  rules: 'ほかの人と同じ名前は使えず、あとから変更もできません。英字、数字、ドット、アスタリスクが使えます。',
  pickFirst: '先にユーザー名を選んでください。',
  save: '保存',
  skip: 'あとで',
  continue: '続ける',
  field: {
    label: 'ユーザー名',
    placeholder: 'yamada.taro',
    available: (name) => `${handle(name)}は使えます。`,
    current: '今の名前です。',
    unknown: '今は使えるか確認できませんでした。保存するときにもう一度確認します。',
    idle: 'ランキングでは、みんなにこの名前で表示されます。',
  },
};

const ko: UsernameMessages = {
  onboardingTitle: '뭐라고 부를까요?',
  title: '랭킹에서 어떤 이름을 쓸까요?',
  autoName: (name) =>
    `정상과 리그에서 보일 이름이에요. 고른 이름은 다시 바꿀 수 없어요. 지금은 ${handle(name)} 이름으로 표시되고, 나중에 프로필에서 고를 수 있어요.`,
  rules: '다른 사람과 겹치지 않아야 하고, 한 번 정하면 바꿀 수 없어요. 영문자, 숫자, 점, 별표를 쓸 수 있어요.',
  pickFirst: '먼저 사용자 이름을 고르세요.',
  save: '저장',
  skip: '나중에 하기',
  continue: '계속',
  field: {
    label: '사용자 이름',
    placeholder: 'hong.gildong',
    available: (name) => `${handle(name)}, 사용할 수 있어요.`,
    current: '지금 쓰는 이름이에요.',
    unknown: '지금은 사용 가능 여부를 확인할 수 없어요. 저장할 때 다시 확인할게요.',
    idle: '랭킹에서 모두가 이 이름으로 보게 돼요.',
  },
};

export const username: Record<Locale, UsernameMessages> = { tr, en, de, ar, fr, es, ja, ko };
