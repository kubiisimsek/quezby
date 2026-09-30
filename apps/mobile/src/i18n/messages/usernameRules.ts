import type { UsernameProblem, UsernameRule } from '@quezby/config';
import type { Locale } from '@quezby/types';

/**
 * The name rules in words: why a name is refused (`problems`, one sentence,
 * no blame) and the checklist under the field (`rules`). The rules themselves
 * are `@quezby/config`'s; the API says the same in `lang/{locale}/username.php`.
 */
const tr = {
  taken: 'Bu kullanıcı adı alınmış.',
  problems: {
    required: 'Bir kullanıcı adı yaz.',
    too_short: 'En az 3 karakter olmalı.',
    too_long: 'En fazla 20 karakter olabilir.',
    turkish_char: 'Türkçe karakter kullanılamaz — ş yerine s, ı yerine i gibi.',
    invalid_char: 'Sadece harf, rakam, nokta (.) ve yıldız (*) kullanılabilir.',
    bad_start: 'Harf ya da rakamla başlamalı.',
    bad_end: 'Harf ya da rakamla bitmeli.',
    consecutive_symbols: 'Nokta ve yıldız art arda gelemez.',
    no_letter: 'En az bir harf içermeli.',
    reserved: 'Bu kullanıcı adı ayrılmış, başka bir tane dene.',
    blocked: 'Bu kullanıcı adı kullanılamaz.',
  } satisfies Record<UsernameProblem, string>,
  rules: {
    length: (min: number, max: number) => `${min}–${max} karakter`,
    charset: 'Sadece harf, rakam, nokta (.) ve yıldız (*)',
    letter: 'En az bir harf',
  } satisfies Record<UsernameRule, unknown>,
};

export type UsernameRuleMessages = typeof tr;

const en: UsernameRuleMessages = {
  taken: 'This username is taken.',
  problems: {
    required: 'Type a username.',
    too_short: 'At least 3 characters.',
    too_long: 'At most 20 characters.',
    turkish_char: "Letters like ş, ı, ü or ç aren't allowed — write s, i, u, c.",
    invalid_char: 'Only letters a–z, digits, dots (.) and stars (*).',
    bad_start: 'Must start with a letter or a digit.',
    bad_end: 'Must end with a letter or a digit.',
    consecutive_symbols: "Dots and stars can't be next to each other.",
    no_letter: 'Must contain at least one letter.',
    reserved: 'This username is reserved. Try another one.',
    blocked: "This username can't be used.",
  },
  rules: {
    length: (min, max) => `${min}–${max} characters`,
    charset: 'Only letters a–z, digits, dots (.) and stars (*)',
    letter: 'At least one letter',
  },
};

const de: UsernameRuleMessages = {
  taken: 'Dieser Name ist schon vergeben.',
  problems: {
    required: 'Gib einen Namen ein.',
    too_short: 'Mindestens 3 Zeichen.',
    too_long: 'Höchstens 20 Zeichen.',
    turkish_char: 'Buchstaben wie ş, ı, ü oder ç gehen nicht – schreib s, i, u, c.',
    invalid_char: 'Nur Buchstaben a–z, Ziffern, Punkte (.) und Sterne (*).',
    bad_start: 'Muss mit einem Buchstaben oder einer Ziffer beginnen.',
    bad_end: 'Muss mit einem Buchstaben oder einer Ziffer enden.',
    consecutive_symbols: 'Punkt und Stern dürfen nicht direkt aufeinander folgen.',
    no_letter: 'Muss mindestens einen Buchstaben enthalten.',
    reserved: 'Dieser Name ist reserviert. Versuch einen anderen.',
    blocked: 'Dieser Name kann nicht verwendet werden.',
  },
  rules: {
    length: (min, max) => `${min}–${max} Zeichen`,
    charset: 'Nur Buchstaben a–z, Ziffern, Punkte (.) und Sterne (*)',
    letter: 'Mindestens ein Buchstabe',
  },
};

const ar: UsernameRuleMessages = {
  taken: 'اسم المستخدم هذا مأخوذ.',
  problems: {
    required: 'اكتب اسم مستخدم.',
    too_short: 'يجب ألا يقل عن 3 أحرف.',
    too_long: 'يجب ألا يزيد عن 20 حرفًا.',
    turkish_char: 'لا يُسمح بأحرف مثل ş وı وü وç — اكتب s وi وu وc.',
    invalid_char: 'يُسمح فقط بالأحرف اللاتينية والأرقام والنقطة (.) والنجمة (*).',
    bad_start: 'يجب أن يبدأ بحرف أو رقم.',
    bad_end: 'يجب أن ينتهي بحرف أو رقم.',
    consecutive_symbols: 'لا يمكن أن تتتالى النقطة والنجمة.',
    no_letter: 'يجب أن يحتوي على حرف واحد على الأقل.',
    reserved: 'اسم المستخدم هذا محجوز. جرّب اسمًا آخر.',
    blocked: 'لا يمكن استخدام اسم المستخدم هذا.',
  },
  rules: {
    length: (min, max) => `من ${min} إلى ${max} حرفًا`,
    charset: 'أحرف لاتينية وأرقام ونقطة (.) ونجمة (*) فقط',
    letter: 'حرف واحد على الأقل',
  },
};

