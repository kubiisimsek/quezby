<?php

namespace App\Game;

enum ReelKind: string
{
    case Skip = 'skip';
    case Like = 'like';
    case Hold = 'hold';
    case Freeze = 'freeze';
}
