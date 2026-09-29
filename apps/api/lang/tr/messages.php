<?php

/*
| The player's lines that are neither an error code nor a validation rule.
*/

return [
    // `GET /users?search=` — whatever is wrong with the search.
    'search' => 'Aramak için 2 ile 20 arası harf, rakam, nokta ya da yıldız yaz.',

    // `GET /me/friends?cursor=`, `GET /me/runs?cursor=`, `GET /users/{username}/friends?cursor=` — a cursor the API cannot read.
    'cursor' => 'Listenin devamı yüklenemedi, listeyi baştan yükle.',

    // An account from before automatic names, with no name yet.
    'username_to_play' => 'Sıralı bir oyun için önce bir kullanıcı adı seç.',
    'username_to_befriend' => 'Arkadaş eklemek için önce bir kullanıcı adı seç.',
];
