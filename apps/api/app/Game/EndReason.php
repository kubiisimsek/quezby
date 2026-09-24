<?php

namespace App\Game;

enum EndReason: string
{
    case Drained = 'drained';
    case Penalty = 'penalty';
    case Quit = 'quit';
}
