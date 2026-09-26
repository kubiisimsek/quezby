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
    edges: 'Harf ya da rakamla başlar ve biter',
    symbols: 'Nokta ve yıldız art arda gelmez',
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
    edges: 'Starts and ends with a letter or a digit',
    symbols: 'No dot or star right after another',
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
    edges: 'Beginnt und endet mit Buchstabe oder Ziffer',
    symbols: 'Punkt und Stern nie direkt nacheinander',
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
    edges: 'يبدأ وينتهي بحرف أو رقم',
    symbols: 'لا تتتالى النقطة والنجمة',
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
    edges: 'Commence et finit par une lettre ou un chiffre',
    symbols: "Pas de point ni d'étoile qui se suivent",
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
    edges: 'Empieza y termina con una letra o un número',
    symbols: 'Sin puntos ni asteriscos seguidos',
    letter: 'Al menos una letra',
  },
};

export const usernameRules: Record<Locale, UsernameRuleMessages> = { tr, en, de, ar, fr, es };
