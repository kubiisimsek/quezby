<?php

namespace App\Enums;

/**
 * `AnalyticsEvent` in `packages/types`: the moments a visit may count —
 * `@quezby/config`'s ANALYTICS_EVENTS, held to
 * `packages/config/fixtures/analytics.json`. Only ever added to.
 */
enum AnalyticsEvent: string
{
    case ShareResult = 'share_result';
    case ShareDaily = 'share_daily';
    case Rival = 'rival';
    case PlayerCard = 'player_card';
    case OfflineRun = 'offline_run';
    case OutdatedRun = 'outdated_run';
    case UnsentRun = 'unsent_run';
    case OfflineGate = 'offline_gate';
    case UpdateGate = 'update_gate';
    case TutorialDone = 'tutorial_done';
    case NicknameSkip = 'nickname_skip';
    case ProtectSkip = 'protect_skip';
    case ProtectReminder = 'protect_reminder';

    /** Once in a player's life: the API keeps when they first did it (`analytics_milestones`). */
    public function isMilestone(): bool
    {
        return match ($this) {
            self::TutorialDone, self::NicknameSkip, self::ProtectSkip, self::ProtectReminder => true,
            default => false,
        };
    }

    /** The total the moment adds to: `event:rival`. */
    public function bucket(): string
    {
        return 'event:'.$this->value;
    }
}
