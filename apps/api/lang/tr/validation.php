<?php

/*
| Messages for the rules the API uses. They reach the player through
| `error.fields`, so they are Turkish like every other message.
*/

return [
    'array' => ':Attribute bir liste olmalı.',
    'boolean' => ':Attribute true ya da false olmalı.',
    'email' => ':Attribute geçerli bir e-posta adresi olmalı.',
    'enum' => 'Seçilen :attribute geçersiz.',
    'in' => 'Seçilen :attribute geçersiz.',
    'integer' => ':Attribute bir tam sayı olmalı.',
    'list' => ':Attribute bir liste olmalı.',
    'max' => [
        'array' => ':Attribute en fazla :max öge içerebilir.',
        'numeric' => ':Attribute en fazla :max olabilir.',
        'string' => ':Attribute en fazla :max karakter olabilir.',
    ],
    'min' => [
        'array' => ':Attribute en az :min öge içermeli.',
        'numeric' => ':Attribute en az :min olmalı.',
        'string' => ':Attribute en az :min karakter olmalı.',
    ],
    'present' => ':Attribute gönderilmeli.',
    'regex' => ':Attribute geçersiz.',
    'required' => ':Attribute gerekli.',
    'string' => ':Attribute bir metin olmalı.',

    'attributes' => [
        'actions' => 'hamle kaydı',
        'clientReels' => 'reel sayısı',
        'clientScore' => 'skor',
        'email' => 'e-posta',
        'haptics' => 'titreşim ayarı',
        'installId' => 'kurulum kimliği',
        'limit' => 'limit',
        'password' => 'şifre',
        'platform' => 'platform',
        'username' => 'kullanıcı adı',
        'version' => 'sürüm',
    ],
];
