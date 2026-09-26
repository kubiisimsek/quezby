<?php

/*
| Why a username cannot be had (`App\Support\UsernameProblem`), and `taken`
| — the same words as the app's catalogs (`usernameRules` in
| `apps/mobile/src/i18n/messages`). The rules themselves are
| `App\Support\Username` and `@quezby/config`.
*/

return [
    'required' => 'Bir kullanıcı adı yaz.',
    'too_short' => 'En az 3 karakter olmalı.',
    'too_long' => 'En fazla 20 karakter olabilir.',
    'turkish_char' => 'Türkçe karakter kullanılamaz — ş yerine s, ı yerine i gibi.',
    'invalid_char' => 'Sadece harf, rakam, nokta (.) ve yıldız (*) kullanılabilir.',
    'bad_start' => 'Harf ya da rakamla başlamalı.',
    'bad_end' => 'Harf ya da rakamla bitmeli.',
    'consecutive_symbols' => 'Nokta ve yıldız art arda gelemez.',
    'no_letter' => 'En az bir harf içermeli.',
    'reserved' => 'Bu kullanıcı adı ayrılmış, başka bir tane dene.',
    'blocked' => 'Bu kullanıcı adı kullanılamaz.',
    'taken' => 'Bu kullanıcı adı alınmış.',
];
