<?php

/*
| What "Partager" sends — see `lang/tr/share.php`. Counts take two forms,
| and French counts 0 with 1: `0 point`, `1 point`, `2 points`.
*/

return [
    'free' => "J'ai fait :points sur Quezby\u{00A0}! :posts. Et toi, tu en fais combien\u{00A0}?",
    'free_ranked' => "J'ai fait :points sur Quezby\u{00A0}! :posts · aujourd'hui #:rank. Et toi, tu en fais combien\u{00A0}?",
    'daily' => "Quezby · Fil du jour #:number\n:grid\n:points",
    'daily_ranked' => "Quezby · Fil du jour #:number\n:grid\n:points · #:rank/:players",

    'points' => ':count point|:count points',
    'posts' => ':count post|:count posts',
];