const fr: UsernameRuleMessages = {
  taken: 'Ce pseudo est déjà pris.',
  problems: {
    required: 'Écris un pseudo.',
    too_short: 'Au moins 3 caractères.',
    too_long: '20 caractères maximum.',
    turkish_char: 'Les lettres comme ş, ı, ü ou ç ne sont pas acceptées — écris s, i, u, c.',
    invalid_char: 'Uniquement des lettres a–z, des chiffres, des points (.) et des étoiles (*).',
    bad_start: 'Doit commencer par une lettre ou un chiffre.',
    bad_end: 'Doit finir par une lettre ou un chiffre.',
    consecutive_symbols: 'Les points et les étoiles ne peuvent pas se suivre.',
    no_letter: 'Doit contenir au moins une lettre.',
    reserved: 'Ce pseudo est réservé. Essaie-en un autre.',
    blocked: 'Ce pseudo ne peut pas être utilisé.',
  },
  rules: {
    length: (min, max) => `${min} à ${max} caractères`,
    charset: 'Uniquement lettres a–z, chiffres, points (.) et étoiles (*)',
    letter: 'Au moins une lettre',
  },
};

const es: UsernameRuleMessages = {
  taken: 'Este nombre de usuario ya está en uso.',
  problems: {
    required: 'Escribe un nombre de usuario.',
    too_short: 'Al menos 3 caracteres.',
    too_long: 'Como máximo 20 caracteres.',
    turkish_char: 'No se permiten letras como ş, ı, ü o ç: escribe s, i, u, c.',
    invalid_char: 'Solo letras a–z, números, puntos (.) y asteriscos (*).',
    bad_start: 'Debe empezar con una letra o un número.',
    bad_end: 'Debe terminar con una letra o un número.',
    consecutive_symbols: 'Los puntos y asteriscos no pueden ir seguidos.',
    no_letter: 'Debe tener al menos una letra.',
    reserved: 'Este nombre de usuario está reservado. Prueba otro.',
    blocked: 'Este nombre de usuario no se puede usar.',
  },
  rules: {
    length: (min, max) => `De ${min} a ${max} caracteres`,
    charset: 'Solo letras a–z, números, puntos (.) y asteriscos (*)',
    letter: 'Al menos una letra',
  },
};

const ja: UsernameRuleMessages = {
  taken: 'このユーザー名はすでに使われています。',
  problems: {
    required: 'ユーザー名を入力してください。',
    too_short: '3文字以上にしてください。',
    too_long: '20文字以内にしてください。',
    turkish_char: 'ş、ı、ü、ç などの文字は使えません。s、i、u、c を使ってください。',
    invalid_char: '使えるのは英字（a〜z）、数字、ドット（.）、アスタリスク（*）だけです。',
    bad_start: '最初の文字は英字か数字にしてください。',
    bad_end: '最後の文字は英字か数字にしてください。',
    consecutive_symbols: 'ドットとアスタリスクは続けて使えません。',
    no_letter: '英字を1文字以上入れてください。',
    reserved: 'このユーザー名は予約されています。別の名前を試してください。',
    blocked: 'このユーザー名は使えません。',
  },
  rules: {
    length: (min, max) => `${min}〜${max}文字`,
    charset: '英字（a〜z）、数字、ドット（.）、アスタリスク（*）のみ',
    letter: '英字を1文字以上',
  },
};

const ko: UsernameRuleMessages = {
  taken: '이미 사용 중인 사용자 이름이에요.',
  problems: {
    required: '사용자 이름을 입력하세요.',
    too_short: '3자 이상이어야 해요.',
    too_long: '20자 이하여야 해요.',
    turkish_char: 'ş, ı, ü, ç 같은 문자는 쓸 수 없어요. s, i, u, c로 써 주세요.',
    invalid_char: '영문자(a–z), 숫자, 점(.), 별표(*)만 쓸 수 있어요.',
    bad_start: '영문자나 숫자로 시작해야 해요.',
    bad_end: '영문자나 숫자로 끝나야 해요.',
    consecutive_symbols: '점과 별표는 연달아 쓸 수 없어요.',
    no_letter: '영문자가 하나 이상 있어야 해요.',
    reserved: '예약된 사용자 이름이에요. 다른 이름을 써 보세요.',
    blocked: '사용할 수 없는 사용자 이름이에요.',
  },
  rules: {
    length: (min, max) => `${min}–${max}자`,
    charset: '영문자(a–z), 숫자, 점(.), 별표(*)만',
    letter: '영문자 하나 이상',
  },
};

export const usernameRules: Record<Locale, UsernameRuleMessages> = { tr, en, de, ar, fr, es, ja, ko };
