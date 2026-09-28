<?php

/*
| What "Compartir" sends — see `lang/tr/share.php`. Counts take two forms:
| `1 punto`, `2 puntos`; four digits stay whole (`1234`), five are grouped
| (`12.345`).
*/

return [
    'free' => '¡Hice :points en Quezby! :posts. ¿Cuántos puedes hacer tú?',
    'free_ranked' => '¡Hice :points en Quezby! :posts · esta semana #:rank. ¿Cuántos puedes hacer tú?',
    'daily' => "Quezby · Feed del día #:number\n:grid\n:points",
    'daily_ranked' => "Quezby · Feed del día #:number\n:grid\n:points · #:rank/:players",

    'points' => ':count punto|:count puntos',
    'posts' => ':count post|:count posts',
];
