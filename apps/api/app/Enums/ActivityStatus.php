<?php

namespace App\Enums;

/**
 * `AdminActivityStatus` in `packages/types`: whether a player's activity is
 * kept — yes; they have not said yes; they are outside the share of players
 * kept; analytics is switched off.
 */
enum ActivityStatus: string
{
    case Tracked = 'tracked';
    case NoConsent = 'no_consent';
    case NotSampled = 'not_sampled';
    case Disabled = 'disabled';
}
