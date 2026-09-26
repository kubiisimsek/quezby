<?php

namespace App\Enums;

/** `AdminFunnelStep` in `packages/types`: a new player's first steps, in the order they usually come. */
enum FunnelStep: string
{
    case Joined = 'joined';
    case Tutorial = 'tutorial';
    case Named = 'named';
    case Protected = 'protected';
    case FirstRun = 'first_run';
    case League = 'league';
    case Returned = 'returned';
}
