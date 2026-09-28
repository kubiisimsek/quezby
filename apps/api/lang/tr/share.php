<?php

/*
| What "Paylaş" sends, built by the API from its own numbers: after a free
| run (`RunController`) and after the day's run (`DailyService`). Every
| number is grouped the language's way (`Locale::group`); `points` and
| `posts` are counted (`trans_choice`) — Turkish says "1 puan" as it says
| "3 puan", so one form. Every Arabic line starts with a right-to-left mark
| (U+200F), so a messaging app lays it out right to left.
*/

return [
    'free' => "Quezby'de :points yaptım! :posts. Sen kaç yaparsın?",
    'free_ranked' => "Quezby'de :points yaptım! :posts · bu hafta #:rank. Sen kaç yaparsın?",
    'daily' => "Quezby · Günün akışı #:number\n:grid\n:points",
    'daily_ranked' => "Quezby · Günün akışı #:number\n:grid\n:points · #:rank/:players",

    // The counted words the lines above take.
    'points' => ':count puan',
    'posts' => ':count post',
];
