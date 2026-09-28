<?php

/*
| What "مشاركة" sends — see `lang/tr/share.php`. Every line starts with a
| right-to-left mark (U+200F): a messaging app sets a paragraph's direction
| by its first strong letter, and "Quezby" would make it left to right.
| Latin digits, grouped with a comma. Counts take six forms — 0, 1, 2,
| 3–10, 11–99 and the rest — as a noun standing on its own (`نقطتان`, not
| `نقطتين`), which is how both lines use them.
*/

return [
    'free' => "\u{200F}نتيجتي في Quezby: :points! :posts. وأنت، كم ستحقق؟",
    'free_ranked' => "\u{200F}نتيجتي في Quezby: :points! :posts · هذا الأسبوع #:rank. وأنت، كم ستحقق؟",
    'daily' => "\u{200F}Quezby · خلاصة اليوم #:number\n\u{200F}:grid\n\u{200F}:points",
    'daily_ranked' => "\u{200F}Quezby · خلاصة اليوم #:number\n\u{200F}:grid\n\u{200F}:points · #:rank/:players",

    'points' => ':count نقطة|نقطة واحدة|نقطتان|:count نقاط|:count نقطة|:count نقطة',
    'posts' => ':count منشور|منشور واحد|منشوران|:count منشورات|:count منشورًا|:count منشور',
];
