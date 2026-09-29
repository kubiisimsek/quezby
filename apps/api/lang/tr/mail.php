<?php

/*
| The email that carries a code (`App\Mail\EmailCodeMail`), in the language
| the player signed up in. The subject shows the code, so a lock screen does.
*/

return [
    'subject' => 'Quezby kodun: :code',
    'title' => [
        'signup' => 'E-postanı doğrula',
        'link' => 'E-postanı doğrula',
        'reset' => 'Şifreni yenile',
    ],
    'line' => [
        'signup' => 'Quezby hesabını açmak için bu kodu uygulamaya yaz.',
        'link' => 'Bu e-postayı Quezby hesabına bağlamak için bu kodu uygulamaya yaz.',
        'reset' => 'Quezby şifreni yenilemek için bu kodu uygulamaya yaz.',
    ],
    'expires' => 'Kod :minutes dakika geçerli.',
    'ignore' => 'Bunu sen istemediysen bu e-postayı yok say.',
];
