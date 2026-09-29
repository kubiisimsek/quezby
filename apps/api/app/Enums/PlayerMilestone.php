<?php

namespace App\Enums;

/**
 * `AdminMilestone` in `packages/types`: a first in a player's life — from the
 * app, with consent (`AnalyticsEvent::isMilestone()`), or from what the API
 * already keeps (the account, a way in, a counted run, a league — placed
 * by Elo).
 */
enum PlayerMilestone: string
{
    case Joined = 'joined';
    case TutorialDone = 'tutorial_done';
    case NicknameSkip = 'nickname_skip';
    case ProtectSkip = 'protect_skip';
    case ProtectReminder = 'protect_reminder';
    case Protected = 'protected';
    case FirstRun = 'first_run';
    case League = 'league';
}
