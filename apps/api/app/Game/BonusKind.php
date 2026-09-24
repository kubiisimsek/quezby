<?php

namespace App\Game;

/** The named combos a hit can set off — the TypeScript `BonusKind`. */
enum BonusKind: string
{
    case Flawless = 'flawless';
    case Lightning = 'lightning';
    case CoolHead = 'coolHead';
    case Comeback = 'comeback';
}
