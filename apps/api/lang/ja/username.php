<?php

/*
| Why a username cannot be had — see `lang/tr/username.php`.
*/

return [
    'required' => 'ユーザー名を入力してください。',
    'too_short' => '3文字以上にしてください。',
    'too_long' => '20文字以内にしてください。',
    'turkish_char' => 'ş、ı、ü、ç などの文字は使えません。s、i、u、c を使ってください。',
    'invalid_char' => '使えるのは英字（a〜z）、数字、ドット（.）、アスタリスク（*）だけです。',
    'bad_start' => '最初の文字は英字か数字にしてください。',
    'bad_end' => '最後の文字は英字か数字にしてください。',
    'consecutive_symbols' => 'ドットとアスタリスクは続けて使えません。',
    'no_letter' => '英字を1文字以上入れてください。',
    'reserved' => 'このユーザー名は予約されています。別の名前を試してください。',
    'blocked' => 'このユーザー名は使えません。',
    'taken' => 'このユーザー名はすでに使われています。',
];
