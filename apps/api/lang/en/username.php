<?php

/*
| Why a username cannot be had — see `lang/tr/username.php`.
*/

return [
    'required' => 'Type a username.',
    'too_short' => 'At least 3 characters.',
    'too_long' => 'At most 20 characters.',
    'turkish_char' => "Letters like ş, ı, ü or ç aren't allowed — write s, i, u, c.",
    'invalid_char' => 'Only letters a–z, digits, dots (.) and stars (*).',
    'bad_start' => 'Must start with a letter or a digit.',
    'bad_end' => 'Must end with a letter or a digit.',
    'consecutive_symbols' => "Dots and stars can't be next to each other.",
    'no_letter' => 'Must contain at least one letter.',
    'reserved' => 'This username is reserved. Try another one.',
    'blocked' => "This username can't be used.",
    'taken' => 'This username is taken.',
];
