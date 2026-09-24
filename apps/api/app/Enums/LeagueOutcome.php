<?php

namespace App\Enums;

enum LeagueOutcome: string
{
    case Promoted = 'promoted';
    case Stayed = 'stayed';
    case Demoted = 'demoted';
}
