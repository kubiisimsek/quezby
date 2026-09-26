<?php

namespace App\Enums;

/**
 * `AnalyticsScreen` in `packages/types`: the screens a visit's journey may
 * name — `@quezby/config`'s ANALYTICS_SCREENS, held to
 * `packages/config/fixtures/analytics.json`. Only ever added to.
 */
enum AnalyticsScreen: string
{
    case Welcome = 'welcome';
    case Login = 'login';
    case Tutorial = 'tutorial';
    case Username = 'username';
    case Protect = 'protect';
    case Home = 'home';
    case Leaderboard = 'leaderboard';
    case League = 'league';
    case Search = 'search';
    case Profile = 'profile';
    case Game = 'game';
    case Help = 'help';
    case Daily = 'daily';

    /** The total a screen's views add to: `screen:home`. */
    public function bucket(): string
    {
        return 'screen:'.$this->value;
    }
}
